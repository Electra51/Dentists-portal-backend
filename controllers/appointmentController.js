// controllers/appointmentController.js
import Appointment from "../models/appointmentModel.js";
import User from "../models/userModel.js";

// ============================================
// Helper: Check Profile Completion
// ============================================
const isProfileComplete = (user) => {
  const requiredFields = [
    "allergies",
    "chronicConditions",
    "currentMedications",
    "dateOfBirth",
    "bloodGroup",
  ];

  return requiredFields.every((field) => {
    const value = user[field];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value && value.toString().trim() !== "";
  });
};

// ============================================
// 1. Get Available Slots for a Doctor on a Specific Date
// ============================================
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and date are required",
      });
    }

    // Get doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 1) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get day name from date
    const dayName = new Date(date)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    // Get doctor's schedule for that day
    const daySchedule = doctor.schedule?.schedule?.[dayName];

    if (!daySchedule || !daySchedule.isAvailable) {
      return res.status(200).json({
        success: true,
        data: {
          date,
          slots: [],
          message: "Doctor is not available on this day",
        },
      });
    }

    // Generate all possible slots
    const duration = parseInt(doctor.settings?.appointmentDuration || 30);
    const allSlots = [];

    daySchedule.slots.forEach((slot) => {
      const [startHour, startMin] = slot.start.split(":").map(Number);
      const [endHour, endMin] = slot.end.split(":").map(Number);

      let currentHour = startHour;
      let currentMin = startMin;

      while (
        currentHour < endHour ||
        (currentHour === endHour && currentMin < endMin)
      ) {
        const timeStr = `${String(currentHour).padStart(2, "0")}:${String(
          currentMin
        ).padStart(2, "0")}`;
        allSlots.push(timeStr);

        currentMin += duration;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    });

    // Get booked appointments for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ["scheduled", "confirmed"] },
    });

    // Get booked time slots
    const bookedSlots = bookedAppointments.map((apt) => apt.appointmentTime24);

    // Filter available slots
    const availableSlots = allSlots
      .filter((slot) => !bookedSlots.includes(slot))
      .map((slot) => {
        const [hour, min] = slot.split(":").map(Number);
        const period = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return {
          value: slot,
          display: `${hour12}:${String(min).padStart(2, "0")} ${period}`,
          isAvailable: true,
        };
      });

    res.status(200).json({
      success: true,
      data: {
        date,
        totalSlots: allSlots.length,
        bookedSlots: bookedSlots.length,
        availableSlots: availableSlots.length,
        slots: availableSlots,
      },
    });
  } catch (error) {
    console.error("Error in getAvailableSlots:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 2. Create New Appointment
// ============================================
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      appointmentTime,
      appointmentTime24,
      service,
      patientNotes,
      patientInfo, // { name, phone, email }
    } = req.body;

    // Validation
    if (
      !doctorId ||
      !appointmentDate ||
      !appointmentTime ||
      !appointmentTime24 ||
      !service
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!patientInfo?.name || !patientInfo?.phone) {
      return res.status(400).json({
        success: false,
        message: "Patient name and phone are required",
      });
    }

    // Check if user is logged in
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Please login to book an appointment",
      });
    }

    const patientId = req.user._id;

    // Check profile completion
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    if (!isProfileComplete(patient)) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete your profile before booking an appointment. Required: Allergies, Chronic Conditions, Current Medications, Date of Birth, and Blood Group",
        profileIncomplete: true,
      });
    }

    // Get doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 1) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if slot is still available
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      appointmentTime24,
      status: { $in: ["scheduled", "confirmed"] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // Create appointment with new schema
    const appointment = new Appointment({
      patientId,
      patientInfo: {
        name: patientInfo.name,
        email: patientInfo.email || patient.email || "",
        phone: patientInfo.phone,
      },
      doctorId,
      doctorName: doctor.name,
      doctorSpecialization: doctor.specialization || "",
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      appointmentTime24,
      duration: parseInt(doctor.settings?.appointmentDuration || 30),
      service,
      patientNotes: patientNotes || "",
      status: "scheduled",

      // Payment details
      payment: {
        consultationFee: parseInt(doctor.settings?.consultationFee || 500),
        paymentMethod: "cash",
        paymentStatus: "pending",
      },

      // Audit log entry
      auditLog: [
        {
          action: "created",
          performedBy: patientId,
          note: "Appointment booked by patient",
        },
      ],
    });

    await appointment.save();

    // Populate doctor info for response
    await appointment.populate(
      "doctorId",
      "name profileImage specialization phone"
    );

    res.status(201).json({
      success: true,
      message:
        "Appointment booked successfully! You will receive a confirmation message via SMS/Email.",
      data: {
        appointment,
        bookingId: appointment.bookingId,
        paymentInfo: {
          amount: appointment.payment.consultationFee,
          method: "cash",
          note: "Please pay cash at the clinic after consultation",
        },
      },
    });
  } catch (error) {
    console.error("Error in createAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 3. Get Patient's Appointments
// ============================================
export const getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { status } = req.query;

    const query = { patientId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate("doctorId", "name profileImage specialization phone email")
      .sort({ appointmentDate: -1, appointmentTime24: -1 });

    // Add payment summary
    const paymentSummary = {
      total: appointments.length,
      pending: appointments.filter((a) => a.payment.paymentStatus === "pending")
        .length,
      paid: appointments.filter((a) => a.payment.paymentStatus === "paid")
        .length,
      totalAmount: appointments.reduce(
        (sum, a) => sum + a.payment.consultationFee,
        0
      ),
      paidAmount: appointments
        .filter((a) => a.payment.paymentStatus === "paid")
        .reduce((sum, a) => sum + a.payment.paidAmount, 0),
    };

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
      paymentSummary,
    });
  } catch (error) {
    console.error("Error in getPatientAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 4. Get Doctor's Appointments
// ============================================
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { status, date } = req.query;

    const query = { doctorId };

    if (status) {
      query.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(query)
      .populate("patientId", "name profileImage phone email")
      .sort({ appointmentDate: 1, appointmentTime24: 1 });

    // Payment summary for doctor
    const paymentSummary = {
      total: appointments.length,
      completed: appointments.filter((a) => a.status === "completed").length,
      paymentPending: appointments.filter(
        (a) => a.status === "completed" && a.payment.paymentStatus === "pending"
      ).length,
      paid: appointments.filter((a) => a.payment.paymentStatus === "paid")
        .length,
      totalRevenue: appointments
        .filter((a) => a.payment.paymentStatus === "paid")
        .reduce((sum, a) => sum + a.payment.paidAmount, 0),
      pendingAmount: appointments
        .filter(
          (a) =>
            a.status === "completed" && a.payment.paymentStatus === "pending"
        )
        .reduce((sum, a) => sum + a.payment.consultationFee, 0),
    };

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
      paymentSummary,
    });
  } catch (error) {
    console.error("Error in getDoctorAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 5. Get Single Appointment Details
// ============================================
export const getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "name profileImage phone email")
      .populate("doctorId", "name profileImage specialization phone email");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    const isPatient =
      appointment.patientId._id.toString() === userId.toString();
    const isDoctor = appointment.doctorId._id.toString() === userId.toString();

    if (!isPatient && !isDoctor && req.user.role !== 2) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Error in getAppointmentDetails:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 6. Complete Appointment (Doctor Only)
// ============================================
export const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { doctorNotes } = req.body;
    const doctorId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Appointment already completed",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot complete a cancelled appointment",
      });
    }

    // Use helper method from model
    await appointment.completeAppointment(doctorId, doctorNotes);

    await appointment.populate("patientId", "name phone email");

    res.status(200).json({
      success: true,
      message: "Appointment marked as completed",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in completeAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 7. Mark Payment as Received (Doctor Only)
// ============================================
export const markPaymentReceived = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { amount, note } = req.body;
    const doctorId = req.user._id;

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.payment.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already received",
      });
    }

    // Use helper method from model
    await appointment.markAsPaid(
      doctorId,
      amount || appointment.payment.consultationFee,
      note || "Cash payment received"
    );

    await appointment.populate("patientId", "name phone email");

    res.status(200).json({
      success: true,
      message: "Payment marked as received",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in markPaymentReceived:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 8. Cancel Appointment
// ============================================
export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    const isPatient = appointment.patientId.toString() === userId.toString();
    const isDoctor = appointment.doctorId.toString() === userId.toString();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this appointment",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Appointment already cancelled",
      });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a completed appointment",
      });
    }

    const cancelledBy = isPatient ? "patient" : "doctor";

    // Use helper method from model
    await appointment.cancelAppointment(userId, reason, cancelledBy);

    await appointment.populate("patientId", "name phone email");
    await appointment.populate("doctorId", "name phone email");

    res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in cancelAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// 9. Update Appointment Status (Legacy - for backward compatibility)
// ============================================
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, cancellationReason, doctorNotes } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check authorization
    const isPatient = appointment.patientId.toString() === userId.toString();
    const isDoctor = appointment.doctorId.toString() === userId.toString();

    if (!isPatient && !isDoctor && req.user.role !== 2) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this appointment",
      });
    }

    // Handle different status updates
    if (status === "cancelled") {
      const cancelledBy = isPatient
        ? "patient"
        : req.user.role === 2
        ? "admin"
        : "doctor";
      await appointment.cancelAppointment(
        userId,
        cancellationReason || "No reason provided",
        cancelledBy
      );
    } else if (status === "completed" && isDoctor) {
      await appointment.completeAppointment(userId, doctorNotes);
    } else {
      appointment.status = status;
      appointment.auditLog.push({
        action: status,
        performedBy: userId,
        note: `Status updated to ${status}`,
      });
      await appointment.save();
    }

    await appointment.populate("patientId", "name phone email");
    await appointment.populate("doctorId", "name phone email");

    res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully`,
      data: appointment,
    });
  } catch (error) {
    console.error("Error in updateAppointmentStatus:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
