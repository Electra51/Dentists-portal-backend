// routes/adminRoutes.js (নতুন)
import express from "express";
import {
  getPendingDoctorsController,
  approveDoctorController,
  rejectDoctorController,
  getAllDoctorsController,
  getDashboardStatsController,
} from "../controllers/adminController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Admin dashboard
router.get(
  "/dashboard-stats",
  requireSignIn,
  isAdmin,
  getDashboardStatsController
);

// Doctor management
router.get(
  "/pending-doctors",
  requireSignIn,
  isAdmin,
  getPendingDoctorsController
);
router.get("/doctors", requireSignIn, isAdmin, getAllDoctorsController);
router.put(
  "/approve-doctor/:doctorId",
  requireSignIn,
  isAdmin,
  approveDoctorController
);
router.put(
  "/reject-doctor/:doctorId",
  requireSignIn,
  isAdmin,
  rejectDoctorController
);

export default router;
