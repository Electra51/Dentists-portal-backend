import express from "express";
import {
  getAllDoctorsController,
  getAllPatientsController,
  getPatientDetailsController,
  deletePatientController,
  getPatientStatsController,
} from "../controllers/adminController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/doctors", requireSignIn, isAdmin, getAllDoctorsController);

router.get("/patients", requireSignIn, isAdmin, getAllPatientsController);
router.get(
  "/patient/:patientId",
  requireSignIn,
  isAdmin,
  getPatientDetailsController
);
router.delete(
  "/patient/:patientId",
  requireSignIn,
  isAdmin,
  deletePatientController
);
router.get("/patient-stats", requireSignIn, isAdmin, getPatientStatsController);

export default router;
