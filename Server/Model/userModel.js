import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        trim:true,
        required:true,
        unique: true,
    },
    displayName: {
        type:String,
        trim:true,
        required:true,
    },
    password:{
        type: String,
        required: true,
        minLength: 8,
    },
    email:{
        type: String,
        trim: true,
        required: true,
        unique: true,
        lowercase: true,
    },
    age: {
        type: Date,
        required: true,
    },
        isVerified: {
        type: Boolean,
        default: false,
        },

        verifyEmailToken: {
        type: String,
        default: null,
        },

        verifyEmailExpires: {
        type: Date,
        default: null,
        },
    resetPasswordToken:{
        type: String,
        default: null
    },
    resetPasswordExpires:{
        type: Date,
        default: null,
    }

}
    ,{
        timestamps:true
});

const userModel = mongoose.model("User", userSchema);
export default userModel;