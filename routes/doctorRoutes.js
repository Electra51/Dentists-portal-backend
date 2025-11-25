// import express from "express";
// import { updateDoctorProfileController } from "../controllers/doctorController.js";
// import { requireSignIn, isDoctor } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// router.put("/profile", requireSignIn, isDoctor, updateDoctorProfileController);

// export default router;

// routes/doctorRoutes.js
import express from "express";
import {
  getDoctorDashboardController,
  getDoctorAppointmentsController,
  getAppointmentDetailsController,
  updateAppointmentStatusController,
  getDoctorPatientsController,
  getPatientDetailsByDoctorController,
  getDoctorPrescriptionsController,
  createPrescriptionController,
  getDoctorScheduleController,
  updateDoctorScheduleController,
  getDoctorReviewsController,
  getDoctorPaymentsController,
  getDoctorProfileController,
  updateDoctorProfileController,
  getDoctorSettingsController,
  updateDoctorSettingsController,
  getAllVerifiedDentistsController,
  getDentistDetailsController,
} from "../controllers/doctorController.js";
import { requireSignIn, isDoctor } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ==================== DASHBOARD ====================
router.get("/dashboard", requireSignIn, isDoctor, getDoctorDashboardController);

// ==================== APPOINTMENTS ====================
router.get(
  "/appointments",
  requireSignIn,
  isDoctor,
  getDoctorAppointmentsController
);
router.get(
  "/appointment/:appointmentId",
  requireSignIn,
  isDoctor,
  getAppointmentDetailsController
);
router.put(
  "/appointment/:appointmentId/status",
  requireSignIn,
  isDoctor,
  updateAppointmentStatusController
);

// ==================== PATIENTS ====================
router.get("/patients", requireSignIn, isDoctor, getDoctorPatientsController);
router.get(
  "/patient/:patientId",
  requireSignIn,
  isDoctor,
  getPatientDetailsByDoctorController
);

// ==================== PRESCRIPTIONS ====================
router.get(
  "/prescriptions",
  requireSignIn,
  isDoctor,
  getDoctorPrescriptionsController
);
router.post(
  "/prescription",
  requireSignIn,
  isDoctor,
  createPrescriptionController
);

// ==================== SCHEDULE ====================
router.get("/schedule", requireSignIn, isDoctor, getDoctorScheduleController);
router.put(
  "/schedule",
  requireSignIn,
  isDoctor,
  updateDoctorScheduleController
);

router.get("/public/all", getAllVerifiedDentistsController);
router.get("/public/:dentistId", getDentistDetailsController);

// ==================== REVIEWS ====================
router.get("/reviews", requireSignIn, isDoctor, getDoctorReviewsController);

// ==================== PAYMENTS ====================
router.get("/payments", requireSignIn, isDoctor, getDoctorPaymentsController);

// ==================== PROFILE ====================
router.get("/profile", requireSignIn, isDoctor, getDoctorProfileController);
router.put("/profile", requireSignIn, isDoctor, updateDoctorProfileController);

// ==================== SETTINGS ====================
router.get("/settings", requireSignIn, isDoctor, getDoctorSettingsController);
router.put(
  "/settings",
  requireSignIn,
  isDoctor,
  updateDoctorSettingsController
);

export default router;
