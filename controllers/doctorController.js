// controllers/doctorController.js
import userModel from "../models/userModel.js";
import appointmentModel from "../models/appointmentModel.js";
import prescriptionModel from "../models/prescriptionModel.js";
import reviewModel from "../models/reviewModel.js";
import paymentModel from "../models/paymentModel.js";

// ==================== DASHBOARD ====================
// Doctor er dashboard statistics
export const getDoctorDashboardController = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Total appointments
    const totalAppointments = await appointmentModel.countDocuments({
      doctorId,
    });

    // Today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAppointments = await appointmentModel.countDocuments({
      doctorId,
      appointmentDate: { $gte: today, $lt: tomorrow },
    });

    // Upcoming appointments (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingAppointments = await appointmentModel.countDocuments({
      doctorId,
      appointmentDate: { $gte: today, $lte: nextWeek },
      status: "confirmed",
    });

    // Total patients
    const totalPatients = await appointmentModel.distinct("patientId", {
      doctorId,
    });

    // Total reviews and average rating
    const reviews = await reviewModel.find({ doctorId });
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // This month's earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEarnings = await paymentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          createdAt: { $gte: startOfMonth },
          status: "completed",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Recent appointments
    const recentAppointments = await appointmentModel
      .find({ doctorId })
      .populate("patientId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).send({
      success: true,
      data: {
        totalAppointments,
        todayAppointments,
        upcomingAppointments,
        totalPatients: totalPatients.length,
        totalReviews: reviews.length,
        avgRating: avgRating.toFixed(1),
        monthlyEarnings: monthlyEarnings[0]?.total || 0,
        recentAppointments,
      },
    });
  } catch (error) {
    console.error("Error in getDoctorDashboardController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== PUBLIC ROUTES ====================
// Get all verified dentists for public view
export const getAllVerifiedDentistsController = async (req, res) => {
  try {
    const { search, specialization, department, sortBy } = req.query;

    let query = {
      role: 1,
      verificationStatus: "approved",
    };

    // Filter by specialization
    if (specialization && specialization !== "all") {
      query.specialization = specialization;
    }

    // Filter by department
    if (department && department !== "all") {
      query.department = department;
    }

    let dentists = await userModel
      .find(query)
      .select(
        "-password -googleId -emergencyContact -allergies -chronicConditions -currentMedications"
      );

    // Search by name, specialization, department
    if (search) {
      dentists = dentists.filter(
        (dentist) =>
          dentist.name?.toLowerCase().includes(search.toLowerCase()) ||
          dentist.specialization
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          dentist.department?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Add review statistics for each dentist
    const dentistsWithStats = await Promise.all(
      dentists.map(async (dentist) => {
        const reviews = await reviewModel.find({ doctorId: dentist._id });
        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        const totalPatients = await appointmentModel.distinct("patientId", {
          doctorId: dentist._id,
        });

        return {
          ...dentist.toObject(),
          avgRating: avgRating.toFixed(1),
          totalReviews: reviews.length,
          totalPatients: totalPatients.length,
        };
      })
    );

    // Sort dentists
    if (sortBy === "rating") {
      dentistsWithStats.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sortBy === "experience") {
      dentistsWithStats.sort(
        (a, b) => parseInt(b.experience) - parseInt(a.experience)
      );
    } else if (sortBy === "reviews") {
      dentistsWithStats.sort((a, b) => b.totalReviews - a.totalReviews);
    }

    res.status(200).send({
      success: true,
      count: dentistsWithStats.length,
      data: dentistsWithStats,
    });
  } catch (error) {
    console.error("Error in getAllVerifiedDentistsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single dentist details for public view
export const getDentistDetailsController = async (req, res) => {
  try {
    const { dentistId } = req.params;

    const dentist = await userModel
      .findOne({ _id: dentistId, role: 1, verificationStatus: "approved" })
      .select("-password -googleId");

    if (!dentist) {
      return res.status(404).send({
        success: false,
        message: "Dentist not found",
      });
    }

    // Get reviews
    const reviews = await reviewModel
      .find({ doctorId: dentistId })
      .populate("patientId", "name profileImage")
      .sort({ createdAt: -1 })
      .limit(10);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    // Get total patients
    const totalPatients = await appointmentModel.distinct("patientId", {
      doctorId: dentistId,
    });

    // Get available slots for next 7 days
    const availableSlots = dentist.schedule || {};

    res.status(200).send({
      success: true,
      data: {
        dentist,
        avgRating: avgRating.toFixed(1),
        totalReviews: reviews.length,
        ratingDistribution,
        totalPatients: totalPatients.length,
        reviews,
        availableSlots,
      },
    });
  } catch (error) {
    console.error("Error in getDentistDetailsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== APPOINTMENTS ====================
// Get doctor's all appointments with filters
export const getDoctorAppointmentsController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { date, status, search } = req.query;

    let query = { doctorId };

    // Filter by date
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      query.appointmentDate = { $gte: selectedDate, $lt: nextDay };
    }

    // Filter by status
    if (status && status !== "all") {
      query.status = status; // confirmed, pending, completed, cancelled
    }

    const appointments = await appointmentModel
      .find(query)
      .populate("patientId", "name email phone bloodGroup")
      .sort({ appointmentDate: -1, appointmentTime: 1 });

    // Search by patient name
    let filteredAppointments = appointments;
    if (search) {
      filteredAppointments = appointments.filter((apt) =>
        apt.patientId?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).send({
      success: true,
      count: filteredAppointments.length,
      data: filteredAppointments,
    });
  } catch (error) {
    console.error("Error in getDoctorAppointmentsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single appointment details
export const getAppointmentDetailsController = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user._id;

    const appointment = await appointmentModel
      .findOne({ _id: appointmentId, doctorId })
      .populate("patientId", "name email phone bloodGroup age address");

    if (!appointment) {
      return res.status(404).send({
        success: false,
        message: "Appointment not found",
      });
    }

    res.status(200).send({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Error in getAppointmentDetailsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update appointment status
export const updateAppointmentStatusController = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body; // confirmed, completed, cancelled
    const doctorId = req.user._id;

    const appointment = await appointmentModel.findOne({
      _id: appointmentId,
      doctorId,
    });

    if (!appointment) {
      return res.status(404).send({
        success: false,
        message: "Appointment not found",
      });
    }

    appointment.status = status;
    await appointment.save();

    res.status(200).send({
      success: true,
      message: "Appointment status updated successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in updateAppointmentStatusController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to update appointment status",
      error: error.message,
    });
  }
};

// ==================== PATIENTS ====================
// Get doctor's all patients
export const getDoctorPatientsController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { search, bloodGroup } = req.query;

    // Get unique patient IDs from appointments
    const patientIds = await appointmentModel.distinct("patientId", {
      doctorId,
    });

    let query = { _id: { $in: patientIds }, role: 0 };

    // Filter by blood group
    if (bloodGroup && bloodGroup !== "all") {
      query.bloodGroup = bloodGroup;
    }

    let patients = await userModel.find(query).select("-password");

    // Search by name, email, phone
    if (search) {
      patients = patients.filter(
        (patient) =>
          patient.name?.toLowerCase().includes(search.toLowerCase()) ||
          patient.email?.toLowerCase().includes(search.toLowerCase()) ||
          patient.phone?.includes(search)
      );
    }

    // Get appointment count for each patient
    const patientsWithAppointments = await Promise.all(
      patients.map(async (patient) => {
        const appointmentCount = await appointmentModel.countDocuments({
          doctorId,
          patientId: patient._id,
        });

        const lastAppointment = await appointmentModel
          .findOne({ doctorId, patientId: patient._id })
          .sort({ createdAt: -1 });

        return {
          ...patient.toObject(),
          appointmentCount,
          lastVisit: lastAppointment?.appointmentDate || null,
        };
      })
    );

    res.status(200).send({
      success: true,
      count: patientsWithAppointments.length,
      data: patientsWithAppointments,
    });
  } catch (error) {
    console.error("Error in getDoctorPatientsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single patient details with history
export const getPatientDetailsByDoctorController = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user._id;

    const patient = await userModel
      .findOne({ _id: patientId, role: 0 })
      .select("-password");

    if (!patient) {
      return res.status(404).send({
        success: false,
        message: "Patient not found",
      });
    }

    // Get patient's appointments with this doctor
    const appointments = await appointmentModel
      .find({ doctorId, patientId })
      .sort({ appointmentDate: -1 });

    // Get prescriptions
    const prescriptions = await prescriptionModel
      .find({ doctorId, patientId })
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      data: {
        patient,
        appointments,
        prescriptions,
      },
    });
  } catch (error) {
    console.error("Error in getPatientDetailsByDoctorController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== PRESCRIPTIONS ====================
// Get all prescriptions by doctor
export const getDoctorPrescriptionsController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { search, startDate, endDate } = req.query;

    let query = { doctorId };

    // Filter by date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const prescriptions = await prescriptionModel
      .find(query)
      .populate("patientId", "name email phone age")
      .populate("appointmentId", "appointmentDate")
      .sort({ createdAt: -1 });

    // Search by patient name
    let filteredPrescriptions = prescriptions;
    if (search) {
      filteredPrescriptions = prescriptions.filter((pres) =>
        pres.patientId?.name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.status(200).send({
      success: true,
      count: filteredPrescriptions.length,
      data: filteredPrescriptions,
    });
  } catch (error) {
    console.error("Error in getDoctorPrescriptionsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create new prescription
export const createPrescriptionController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const {
      patientId,
      appointmentId,
      diagnosis,
      medicines,
      tests,
      advice,
      nextVisit,
    } = req.body;

    const prescription = new prescriptionModel({
      doctorId,
      patientId,
      appointmentId,
      diagnosis,
      medicines, // [{ name, dosage, frequency, duration }]
      tests, // [{ name, description }]
      advice,
      nextVisit,
    });

    await prescription.save();

    res.status(201).send({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Error in createPrescriptionController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to create prescription",
      error: error.message,
    });
  }
};

// ==================== SCHEDULE ====================
// Get doctor's schedule
export const getDoctorScheduleController = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const doctor = await userModel.findById(doctorId).select("schedule");

    res.status(200).send({
      success: true,
      data: doctor.schedule || {},
    });
  } catch (error) {
    console.error("Error in getDoctorScheduleController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update doctor's schedule
export const updateDoctorScheduleController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { schedule } = req.body;
    // schedule format: { monday: { isAvailable: true, slots: [{start: "10:00", end: "11:00"}] }, ... }

    const doctor = await userModel.findById(doctorId);

    if (!doctor) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    doctor.schedule = schedule;
    await doctor.save();

    res.status(200).send({
      success: true,
      message: "Schedule updated successfully",
      data: doctor.schedule,
    });
  } catch (error) {
    console.error("Error in updateDoctorScheduleController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to update schedule",
      error: error.message,
    });
  }
};

// ==================== REVIEWS ====================
// Get doctor's all reviews
export const getDoctorReviewsController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { rating } = req.query; // filter by rating

    let query = { doctorId };

    if (rating && rating !== "all") {
      query.rating = parseInt(rating);
    }

    const reviews = await reviewModel
      .find(query)
      .populate("patientId", "name email")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    res.status(200).send({
      success: true,
      count: reviews.length,
      avgRating: avgRating.toFixed(1),
      ratingDistribution,
      data: reviews,
    });
  } catch (error) {
    console.error("Error in getDoctorReviewsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== PAYMENTS ====================
// Get doctor's payment history
export const getDoctorPaymentsController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { status, startDate, endDate } = req.query;

    let query = { doctorId };

    // Filter by status
    if (status && status !== "all") {
      query.status = status; // pending, completed, failed
    }

    // Filter by date range
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await paymentModel
      .find(query)
      .populate("patientId", "name email")
      .populate("appointmentId", "appointmentDate service")
      .sort({ createdAt: -1 });

    // Calculate total earnings
    const totalEarnings = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0);

    // This month earnings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyEarnings = payments
      .filter((p) => p.status === "completed" && p.createdAt >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).send({
      success: true,
      count: payments.length,
      totalEarnings,
      monthlyEarnings,
      data: payments,
    });
  } catch (error) {
    console.error("Error in getDoctorPaymentsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== PROFILE ====================
// Get doctor's profile
export const getDoctorProfileController = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const doctor = await userModel.findById(doctorId).select("-password");

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
    console.error("Error in getDoctorProfileController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update doctor's profile
export const updateDoctorProfileController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const {
      name,
      phone,
      address,
      specialization,
      bmdcNumber,
      experience,
      qualification,
      department,
      consultationFee,
      bio,
    } = req.body;

    const doctor = await userModel.findById(doctorId);

    if (!doctor) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    // Update fields
    if (name) doctor.name = name;
    if (phone) doctor.phone = phone;
    if (address) doctor.address = address;
    if (specialization) doctor.specialization = specialization;
    if (bmdcNumber) doctor.bmdcNumber = bmdcNumber;
    if (experience) doctor.experience = experience;
    if (qualification) doctor.qualification = qualification;
    if (department) doctor.department = department;
    if (consultationFee) doctor.consultationFee = consultationFee;
    if (bio) doctor.bio = bio;

    await doctor.save();

    res.status(200).send({
      success: true,
      message: "Profile updated successfully",
      data: doctor,
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

// ==================== SETTINGS ====================
// Get doctor settings
export const getDoctorSettingsController = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const doctor = await userModel
      .findById(doctorId)
      .select("settings notifications");

    res.status(200).send({
      success: true,
      data: doctor,
    });
  } catch (error) {
    console.error("Error in getDoctorSettingsController:", error);
    res.status(500).send({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update doctor settings
export const updateDoctorSettingsController = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { settings, notifications } = req.body;

    const doctor = await userModel.findById(doctorId);

    if (!doctor) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    if (settings) doctor.settings = { ...doctor.settings, ...settings };
    if (notifications)
      doctor.notifications = { ...doctor.notifications, ...notifications };

    await doctor.save();

    res.status(200).send({
      success: true,
      message: "Settings updated successfully",
      data: { settings: doctor.settings, notifications: doctor.notifications },
    });
  } catch (error) {
    console.error("Error in updateDoctorSettingsController:", error);
    res.status(500).send({
      success: false,
      message: "Failed to update settings",
      error: error.message,
    });
  }
};
