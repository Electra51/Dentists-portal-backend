// import express from "express";
// import multer from "multer";
// import path from "path";
// import userModel from "../models/userModel.js";

// const router = express.Router();

// // Set up multer storage engine
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/images");
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });

// // Set up multer upload middleware
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 2000000 }, // 2MB file size limit
//   fileFilter: function (req, file, cb) {
//     const filetypes = /jpeg|jpg|png|gif/;
//     const extname = filetypes.test(
//       path.extname(file.originalname).toLowerCase()
//     );
//     const mimetype = filetypes.test(file.mimetype);
//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//       cb("Error: Images only!");
//     }
//   },
// }).single("profileImage"); // Update field name here to "profileImage"

// // Controller function
// export const uploadUserImageController = async (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       return res.status(400).json({ message: err });
//     }

//     try {
//       const { email } = req.params;
//       const { nickname } = req.body;

//       if (!email) {
//         return res.status(400).json({ message: "Email is required" });
//       }

//       // Find the user by email
//       const user = await userModel.findOne({ email });
//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: "User not found",
//         });
//       }

//       // Update user fields
//       if (nickname) user.nickname = nickname;
//       if (req.file) {
//         const imageUrl = `${
//           // process.env.BASE_URL || "http://localhost:8080"
//           process.env.BASE_URL || "https://blue-sky-backend-umber.vercel.app"
//         }${req.file.path.replace("public", "")}`;
//         user.profileImage = imageUrl;
//       }

//       // Save the updated user data
//       await user.save();

//       res.status(200).json({
//         success: true,
//         message: "User profile updated successfully",
//         user,
//       });
//     } catch (error) {
//       console.log(error);
//       res.status(500).json({ message: "Server error" });
//     }
//   });
// };

import express from "express";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import userModel from "../models/userModel.js";

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_images", // Cloudinary folder name
    allowed_formats: ["jpeg", "jpg", "png", "gif"], // Allowed file types
    public_id: (req, file) => `user-${Date.now()}`, // File naming strategy
  },
});

const upload = multer({ storage: storage }).single("profileImage"); // Field name is "profileImage"

// Controller function
export const uploadUserImageController = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err });
    }

    try {
      const { email } = req.params;
      const { nickname } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find the user by email
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user fields
      if (nickname) user.nickname = nickname;
      if (req.file) {
        user.profileImage = req.file.path; // Cloudinary image URL
      }

      // Save the updated user data
      await user.save();

      res.status(200).json({
        success: true,
        message: "User profile updated successfully",
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });
};

export default router;
