// import express from "express";

// const router = express.Router();
// import multer from "multer";
// import path from "path";

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
// }).single("image");

// export const uploadImageController = async (req, res) => {
//   try {
//     upload(req, res, (err) => {
//       if (err) {
//         console.error(err);
//         res.status(400).json({ message: err });
//       } else {
//         console.log(req.file);
//         const imageUrl = `${
//           // process.env.BASE_URL || "http://localhost:8080"
//           process.env.BASE_URL || "https://blue-sky-backend-umber.vercel.app"
//         }${req.file.path.replace("public", "")}`;
//         res.status(200).json({ url: imageUrl });
//       }
//     });
//   } catch (err) {
//     console.log(err);
//   }
// };

import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer-Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads", // Folder name in Cloudinary
    allowed_formats: ["jpeg", "jpg", "png", "gif"], // Allowable file types
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Custom file name
  },
});

const upload = multer({ storage: storage }).single("image");

// Image Upload Controller
export const uploadImageController = async (req, res) => {
  try {
    upload(req, res, (err) => {
      if (err) {
        console.error(err);
        res.status(400).json({ message: "Error uploading image", error: err });
      } else {
        console.log(req.file); // File details from Cloudinary
        const imageUrl = req.file.path; // Cloudinary URL
        res.status(200).json({ url: imageUrl });
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

export default router;
