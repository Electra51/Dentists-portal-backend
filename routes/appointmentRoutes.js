// // routes/appointmentRoutes.js
// import express from "express";
// import {
//   getAvailableSlots,
//   createAppointment,
//   getPatientAppointments,
//   getDoctorAppointments,
//   updateAppointmentStatus,
//   getAppointmentDetails,
// } from "../controllers/appointmentController.js";
// import { requireSignIn } from "../middlewares/authMiddleware.js";

// const router = express.Router();

// // Public routes
// router.get("/available-slots", getAvailableSlots); // GET /api/appointments/available-slots?doctorId=xxx&date=2025-11-23

// // Protected routes
// router.post("/create", requireSignIn, createAppointment); // POST /api/appointments/create
// router.get("/patient", requireSignIn, getPatientAppointments); // GET /api/appointments/patient
// router.get("/doctor", requireSignIn, getDoctorAppointments); // GET /api/appointments/doctor
// router.get("/:appointmentId", requireSignIn, getAppointmentDetails); // GET /api/appointments/:id
// router.patch("/:appointmentId/status", requireSignIn, updateAppointmentStatus); // PATCH /api/appointments/:id/status

// export default router;

// routes/appointmentRoutes.js
import express from "express";
import {
  getAvailableSlots,
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getAppointmentDetails,
  completeAppointment,
  markPaymentReceived,
  cancelAppointment,
  updateAppointmentStatus,
} from "../controllers/appointmentController.js";
import { isDoctor, requireSignIn } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.get("/available-slots", getAvailableSlots);

// Protected - Patient
router.post("/create", requireSignIn, createAppointment);
router.get("/patient", requireSignIn, getPatientAppointments);

// Protected - Doctor
router.get("/doctor", requireSignIn, isDoctor, getDoctorAppointments);
router.patch(
  "/:appointmentId/complete",
  requireSignIn,
  isDoctor,
  completeAppointment
);
router.patch(
  "/:appointmentId/mark-paid",
  requireSignIn,
  isDoctor,
  markPaymentReceived
);

// Protected - Both
router.get("/:appointmentId", requireSignIn, getAppointmentDetails);
router.patch("/:appointmentId/cancel", requireSignIn, cancelAppointment);
router.patch("/:appointmentId/status", requireSignIn, updateAppointmentStatus);

export default router;
