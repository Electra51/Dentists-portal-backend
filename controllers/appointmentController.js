import appointmentModel from "../models/appointmentModel.js";
import prescriptionModel from "../models/prescriptionModel.js";
import userModel from "../models/userModel.js";

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
// 1. Get Available Slots for a Doctor
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

    const doctor = await userModel.findById(doctorId).lean().exec();
    if (!doctor || doctor.role !== 1) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    if (doctor.verificationStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "This doctor is not currently accepting appointments",
      });
    }

    const dayName = new Date(date)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

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

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await appointmentModel
      .find({
        doctorId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["scheduled", "confirmed", "follow-up"] },
      })
      .select("appointmentTime24")
      .lean()
      .exec();

    const bookedSlots = bookedAppointments.map((apt) => apt.appointmentTime24);

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
        doctorName: doctor.name,
        specialization: doctor.specialization,
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
// 2. Create New Appointment (Patient Only)
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
      patientInfo,
    } = req.body;

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

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Please login to book an appointment",
      });
    }

    const patientId = req.user._id;

    const patient = await userModel.findById(patientId);
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

    const doctor = await userModel.findById(doctorId);
    if (!doctor || doctor.role !== 1) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await appointmentModel.findOne({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      appointmentTime24,
      status: { $in: ["scheduled", "confirmed", "follow-up"] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    const appointment = new appointmentModel({
      patientId,
      patientInfo: {
        name: patientInfo.name,
        email: patientInfo.email || patient.email || "",
        phone: patientInfo.phone,
        profileImage: patient.profileImage || "",
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
      payment: {
        consultationFee: parseInt(doctor.settings?.consultationFee || 500),
        paymentMethod: "cash",
        paymentStatus: "pending",
      },
      auditLog: [
        {
          action: "created",
          performedBy: patientId,
          note: "Appointment booked by patient",
        },
      ],
    });

    await appointment.save();
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
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Please login to view appointments",
      });
    }

    const patientId = req.user._id;
    const { status } = req.query;

    const query = { patientId };
    if (status && status !== "all") {
      query.status = status;
    }

    const appointments = await appointmentModel
      .find(query)
      .populate("doctorId", "name profileImage specialization phone email")
      .sort({ appointmentDate: -1, appointmentTime24: -1 })
      .lean()
      .exec();

    const paymentSummary = {
      total: appointments.length,
      scheduled: appointments.filter((a) => a.status === "scheduled").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      followUp: appointments.filter((a) => a.status === "follow-up").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      totalAmount: appointments.reduce(
        (sum, a) => sum + (a.payment?.consultationFee || 0),
        0
      ),
      paidAmount: appointments
        .filter((a) => a.payment?.paymentStatus === "paid")
        .reduce((sum, a) => sum + (a.payment?.paidAmount || 0), 0),
      pendingAmount: appointments
        .filter((a) => a.payment?.paymentStatus === "pending")
        .reduce((sum, a) => sum + (a.payment?.consultationFee || 0), 0),
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
      message: "Failed to fetch appointments",
      error: error.message,
    });
  }
};

// ============================================
// 4. Get Doctor's Appointments
// ============================================
// export const getDoctorAppointments = async (req, res) => {
//   try {
//     const doctorId = req.user._id;
//     const { status, date } = req.query;

//     const query = { doctorId };

//     if (status && status !== "all") {
//       query.status = status;
//     }

//     if (date) {
//       const startOfDay = new Date(date);
//       startOfDay.setHours(0, 0, 0, 0);
//       const endOfDay = new Date(date);
//       endOfDay.setHours(23, 59, 59, 999);
//       query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
//     }

//     const appointments = await appointmentModel
//       .find(query)
//       .populate("patientId", "name profileImage phone email bloodGroup")
//       .sort({ appointmentDate: 1, appointmentTime24: 1 });

