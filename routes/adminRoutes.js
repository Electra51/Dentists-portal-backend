import express from "express";
import {
  getAllDoctorsController,
  getAllPatientsController,
  getPatientDetailsController,
  deletePatientController,
  getPatientStatsController,
} from "../controllers/adminController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";
import {
  getMonthlyRevenueTrend,
  getRecentTransactions,
  getRevenueByDoctor,
  getRevenueByService,
  getRevenueDashboard,
} from "../controllers/adminRevenueController.js";

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

// ✅ Admin Revenue Routes
router.get("/revenue/dashboard", requireSignIn, isAdmin, getRevenueDashboard);
router.get("/revenue/by-doctor", requireSignIn, isAdmin, getRevenueByDoctor);
router.get("/revenue/by-service", requireSignIn, isAdmin, getRevenueByService);
router.get(
  "/revenue/monthly-trend",
  requireSignIn,
  isAdmin,
  getMonthlyRevenueTrend
);
router.get(
  "/revenue/transactions",
  requireSignIn,
  isAdmin,
  getRecentTransactions
);

router.get("/patient-stats", requireSignIn, isAdmin, getPatientStatsController);

export default router;
