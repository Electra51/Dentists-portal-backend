// controllers/adminController.js
import userModel from "../models/userModel.js";

// Get pending verification requests
export const getPendingDoctorsController = async (req, res) => {
  try {
    const pendingDoctors = await userModel
      .find({
        role: 1,
        verificationStatus: "pending",
      })
      .select("-password")
      .sort({ verificationRequestDate: -1 });

    res.status(200).send({
      success: true,
      count: pendingDoctors.length,
      data: pendingDoctors,
    });
  } catch (error) {
    console.error("Error in getPendingDoctorsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Approve doctor
export const approveDoctorController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const adminId = req.user._id;

    const doctor = await userModel.findById(doctorId);

    if (!doctor || doctor.role !== 1) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    if (doctor.verificationStatus === "approved") {
      return res.status(400).send({
        success: false,
        message: "Doctor is already verified",
      });
    }

    // Update verification status
    doctor.verificationStatus = "approved";
    doctor.verifiedBy = adminId;
    doctor.verifiedAt = new Date();
    doctor.rejectionReason = "";
    await doctor.save();

    const approvedDoctor = await userModel
      .findById(doctorId)
      .select("-password");

    res.status(200).send({
      success: true,
      message: "Doctor approved successfully",
      data: approvedDoctor,
    });
  } catch (error) {
    console.error("Error in approveDoctorController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to approve doctor",
      error: error.message,
    });
  }
};

// Reject doctor
export const rejectDoctorController = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    const doctor = await userModel.findById(doctorId);

    if (!doctor || doctor.role !== 1) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    // Update verification status
    doctor.verificationStatus = "rejected";
    doctor.rejectionReason =
      reason ||
      "Credentials not verified. Please update your information and resubmit.";
    doctor.verifiedAt = null;
    doctor.verifiedBy = null;
    await doctor.save();

    const rejectedDoctor = await userModel
      .findById(doctorId)
      .select("-password");

    res.status(200).send({
      success: true,
      message: "Doctor verification rejected",
      data: rejectedDoctor,
    });
  } catch (error) {
    console.error("Error in rejectDoctorController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to reject doctor",
      error: error.message,
    });
  }
};

// Get all doctors with filter
export const getAllDoctorsController = async (req, res) => {
  try {
    const { status } = req.query; // approved, pending, rejected, all

    let query = { role: 1 };

    if (status && status !== "all") {
      query.verificationStatus = status;
    }

    const doctors = await userModel
      .find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error("Error in getAllDoctorsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get dashboard stats
export const getDashboardStatsController = async (req, res) => {
  try {
    const totalDoctors = await userModel.countDocuments({ role: 1 });
    const verifiedDoctors = await userModel.countDocuments({
      role: 1,
      verificationStatus: "approved",
    });
    const pendingDoctors = await userModel.countDocuments({
      role: 1,
      verificationStatus: "pending",
    });
    const totalPatients = await userModel.countDocuments({ role: 0 });

    res.status(200).send({
      success: true,
      stats: {
        totalDoctors,
        verifiedDoctors,
        pendingDoctors,
        totalPatients,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardStatsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