//     const paymentSummary = {
//       total: appointments.length,
//       scheduled: appointments.filter((a) => a.status === "scheduled").length,
//       confirmed: appointments.filter((a) => a.status === "confirmed").length,
//       completed: appointments.filter((a) => a.status === "completed").length,
//       followUp: appointments.filter((a) => a.status === "follow-up").length,
//       noShow: appointments.filter((a) => a.status === "no-show").length,
//       paymentPending: appointments.filter(
//         (a) => a.status === "completed" && a.payment.paymentStatus === "pending"
//       ).length,
//       paid: appointments.filter((a) => a.payment.paymentStatus === "paid")
//         .length,
//       totalRevenue: appointments
//         .filter((a) => a.payment.paymentStatus === "paid")
//         .reduce((sum, a) => sum + a.payment.paidAmount, 0),
//       pendingAmount: appointments
//         .filter(
//           (a) =>
//             a.status === "completed" && a.payment.paymentStatus === "pending"
//         )
//         .reduce((sum, a) => sum + a.payment.consultationFee, 0),
//     };

//     res.status(200).json({
//       success: true,
//       count: appointments.length,
//       data: appointments,
//       paymentSummary,
//     });
//   } catch (error) {
//     console.error("Error in getDoctorAppointments:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { status, date } = req.query;

    const query = { doctorId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await appointmentModel
      .find(query)
      .populate("patientId", "name profileImage phone email bloodGroup")
      .sort({ appointmentDate: 1, appointmentTime24: 1 })
      .lean(); // ✅ lean() add koren to modify easily

    // ✅ Get all appointment IDs
    const appointmentIds = appointments.map((apt) => apt._id);

    // ✅ Fetch all prescriptions for these appointments
    const prescriptions = await prescriptionModel
      .find({ appointmentId: { $in: appointmentIds } })
      .select("_id prescriptionId status createdAt nextVisit appointmentId")
      .lean();

    // ✅ Create a map for quick lookup
    const prescriptionMap = {};
    prescriptions.forEach((prescription) => {
      prescriptionMap[prescription.appointmentId.toString()] = prescription;
    });

    // ✅ Add prescription to each appointment
    const appointmentsWithPrescription = appointments.map((appointment) => ({
      ...appointment,
      prescription: prescriptionMap[appointment._id.toString()] || null,
    }));

    const paymentSummary = {
      total: appointments.length,
      scheduled: appointments.filter((a) => a.status === "scheduled").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      followUp: appointments.filter((a) => a.status === "follow-up").length,
      noShow: appointments.filter((a) => a.status === "no-show").length,
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
      count: appointmentsWithPrescription.length,
      data: appointmentsWithPrescription, // ✅ Updated data with prescriptions
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
// 5. Get Archived Appointments (Doctor Only)
// ============================================
export const getArchivedAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Get archived and no-show appointments
    const appointments = await appointmentModel
      .find({
        doctorId,
        status: { $in: ["archived", "no-show"] },
      })
      .populate("patientId", "name profileImage phone email bloodGroup")
      .sort({ appointmentDate: -1, appointmentTime24: -1 })
      .lean()
      .exec();

    const summary = {
      total: appointments.length,
      archived: appointments.filter((a) => a.status === "archived").length,
      noShow: appointments.filter((a) => a.status === "no-show").length,
    };

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
      summary,
    });
  } catch (error) {
    console.error("Error in getArchivedAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch archived appointments",
      error: error.message,
    });
  }
};

// ============================================
// 6. Get Single Appointment Details
// ============================================
// export const getAppointmentDetails = async (req, res) => {
//   try {
//     const { appointmentId } = req.params;
//     const userId = req.user._id;

//     const appointment = await appointmentModel
//       .findById(appointmentId)
//       .populate(
//         "patientId",
//         "name profileImage phone email bloodGroup dateOfBirth address allergies chronicConditions currentMedications"
//       )
//       .populate("doctorId", "name profileImage specialization phone email")
//       .populate("previousAppointmentId", "appointmentDate status doctorNotes")
//       .populate("prescription")
//       .lean()
//       .exec();

//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         message: "Appointment not found",
//       });
//     }

