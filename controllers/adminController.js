// controllers/adminController.js
import userModel from "../models/userModel.js";

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

// Get all patients with filter and search
export const getAllPatientsController = async (req, res) => {
  try {
    const { search, bloodGroup, sortBy = "createdAt" } = req.query;

    let query = { role: 0 }; // Only patients

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by blood group
    if (bloodGroup && bloodGroup !== "all") {
      query.bloodGroup = bloodGroup;
    }

    // Sort options
    let sortOptions = {};
    if (sortBy === "name") {
      sortOptions = { name: 1 };
    } else if (sortBy === "oldest") {
      sortOptions = { createdAt: 1 };
    } else {
      sortOptions = { createdAt: -1 }; // Default: newest first
    }

    const patients = await userModel
      .find(query)
      .select("-password")
      .sort(sortOptions);

    res.status(200).send({
      success: true,
      count: patients.length,
      data: patients,
    });
  } catch (error) {
    console.error("Error in getAllPatientsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single patient details
export const getPatientDetailsController = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await userModel
      .findOne({ _id: patientId, role: 0 })
      .select("-password");

    if (!patient) {
      return res.status(404).send({
        success: false,
        message: "Patient not found",
      });
    }

    // You can add appointment history, medical records here
    // const appointments = await appointmentModel.find({ patientId });

    res.status(200).send({
      success: true,
      data: patient,
      // appointments, // If you have appointments
    });
  } catch (error) {
    console.error("Error in getPatientDetailsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete patient (soft delete by marking inactive)
export const deletePatientController = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await userModel.findOne({ _id: patientId, role: 0 });

    if (!patient) {
      return res.status(404).send({
        success: false,
        message: "Patient not found",
      });
    }

    // Soft delete - mark as inactive
    patient.isActive = false;
    await patient.save();

    res.status(200).send({
      success: true,
      message: "Patient deactivated successfully",
    });
  } catch (error) {
    console.error("Error in deletePatientController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to delete patient",
      error: error.message,
    });
  }
};

// Get patient statistics
export const getPatientStatsController = async (req, res) => {
  try {
    const totalPatients = await userModel.countDocuments({ role: 0 });
    const activePatients = await userModel.countDocuments({
      role: 0,
      isActive: true,
    });

    // Patients by blood group
    const bloodGroupStats = await userModel.aggregate([
      { $match: { role: 0, bloodGroup: { $ne: "" } } },
      { $group: { _id: "$bloodGroup", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // New patients this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newPatientsThisMonth = await userModel.countDocuments({
      role: 0,
      createdAt: { $gte: startOfMonth },
    });

    res.status(200).send({
      success: true,
      stats: {
        totalPatients,
        activePatients,
        inactivePatients: totalPatients - activePatients,
        newPatientsThisMonth,
        bloodGroupStats,
      },
    });
  } catch (error) {
    console.error("Error in getPatientStatsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
