import express from "express";
import {
  getDoctorDashboardController,
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
import {
  getMyEarningsDashboard,
  getMyEarningsHistory,
  getMyMonthlyTrend,
  getPendingPayments,
} from "../controllers/doctorEarningsController.js";
import { markPaymentReceived } from "../controllers/appointmentController.js";

const router = express.Router();

// ✅ Doctor Earnings Routes
router.get(
  "/earnings/dashboard",
  requireSignIn,
  isDoctor,
  getMyEarningsDashboard
);
router.get("/earnings/history", requireSignIn, isDoctor, getMyEarningsHistory);
router.get(
  "/earnings/monthly-trend",
  requireSignIn,
  isDoctor,
  getMyMonthlyTrend
);
router.get("/earnings/pending", requireSignIn, isDoctor, getPendingPayments);
router.patch(
  "/earnings/mark-paid/:appointmentId",
  isDoctor,
  markPaymentReceived
);

// ==================== DASHBOARD ====================
router.get("/dashboard", requireSignIn, isDoctor, getDoctorDashboardController);

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
