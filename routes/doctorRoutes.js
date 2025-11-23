// routes/doctorRoutes.js (নতুন)
import express from "express";
import {
  requestVerificationController,
  getVerificationStatusController,
  updateDoctorProfileController,
} from "../controllers/doctorController.js";
import { requireSignIn, isDoctor } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Doctor verification routes
router.post(
  "/request-verification",
  requireSignIn,
  isDoctor,
  requestVerificationController
);
router.get(
  "/verification-status",
  requireSignIn,
  isDoctor,
  getVerificationStatusController
);

// Doctor profile update
router.put("/profile", requireSignIn, isDoctor, updateDoctorProfileController);

export default router;
