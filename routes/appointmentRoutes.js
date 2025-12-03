// routes/appointmentRoutes.js
import express from "express";
import {
  getAvailableSlots,
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getArchivedAppointments,
  getAppointmentDetails,
  confirmAppointment,
  completeAppointment,
  markAsNoShow,
  archiveExpiredAppointments,
  markPaymentReceived,
  cancelAppointment,
  deleteAppointment,
  getAllAppointments,
  deleteArchivedAppointment,
} from "../controllers/appointmentController.js";
import {
  isDoctor,
  isPatient,
  requireSignIn,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
// Get available slots for a doctor (anyone can check)
router.get("/slots", getAvailableSlots);

// ============================================
// PATIENT ROUTES
// ============================================
// Create appointment (patient only)
router.post("/create", requireSignIn, isPatient, createAppointment);

// Get patient's appointments
router.get("/patient", requireSignIn, isPatient, getPatientAppointments);

// Cancel appointment (patient only)
router.patch(
  "/:appointmentId/cancel",
  requireSignIn,
  isPatient,
  cancelAppointment
);

// ============================================
// DOCTOR ROUTES
// ============================================
// Get doctor's appointments
router.get("/doctor", requireSignIn, isDoctor, getDoctorAppointments);

// Get archived appointments (doctor only)
router.get(
  "/doctor/archived",
  requireSignIn,
  isDoctor,
  getArchivedAppointments
);
router.get("/admin-appointments", getAllAppointments);
router.delete("/appointment/:appointmentId", deleteArchivedAppointment);
// Confirm appointment (doctor only)
router.patch(
  "/:appointmentId/confirm",
  requireSignIn,
  isDoctor,
  confirmAppointment
);

// Complete appointment (doctor only)
router.patch(
  "/:appointmentId/status",
  requireSignIn,
  isDoctor,
  completeAppointment
);

// Mark as no-show (doctor only)
router.patch("/:appointmentId/no-show", requireSignIn, isDoctor, markAsNoShow);

// Mark payment received (doctor only)
router.patch(
  "/:appointmentId/mark-paid",
  requireSignIn,
  isDoctor,
  markPaymentReceived
);

// Archive expired appointments (doctor/admin can trigger manually)
router.post(
  "/archive-expired",
  requireSignIn,
  isDoctor,
  archiveExpiredAppointments
);

// Delete appointment (doctor only)
router.delete("/:appointmentId", requireSignIn, isDoctor, deleteAppointment);

// ============================================
// SHARED ROUTES (Patient or Doctor)
// ============================================
// Get single appointment details
router.get("/:appointmentId", requireSignIn, getAppointmentDetails);

export default router;
