import express from "express";
import {
  createPrescription,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor,
  getPrescriptionById,
  getPrescriptionsByAppointment,
  updatePrescription,
  deletePrescription,
  getPrescriptionStats,
} from "../controllers/prescriptionController.js";
import { requireSignIn, isDoctor } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/create-prescriptions",
  requireSignIn,
  isDoctor,
  createPrescription
);

// ✅ Get doctor's prescriptions (Doctor only)
router.get(
  "/prescriptions/doctor",
  requireSignIn,
  isDoctor,
  getPrescriptionsByDoctor
);

// ✅ Get prescription statistics (Doctor only)
router.get(
  "/prescriptions/stats",
  requireSignIn,
  isDoctor,
  getPrescriptionStats
);

// ✅ Get prescriptions by patient ID
router.get(
  "/prescriptions/patient/:patientId",
  requireSignIn,
  getPrescriptionsByPatient
);

// ✅ Get prescriptions by appointment ID
router.get(
  "/prescriptions/appointment/:appointmentId",
  requireSignIn,
  getPrescriptionsByAppointment
);

// ✅ Get single prescription by ID
router.get(
  "/prescriptions/:prescriptionId",
  requireSignIn,
  getPrescriptionById
);

// ✅ Update prescription (Doctor only)
router.put(
  "/prescriptions/:prescriptionId",
  requireSignIn,
  isDoctor,
  updatePrescription
);

// ✅ Delete prescription (Doctor only)
router.delete(
  "/prescriptions/:prescriptionId",
  requireSignIn,
  isDoctor,
  deletePrescription
);

export default router;