//     const isPatient =
//       appointment.patientId._id.toString() === userId.toString();
//     const isDoctor = appointment.doctorId._id.toString() === userId.toString();
//     const isAdmin = req.user.role === 2;

//     if (!isPatient && !isDoctor && !isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: "Not authorized to view this appointment",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: appointment,
//     });
//   } catch (error) {
//     console.error("Error in getAppointmentDetails:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch appointment details",
//       error: error.message,
//     });
//   }
// };
export const getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const appointment = await appointmentModel
      .findById(appointmentId)
      .populate(
        "patientId",
        "name profileImage phone email bloodGroup dateOfBirth address allergies chronicConditions currentMedications"
      )
      .populate("doctorId", "name profileImage specialization phone email")
      .populate("previousAppointmentId", "appointmentDate status doctorNotes")
      .lean()
      .exec();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const isPatient =
      appointment.patientId._id.toString() === userId.toString();
    const isDoctor = appointment.doctorId._id.toString() === userId.toString();
    const isAdmin = req.user.role === 2;

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this appointment",
      });
    }

    // ✅ Check if prescription exists for this appointment
    const prescription = await prescriptionModel
      .findOne({ appointmentId: appointmentId })
      .select("_id prescriptionId status createdAt nextVisit")
      .lean();

    // ✅ Add prescription to appointment object
    appointment.prescription = prescription;

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Error in getAppointmentDetails:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch appointment details",
      error: error.message,
    });
  }
};
// ============================================
// 7. Confirm Appointment (Doctor Only)
// ============================================
export const confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorId = req.user._id;

    const appointment = await appointmentModel.findOne({
      _id: appointmentId,
      doctorId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled appointments can be confirmed",
      });
    }

    appointment.status = "confirmed";
    appointment.auditLog.push({
      action: "confirmed",
      performedBy: doctorId,
      note: "Appointment confirmed by doctor",
    });

    await appointment.save();
    await appointment.populate("patientId", "name phone email");

    res.status(200).json({
      success: true,
      message: "Appointment confirmed successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in confirmAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to confirm appointment",
      error: error.message,
    });
  }
};

// ============================================
// 8. Complete Appointment (Doctor Only)
// ============================================
export const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const {
      doctorNotes,
      createFollowUp,
      followUpDate,
      followUpTime,
      followUpTime24,
    } = req.body;
    const doctorId = req.user._id;

    const appointment = await appointmentModel.findOne({
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

    // Update current appointment
    appointment.status = "completed";
    appointment.doctorNotes = doctorNotes || "";

    appointment.auditLog.push({
      action: "completed",
      performedBy: doctorId,
      note: "Appointment completed by doctor",
    });

    await appointment.save();

    let followUpAppointment = null;

    // Create follow-up appointment if requested
    if (createFollowUp && followUpDate && followUpTime && followUpTime24) {
      const doctor = await userModel.findById(doctorId);

      followUpAppointment = new appointmentModel({
        patientId: appointment.patientId,
        patientInfo: appointment.patientInfo,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctorName,
        doctorSpecialization: appointment.doctorSpecialization,
        appointmentDate: new Date(followUpDate),
        appointmentTime: followUpTime,
        appointmentTime24: followUpTime24,
        duration: appointment.duration,
        service: appointment.service,
        status: "follow-up",
        isFollowUp: true,
        previousAppointmentId: appointment._id,
        payment: {
          consultationFee: parseInt(doctor.settings?.consultationFee || 500),
          paymentMethod: "cash",
          paymentStatus: "pending",
        },
        auditLog: [
          {
            action: "created",
            performedBy: doctorId,
            note: "Follow-up appointment created by doctor",
          },
        ],
      });

      await followUpAppointment.save();

      // Update original appointment with follow-up reference
      appointment.nextAppointmentDate = new Date(followUpDate);
      await appointment.save();
    }

    await appointment.populate("patientId", "name phone email");

    res.status(200).json({
      success: true,
      message: followUpAppointment
        ? "Appointment completed and follow-up scheduled"
        : "Appointment marked as completed",
      data: {
        appointment,
        followUpAppointment,
      },
    });
  } catch (error) {
    console.error("Error in completeAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete appointment",
      error: error.message,
    });
  }
};

