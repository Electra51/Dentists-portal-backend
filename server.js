import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import authRoutes from "./routes/authRoute.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cors from "cors";
import connectDB from "./config/db.js";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//database
connectDB();

const app = express();

//middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));
app.use(morgan("dev"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/auth/doctor", doctorRoutes); // নতুন
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/category", categoryRoutes);

app.get("/", (req, res) => {
  res.send("<h1>Welcome to Dentists portal backend</h1>");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(
    `Server Running on ${process.env.DEV_MODE} for dentists-portal mode on ${PORT}`
      .bgRed.white
  );
});
