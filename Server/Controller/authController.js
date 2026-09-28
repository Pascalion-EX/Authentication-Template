import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import userModel from "../Model/userModel.js";
import { sendEmail } from "../Config/nodemailer.js";

// ==========================================
// JWT HELPERS
// ==========================================

const createToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );
};

const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === "production",

    sameSite:
      process.env.NODE_ENV === "production"
        ? "none"
        : "lax",

    maxAge: 3 * 24 * 60 * 60 * 1000,
  });
};

// ==========================================
// REGISTER
// ==========================================
export const register = async (req, res) => {
  try {
    const {
      userName,
      displayName,
      email,
      password,
      age,
    } = req.body;

    // ==========================
    // VALIDATION
    // ==========================

    if (
      !userName ||
      !displayName ||
      !email ||
      !password ||
      !age
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (
      typeof userName !== "string" ||
      typeof displayName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Your password must be at least 8 characters!",
      });
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address",
      });
    }

    // ==========================
    // NORMALIZE DATA
    // ==========================

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const normalizedUserName = userName
      .trim()
      .toLowerCase();

    // ==========================
    // CHECK EXISTING USER
    // ==========================

    const existingEmail =
      await userModel.findOne({
        email: normalizedEmail,
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered!",
      });
    }

    const existingUserName =
      await userModel.findOne({
        userName: normalizedUserName,
      });

    if (existingUserName) {
      return res.status(409).json({
        success: false,
        message:
          "There is already an account with this username",
      });
    }

    // ==========================
    // HASH PASSWORD
    // ==========================

    const salt =
      await bcrypt.genSalt(12);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    // ==========================
    // CREATE VERIFY TOKEN
    // ==========================

    const verifyToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Store only the hash in MongoDB
    const hashedVerifyToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    // ==========================
    // CREATE USER
    // ==========================

    const user =
      await userModel.create({
        userName:
          normalizedUserName,

        email:
          normalizedEmail,

        displayName:
          displayName.trim(),

        password:
          hashedPassword,

        age,

        isVerified: false,

        verifyEmailToken:
          hashedVerifyToken,

        // verification link valid for 24 hours
        verifyEmailExpires:
          Date.now() +
          24 * 60 * 60 * 1000,
      });

    // ==========================
    // CREATE VERIFY URL
    // ==========================

    const verifyURL =
      `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

    // ==========================
    // SEND WELCOME EMAIL
    // ==========================

    await sendEmail({
      to: user.email,

      subject:
        "Welcome to Hunter Association - Verify your email",

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
          "
        >

          <h1>
            Welcome to Hunter Association
          </h1>

          <p>
            Hello ${user.displayName},
          </p>

          <p>
            Your account has been created successfully.
          </p>

          <p>
            Before you can use your account,
            please verify your email address.
          </p>

          <a
            href="${verifyURL}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #4f46e5;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
            "
          >
            Verify Email
          </a>

          <p>
            This verification link will expire
            in 24 hours.
          </p>

          <p>
            If you did not create this account,
            you can safely ignore this email.
          </p>

        </div>
      `,
    });

    // ==========================
    // RESPONSE
    // ==========================

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error(
      "Registration failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

export const login = async (req, res) => {
  try {
    const {
      identifier,
      password,
    } = req.body;

    if (
      typeof identifier !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username/email and password are required",
      });
    }

    const normalizedIdentifier =
      identifier.trim().toLowerCase();

    if (
      !normalizedIdentifier ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username/email and password are required",
      });
    }

    const user = await userModel.findOne({
      $or: [
        {
          email:
            normalizedIdentifier,
        },
        {
          userName:
            normalizedIdentifier,
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username/email or password",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid username/email or password",
      });
    }

    const token = createToken(user._id);

    setTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message:
        "Logged in successfully",
    });
  } catch (error) {
    console.error(
      "Login failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

export const forgotPassword = async (
  req,
  res
) => {
  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid email is required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user =
      await userModel.findOne({
        email: normalizedEmail,
      });

    /*
      Don't reveal whether this email
      exists in the database.
    */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a reset link has been sent.",
      });
    }

    // Generate random token
    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken =
      hashedToken;

    // 15 minutes
    user.resetPasswordExpires =
      Date.now() +
      15 * 60 * 1000;

    await user.save();

    const resetURL =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,

      subject:
        "Reset your password",

      html: `
        <h2>Reset Password</h2>

        <p>
          Hello ${user.displayName},
        </p>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          <a href="${resetURL}">
            Reset Password
          </a>
        </p>

        <p>
          This link expires in 15 minutes.
        </p>

        <p>
          If you did not request this,
          you can ignore this email.
        </p>
      `,
    });

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a reset link has been sent.",
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};

// ==========================================
// RESET PASSWORD
// ==========================================

export const resetPassword = async (
  req,
  res
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (
      typeof token !== "string" ||
      !token
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token is required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user =
      await userModel.findOne({
        resetPasswordToken:
          hashedToken,

        resetPasswordExpires: {
          $gt: new Date(),
        },
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token is invalid or has expired",
      });
    }

    const salt =
      await bcrypt.genSalt(12);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    user.password =
      hashedPassword;

    // Make token single-use
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};

export const verifyEmail = async (
  req,
  res
) => {
  try {
    const { token } = req.params;

    if (
      typeof token !== "string" ||
      !token
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Verification token is required",
      });
    }

    // Hash token from URL
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with matching,
    // non-expired token
    const user =
      await userModel.findOne({
        verifyEmailToken:
          hashedToken,

        verifyEmailExpires: {
          $gt: new Date(),
        },
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Verification token is invalid or has expired",
      });
    }

    // Verify user
    user.isVerified = true;

    // Remove verification token
    user.verifyEmailToken = null;
    user.verifyEmailExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error(
      "Email verification failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const user = await userModel.findOne({
      email: normalizedEmail,
    });

    // Don't reveal whether the account exists
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an unverified account exists with this email, a verification email has been sent.",
      });
    }

    // Already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified.",
      });
    }

    // Generate new verification token
    const verifyToken = crypto
      .randomBytes(32)
      .toString("hex");

    // Hash token before storing
    const hashedVerifyToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    user.verifyEmailToken = hashedVerifyToken;

    // New 24-hour expiration
    user.verifyEmailExpires =
      Date.now() + 24 * 60 * 60 * 1000;

    await user.save();

    const verifyURL =
      `${process.env.FRONTEND_URL}/verify-email/${verifyToken}`;

    await sendEmail({
      to: user.email,

      subject: "Verify your email - Hunter Association",

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: auto;
            padding: 30px;
          "
        >
          <h2>Verify Your Email</h2>

          <p>
            Hello ${user.displayName},
          </p>

          <p>
            You requested a new email verification link.
          </p>

          <a
            href="${verifyURL}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #4f46e5;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
            "
          >
            Verify Email
          </a>

          <p>
            This link expires in 24 hours.
          </p>

          <p>
            If you did not request this email,
            you can safely ignore it.
          </p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message:
        "Verification email has been sent.",
    });

  } catch (error) {
    console.error(
      "Resend verification email error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};