// ============================================
// 9. Mark as No-Show (Doctor Only)
// ============================================
export const markAsNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const doctorId = req.user._id;

    const appointment = await appointmentModel.findOne({
      _id: appointmentId,
      doctorId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed appointments can be marked as no-show",
      });
    }

    appointment.status = "no-show";
    appointment.cancellationReason = reason || "Patient did not show up";
    appointment.auditLog.push({
      action: "no-show",
      performedBy: doctorId,
      note: reason || "Patient did not show up",
    });

    await appointment.save();
    await appointment.populate("patientId", "name phone email");

    res.status(200).json({
      success: true,
      message: "Appointment marked as no-show",
      data: appointment,
    });
  } catch (error) {
    console.error("Error in markAsNoShow:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark as no-show",
      error: error.message,
    });
  }
};

// ============================================
// 10. Archive Expired Appointments (Cron Job / Manual)
// ============================================
export const archiveExpiredAppointments = async (req, res) => {
  try {
    const now = new Date();

    // Find all scheduled appointments with expired dates
    const expiredAppointments = await appointmentModel.find({
      status: "scheduled",
      appointmentDate: { $lt: now },
    });

    let archivedCount = 0;

    for (const appointment of expiredAppointments) {
      appointment.status = "archived";
      appointment.auditLog.push({
        action: "archived",
        performedBy: req.user?._id || appointment.doctorId,
        note: "Automatically archived - appointment date expired",
      });
      await appointment.save();
      archivedCount++;
    }

    res.status(200).json({
      success: true,
      message: `${archivedCount} expired appointments archived`,
      archivedCount,
    });
  } catch (error) {
    console.error("Error in archiveExpiredAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive expired appointments",
      error: error.message,
    });
  }
};

// ============================================
// 11. Mark Payment as Received (Doctor Only)
// ============================================
export const markPaymentReceived = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { amount, note } = req.body;
    const doctorId = req.user._id;

    const appointment = await appointmentModel.findOne({
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
      message: "Failed to mark payment",
      error: error.message,
    });
  }
};

// ============================================
// 12. Cancel Appointment (Patient Only)
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

    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Only patient can cancel
    const isPatient = appointment.patientId.toString() === userId.toString();

    if (!isPatient) {
      return res.status(403).json({
        success: false,
        message: "Only patients can cancel appointments",
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

    await appointment.cancelAppointment(userId, reason, "patient");

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
      message: "Failed to cancel appointment",
      error: error.message,
    });
  }
};

// ============================================
// 13. Delete Appointment (Doctor/Admin Only)
// ============================================
export const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const appointment = await appointmentModel
      .findById(appointmentId)
      .select("patientId doctorId status appointmentDate appointmentTime")
      .lean()
      .exec();

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    const isDoctor = appointment.doctorId.toString() === userId.toString();
    const isAdmin = req.user.role === 2;

    if (!isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this appointment",
      });
    }

    if (
      appointment.status !== "cancelled" &&
      appointment.status !== "completed" &&
      appointment.status !== "archived" &&
      appointment.status !== "no-show"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only cancelled, completed, archived, or no-show appointments can be deleted",
      });
    }

    await appointmentModel.findByIdAndDelete(appointmentId);

    res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete appointment",
      error: error.message,
    });
  }
};

