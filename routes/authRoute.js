import express from "express";
import {
  getUserDetailsController,
  getUserProfileController,
  loginController,
  registerController,
  updateUserProfileController,
} from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "../middlewares/authMiddleware.js";

import { uploadUserImageController } from "../controllers/uploadUserImageController.js";

const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);

router.get("/profile", requireSignIn, getUserProfileController);
router.put("/profile", requireSignIn, updateUserProfileController);

router.get("/user/:email", getUserDetailsController);
// Author routes

router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

router.put("/profile/upload/:email", uploadUserImageController);

export default router;
