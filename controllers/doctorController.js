// controllers/doctorController.js
import userModel from "../models/userModel.js";

// Request verification
export const requestVerificationController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const doctor = await userModel.findById(doctorId);

    if (!doctor || doctor.role !== 1) {
      return res.status(403).send({
        success: false,
        message: "Only doctors can request verification",
      });
    }

    // Check if profile is complete
    if (!doctor.specialization || !doctor.bmdcNumber || !doctor.qualification) {
      return res.status(400).send({
        success: false,
        message:
          "Please complete your profile before requesting verification. Required: Specialization, BMDC Number, and Qualification.",
      });
    }

    // Check if already verified
    if (doctor.verificationStatus === "approved") {
      return res.status(400).send({
        success: false,
        message: "Your profile is already verified",
      });
    }

    // Check if request is already pending
    if (doctor.verificationStatus === "pending") {
      return res.status(400).send({
        success: false,
        message: "Your verification request is already pending",
      });
    }

    // Update verification status
    doctor.verificationStatus = "pending";
    doctor.verificationRequestDate = new Date();
    await doctor.save();

    res.status(200).send({
      success: true,
      message:
        "Verification request sent successfully! Admin will review your credentials soon.",
      data: {
        verificationStatus: doctor.verificationStatus,
        verificationRequestDate: doctor.verificationRequestDate,
      },
    });
  } catch (error) {
    console.error("Error in requestVerificationController:", error);
    res.status(500).send({
      success: false,
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
};

// Get verification status
export const getVerificationStatusController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const doctor = await userModel
      .findById(doctorId)
      .select(
        "verificationStatus verificationRequestDate verifiedAt rejectionReason"
      );

    if (!doctor) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).send({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Error in getVerificationStatusController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update doctor profile (doctor-specific fields)
export const updateDoctorProfileController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const {
      specialization,
      bmdcNumber,
      experience,
      qualification,
      department,
      schedule,
      phone,
      address,
    } = req.body;

    const doctor = await userModel.findById(doctorId);

    if (!doctor || doctor.role !== 1) {
      return res.status(403).send({
        success: false,
        message: "Access denied",
      });
    }

    // Update fields
    if (specialization) doctor.specialization = specialization;
    if (bmdcNumber) doctor.bmdcNumber = bmdcNumber;
    if (experience) doctor.experience = experience;
    if (qualification) doctor.qualification = qualification;
    if (department) doctor.department = department;
    if (schedule) doctor.schedule = schedule;
    if (phone) doctor.phone = phone;
    if (address) doctor.address = address;

    await doctor.save();

    const updatedDoctor = await userModel
      .findById(doctorId)
      .select("-password");

    res.status(200).send({
      success: true,
      message: "Doctor profile updated successfully",
      user: updatedDoctor,
    });
  } catch (error) {
    console.error("Error in updateDoctorProfileController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};
