// controllers/appointmentController.js
import Appointment from "../models/appointmentModel.js";
import User from "../models/userModel.js";

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
      status: { $in: ["pending", "confirmed"] },
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

    // Get doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 1) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Get patient details (if logged in)
    const patientId = req.user?._id || null; // Assuming auth middleware sets req.user

    // Check if slot is still available
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      appointmentTime24,
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // Create appointment
    const appointment = new Appointment({
      patientId: patientId || null,
      patientName: patientInfo.name,
      patientEmail: patientInfo.email || "",
      patientPhone: patientInfo.phone,
      doctorId,
      doctorName: doctor.name,
      doctorSpecialization: doctor.specialization,
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      appointmentTime24,
      duration: parseInt(doctor.settings?.appointmentDuration || 30),
      service,
      patientNotes: patientNotes || "",
      consultationFee: parseInt(doctor.settings?.consultationFee || 500),
      status: "pending",
    });

    await appointment.save();

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: appointment,
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
    const patientId = req.user._id; // From auth middleware
    const { status } = req.query; // Filter by status (optional)

    const query = { patientId };
    if (status) {
      query.status = status;
    }

    const appointments = await Appointment.find(query)
      .populate("doctorId", "name profileImage specialization phone")
      .sort({ appointmentDate: -1, appointmentTime24: -1 });

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
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
    const doctorId = req.user._id; // From auth middleware
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

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
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
// 5. Update Appointment Status
// ============================================
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, cancellationReason } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    appointment.status = status;

    if (status === "cancelled") {
      appointment.cancellationReason = cancellationReason || "";
      appointment.cancelledBy = req.user.role === 0 ? "patient" : "doctor";
      appointment.cancelledAt = new Date();
    }

    await appointment.save();

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

// ============================================
// 6. Get Single Appointment Details
// ============================================
export const getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId", "name profileImage specialization phone email")
      .populate("patientId", "name profileImage phone email");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
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
