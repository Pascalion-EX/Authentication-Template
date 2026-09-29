import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import connectDB from "./Config/MongoConfig.js";
import authRouter from "./Routes/authRoutes.js";

dotenv.config();
const app = express();

connectDB();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});