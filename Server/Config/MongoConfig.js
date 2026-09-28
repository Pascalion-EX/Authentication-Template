import mongoose from "mongoose";

const connectDB = async () =>{
    try {
        await mongoose.connect(process.env.MongoDB_URI);
        console.log("MongoDB on Dock")
    } catch (error) {
       console.error("MongoDB Failed", error.message);
       process.exit(1); 
    }
};
connectDB();
export default connectDB;