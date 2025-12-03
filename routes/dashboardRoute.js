import express from "express";
import {
  isDoctor,
  isPatient,
  requireSignIn,
} from "../middlewares/authMiddleware.js";
import {
  getAppointmentStats,
  getDoctorDashboard,
  getPatientDashboard,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/patient", requireSignIn, isPatient, getPatientDashboard);
router.get("/stats", requireSignIn, isPatient, getAppointmentStats);
// doctorRoutes.js
router.get("/doctor", requireSignIn, isDoctor, getDoctorDashboard);

export default router;
