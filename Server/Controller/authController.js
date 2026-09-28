import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import userModel from "../Model/userModel.js";

const createToken = (userId) =>{
    return jwt.sign(
        {userId},
        process.env.JWT_SECRET,
        {expiresIn: "3d"}

    );
};

const setTokenCookie = (res, token) =>{
    res.cookie("token",token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 3 * 24 * 60 * 60 * 1000,
    });
};

// *REGISTER CONTROLLER*

export const register = async (req,res) =>{
    try {

        const {userName,displayName,email,password,age} = req.body;
        if(!userName || !displayName || !email || !password || !age){
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        if (password.length < 8){
            return res.status(400).json({
                success: false,
                message: "Your password must be at least 8 characters!",
            });  
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUserName = userName.trim().toLowerCase();
        const existingEmail = await userModel.findOne({email: normalizedEmail,});
        
        if(existingEmail){
            return res.status(409).json({
                success:false,
                message: "This Email is already registered!"
            });
        };

        const existingUserName = await userModel.findOne({userName: normalizedUserName,});
        if(existingUserName){
            return res.status(409).json({
                success:false,
                message: "There is an account already created with the same UserName"
            })
        }

        const salt = await bcrypt.genSalt(22);
        const hashedPassword = await bcrypt.hash(
            password,
            salt
        );

        const user = await userModel.create({
            userName: normalizedUserName,
            email: normalizedEmail,
            displayName: displayName.trim(),
            password: hashedPassword,
            age,
        });

        const token = createToken(user._id);
        setTokenCookie(res, token);

        return res.status(201).json({
            success: true,
            message: "Welcome to Hunter association"
        });
    } catch (error) {
        console.log("You have failed the Hunter exam", error.message);
        return res.status(500).json({
            success:false,
            message: error.message,
        });
    }
};

// *Login Controller*

export const login = async (req,res) =>{
    try {
        const {identifier, password} = req.body;
        if(!identifier !== "string" || !password !== "string"){
            return res.status(400).json({
                success: false,
                message: "Username/email and password are required",
            });
        }

        const normalizedIdentifier = identifier.trim();

        const user = await userModel.findOne({
            $or: [
                {email: normalizedIdentifier.toLowerCase()},
                {userName: normalizedIdentifier},
            ],
        });

        if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid username/email or password",
            });
        }
        
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );
        if(!isPasswordCorrect){
            return res.status(401),json({
                success: false,
                message: "Invalid username/email or password",
            });
        }

        const token = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET,
            {expiresIn: "3d"}
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 3 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
        });
    } catch (error) {
        console.error("Login Failed:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};