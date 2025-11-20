import express from "express";
import {
  forgotPasswordController,
  getAllAuthorsController,
  getUserDetailsController,
  getresetController,
  loginController,
  postresetController,
  registerController,
  requestVerificationController,
  verifyAuthorController,
  // updateUserProfileController,
} from "../controllers/authController.js";
import {
  isAdmin,
  isAuthor,
  requireSignIn,
} from "../middlewares/authMiddleware.js";

import { uploadUserImageController } from "../controllers/uploadUserImageController.js";

const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/user/:email", getUserDetailsController);
router.get("/users/authors", getAllAuthorsController);
// Author routes

router.post("/author/request-verification", requestVerificationController);
router.patch("/author/verify", verifyAuthorController);

router.get("/user-auth", requireSignIn, (req, res) => {
  res.status(200).send({ ok: true });
});

router.get("/author-auth", requireSignIn, isAuthor, (req, res) => {
  res.status(200).send({ ok: true });
});

router.get("/admin-auth", requireSignIn, isAdmin, (req, res) => {
  res.status(200).send({ ok: true });
});

router.put("/user/update/:email", uploadUserImageController);
router.post("/forgot-password", forgotPasswordController);
router.get("/reset-password/:id/:token", getresetController);
router.post("/reset-password/:id/:token", postresetController);

export default router;
