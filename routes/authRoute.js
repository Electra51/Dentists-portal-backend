import express from "express";
import {
  approveDoctorController,
  getPendingDoctorsController,
  getUserDetailsController,
  getUserProfileController,
  getVerificationStatusController,
  loginController,
  registerController,
  requestVerificationController,
  updateUserProfileController,
} from "../controllers/authController.js";
import {
  isAdmin,
  isDoctor,
  requireSignIn,
} from "../middlewares/authMiddleware.js";

import { uploadUserImageController } from "../controllers/uploadUserImageController.js";

const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);

router.get("/profile", requireSignIn, getUserProfileController);
router.put("/profile", requireSignIn, updateUserProfileController);

router.get("/user/:email", getUserDetailsController);

router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

router.put("/profile/upload/:email", uploadUserImageController);

router.post(
  "/request-verification",
  requireSignIn,
  isDoctor,
  requestVerificationController
);
router.post(
  "/approve-doctor/:doctorId",
  requireSignIn,
  isAdmin,
  approveDoctorController
);
router.get(
  "/verification-status",
  requireSignIn,
  isDoctor,
  getVerificationStatusController
);

router.get(
  "/pending-doctors",
  requireSignIn,
  isAdmin,
  getPendingDoctorsController
);
export default router;
