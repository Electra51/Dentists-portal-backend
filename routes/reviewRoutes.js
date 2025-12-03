// import express from "express";
// import {
//   isAdmin,
//   isPatient,
//   requireSignIn,
// } from "../middlewares/authMiddleware.js";
// import {
//   getDoctorReviews,
//   getMyReviews,
//   moderateReview,
//   submitReview,
// } from "../controllers/reviewController.js";

// const router = express.Router();

// router.post("/submit", requireSignIn, isPatient, submitReview);
// router.get("/my-reviews", requireSignIn, isPatient, getMyReviews);

// router.get("/doctor/:doctorId", getDoctorReviews);

// router.put("/moderate/:reviewId", requireSignIn, isAdmin, moderateReview);

// export default router;

// ============================================
// reviewRoutes.js - Update your routes
// ============================================

import express from "express";
import {
  isAdmin,
  isPatient,
  requireSignIn,
} from "../middlewares/authMiddleware.js";
import {
  getDoctorReviews,
  getMyReviews,
  moderateReview,
  submitReview,
  updateReview,
  deleteReview,
  getAllReviews, // NEW IMPORT
} from "../controllers/reviewController.js";

const router = express.Router();

// Patient routes
router.post("/submit", requireSignIn, isPatient, submitReview);
router.get("/my-reviews", requireSignIn, isPatient, getMyReviews);
router.put("/update/:reviewId", requireSignIn, isPatient, updateReview);
router.delete("/delete/:reviewId", requireSignIn, isPatient, deleteReview);

// Public route
router.get("/doctor/:doctorId", getDoctorReviews);

// Admin routes
router.get("/all", requireSignIn, getAllReviews); // NEW ROUTE
router.put("/moderate/:reviewId", requireSignIn, isAdmin, moderateReview);

export default router;