// ==================== GET ALL APPOINTMENTS (ADMIN) ====================
export const getAllAppointments = async (req, res) => {
  try {
    const { status, date, startDate, endDate, doctorId, patientId } = req.query;

    const query = {};

    // Status filter
    if (status && status !== "all") {
      query.status = status;
    }

    // Specific date filter
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    // Date range filter
    if (startDate || endDate) {
      query.appointmentDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.appointmentDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.appointmentDate.$lte = end;
      }
    }

    // Filter by doctor
    if (doctorId && doctorId !== "all") {
      query.doctorId = doctorId;
    }

    // Filter by patient
    if (patientId && patientId !== "all") {
      query.patientId = patientId;
    }

    const appointments = await appointmentModel
      .find(query)
      .populate("patientId", "name profileImage phone email bloodGroup")
      .populate("doctorId", "name profileImage specialization department")
      .sort({ appointmentDate: -1, appointmentTime24: -1 })
      .lean();

    // ✅ Get all appointment IDs
    const appointmentIds = appointments.map((apt) => apt._id);

    // ✅ Fetch all prescriptions for these appointments
    const prescriptions = await prescriptionModel
      .find({ appointmentId: { $in: appointmentIds } })
      .select("_id prescriptionId status createdAt nextVisit appointmentId")
      .lean();

    // ✅ Create a map for quick lookup
    const prescriptionMap = {};
    prescriptions.forEach((prescription) => {
      prescriptionMap[prescription.appointmentId.toString()] = prescription;
    });

    // ✅ Add prescription to each appointment
    const appointmentsWithPrescription = appointments.map((appointment) => ({
      ...appointment,
      prescription: prescriptionMap[appointment._id.toString()] || null,
    }));

    // ✅ Statistics Summary
    const statistics = {
      total: appointments.length,
      scheduled: appointments.filter((a) => a.status === "scheduled").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      archived: appointments.filter((a) => a.status === "archived").length,
      followUp: appointments.filter((a) => a.status === "follow-up").length,
      noShow: appointments.filter((a) => a.status === "no-show").length,

      // Payment Statistics
      totalRevenue: appointments
        .filter((a) => a.payment.paymentStatus === "paid")
        .reduce((sum, a) => sum + a.payment.paidAmount, 0),
      pendingAmount: appointments
        .filter((a) => a.payment.paymentStatus === "pending")
        .reduce((sum, a) => sum + a.payment.consultationFee, 0),
      paid: appointments.filter((a) => a.payment.paymentStatus === "paid")
        .length,
      paymentPending: appointments.filter(
        (a) => a.payment.paymentStatus === "pending"
      ).length,
    };

    res.status(200).json({
      success: true,
      count: appointmentsWithPrescription.length,
      data: appointmentsWithPrescription,
      statistics,
    });
  } catch (error) {
    console.error("Error in getAllAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== DELETE ARCHIVED APPOINTMENT (ADMIN ONLY) ====================
export const deleteArchivedAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    // ✅ Find appointment
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // ✅ Check if appointment is archived
    if (appointment.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Only archived appointments can be deleted",
        currentStatus: appointment.status,
      });
    }

    // ✅ Delete associated prescriptions (if any)
    await prescriptionModel.deleteMany({ appointmentId: appointment._id });

    // ✅ Delete appointment
    await appointmentModel.findByIdAndDelete(appointmentId);

    res.status(200).json({
      success: true,
      message: "Archived appointment and related data deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteArchivedAppointment:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ==================== BULK DELETE ARCHIVED APPOINTMENTS (ADMIN) ====================
export const bulkDeleteArchivedAppointments = async (req, res) => {
  try {
    const { appointmentIds } = req.body;

    if (
      !appointmentIds ||
      !Array.isArray(appointmentIds) ||
      appointmentIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of appointment IDs",
      });
    }

    // ✅ Find all archived appointments
    const appointments = await appointmentModel.find({
      _id: { $in: appointmentIds },
      status: "archived",
    });

    if (appointments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No archived appointments found with provided IDs",
      });
    }

    const archivedIds = appointments.map((apt) => apt._id);

    // ✅ Delete associated prescriptions
    await prescriptionModel.deleteMany({ appointmentId: { $in: archivedIds } });

    // ✅ Delete appointments
    const deleteResult = await appointmentModel.deleteMany({
      _id: { $in: archivedIds },
    });

    res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} archived appointments deleted successfully`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error("Error in bulkDeleteArchivedAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
