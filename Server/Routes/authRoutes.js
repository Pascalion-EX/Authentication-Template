import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} from "../Controller/authController.js";
import { userAuth, requireVerifiedEmail } from "../Middleware/authMiddleware.js";
import express from "express";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/login",login);
authRouter.post(
  "/forgot-password",
  forgotPassword
);
authRouter.post(
  "/reset-password/:token",
  resetPassword
);
authRouter.get(
  "/verify-email/:token",
  verifyEmail
);
authRouter.post(
  "/resend-verification",
  resendVerificationEmail
);
export default authRouter;