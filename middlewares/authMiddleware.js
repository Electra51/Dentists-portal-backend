// import JWT from "jsonwebtoken";
// import userModel from "../models/userModel.js";
// import dotenv from "dotenv";

// dotenv.config();
// //Protected Routes token base
// export const requireSignIn = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).send({ message: "No token provided" });
//     }

//     // Bearer token split from header
//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).send({ message: "Invalid token format" });
//     }

//     const decoded = JWT.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;

//     next();
//   } catch (error) {
//     console.log("Token error:", error.message);
//     return res.status(401).send({ message: "Invalid or expired token" });
//   }
// };

// // Patient middleware যোগ করুন
// export const isPatient = (req, res, next) => {
//   if (req.user.role !== 0) {
//     return res.status(403).send({
//       success: false,
//       message: "Access denied. Patients only.",
//     });
//   }
//   next();
// };
// // middlewares/authMiddleware.js
// export const isDoctor = (req, res, next) => {
//   if (req.user.role !== 1) {
//     return res.status(403).send({
//       success: false,
//       message: "Access denied. Doctors only.",
//     });
//   }
//   next();
// };

// export const isAdmin = (req, res, next) => {
//   if (req.user.role !== 2) {
//     return res.status(403).send({
//       success: false,
//       message: "Access denied. Admins only.",
//     });
//   }
//   next();
// };

import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();

// Protected Routes token base
export const requireSignIn = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).send({ message: "No token provided" });
    }

    // Bearer token split from header
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).send({ message: "Invalid token format" });
    }

    const decoded = JWT.verify(token, process.env.JWT_SECRET);

    // ✅ Set both _id and id for compatibility
    req.user = {
      _id: decoded._id,
      id: decoded._id, // ✅ Add this line
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.log("Token error:", error.message);
    return res.status(401).send({ message: "Invalid or expired token" });
  }
};

// Doctor middleware
export const isDoctor = (req, res, next) => {
  if (req.user.role !== 1) {
    return res.status(403).send({
      success: false,
      message: "Access denied. Doctors only.",
    });
  }
  next();
};

// Admin middleware
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 2) {
    return res.status(403).send({
      success: false,
      message: "Access denied. Admins only.",
    });
  }
  next();
};

// ✅ Patient middleware (নতুন)
export const isPatient = (req, res, next) => {
  if (req.user.role !== 0) {
    return res.status(403).send({
      success: false,
      message: "Access denied. Patients only.",
    });
  }
  next();
};
