import userModel from "../models/userModel.js";

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
