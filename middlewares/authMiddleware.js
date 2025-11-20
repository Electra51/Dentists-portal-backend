import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";
import dotenv from "dotenv";

dotenv.config();
//Protected Routes token base
export const requireSignIn = async (req, res, next) => {
  console.log("req", req);
  try {
    const decode = JWT.verify(
      req.headers.authorization,
      process.env.JWT_SECRET
    );
    req.user = decode;
    next();
  } catch (error) {
    console.log(error);
  }
};

// ddmin access
export const isAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (user.role !== 1) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized Access",
      });
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(401).send({
      success: false,
      error,
      message: "Error in admin middleware",
    });
  }
};

// Author access
export const isAuthor = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);
    if (user.role !== 1 && user.role !== 2) {
      // Allow if role is Author (1) or Admin (2)
      return res.status(401).send({
        success: false,
        message: "Unauthorized Access",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    res
      .status(401)
      .send({ success: false, message: "Error in author middleware" });
  }
};

// export const authenticateJWT = (req, res, next) => {
//   // Extract token from Authorization header
//   const token = req.headers["authorization"]?.split(" ")[1]; // Extract token after "Bearer"
//   console.log("token", token);

//   if (!token) {
//     return res.status(403).json({ message: "Access denied" });
//   }

//   // Verify the token using the secret key
//   JWT.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({ message: "Invalid or expired token" });
//     }
//     req.user = user; // Attach user information to the request object
//     console.log(" req.user", req.user);
//     next(); // Proceed to the next middleware or route handler
//   });
// };
