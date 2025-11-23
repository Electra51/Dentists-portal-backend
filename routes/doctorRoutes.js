import express from "express";
import { updateDoctorProfileController } from "../controllers/doctorController.js";
import { requireSignIn, isDoctor } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.put("/profile", requireSignIn, isDoctor, updateDoctorProfileController);

export default router;
