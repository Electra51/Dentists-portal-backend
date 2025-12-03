import Prescription from "../models/prescriptionModel.js";
import Appointment from "../models/appointmentModel.js";
import User from "../models/userModel.js";

// ✅ Create Prescription (Doctor creates after appointment)
export const createPrescription = async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      appointmentId,
      medicines,
      generalInstructions,
      nextVisit,
      diagnosis,
    } = req.body;

    // ✅ Validation
    if (!patientId || !appointmentId || !medicines || medicines.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).send({
        success: false,
        message: "Appointment not found",
      });
    }

    // ✅ Get doctor details
    const doctor = await User.findById(req.user._id);
    if (!doctor) {
      return res.status(404).send({
        success: false,
        message: "Doctor not found",
      });
    }

    // ✅ Check if logged-in doctor owns this appointment
    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(401).send({
        success: false,
        message: "Unauthorized to create prescription for this appointment",
      });
    }

    // ✅ Check if prescription already exists
    const existingPrescription = await Prescription.findOne({ appointmentId });
    if (existingPrescription) {
      return res.status(400).send({
        success: false,
        message: "Prescription already exists for this appointment",
      });
    }

    // ✅ Create prescription
    const prescription = new Prescription({
      patientId,
      patientName,
      doctorId: req.user._id,
      doctorName: doctor.name,
      doctorSpecialization: doctor.specialization || "",
      appointmentId,
      medicines,
      generalInstructions: generalInstructions || "",
      nextVisit: nextVisit || null,
      diagnosis: diagnosis || "",
    });

    await prescription.save();

    // ✅ Update appointment
    appointment.prescriptionGiven = true;
    await appointment.save();

    res.status(201).send({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).send({
      success: false,
      message: "Error creating prescription",
      error: error.message,
    });
  }
};

// ✅ Get All Prescriptions by Patient ID
export const getPrescriptionsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    // ✅ Validate patientId
    if (!patientId || patientId === "undefined" || patientId === "null") {
      return res.status(400).json({
        success: false,
        message: "Valid patient ID is required",
      });
    }

    // Check authorization
    if (req.user.role === 0 && req.user._id.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view these prescriptions",
      });
    }

    const prescriptions = await Prescription.find({ patientId })
      .populate("patientId", "name email phone bloodGroup")
      .populate("doctorId", "name specialization profileImage")
      .populate("appointmentId", "bookingId appointmentDate appointmentTime")
      .sort({ createdAt: -1 })
      .lean(); // ✅ .lean() add করুন - এটা plain JavaScript object return করবে

    // ✅ Transform data - populate failed হলে fallback use করুন
    const transformedPrescriptions = prescriptions.map((prescription) => {
      return {
        ...prescription,
        // Populate না থাকলে original field use করুন
        patientName:
          prescription.patientId?.name ||
          prescription.patientName ||
          "Unknown Patient",
        doctorName:
          prescription.doctorId?.name ||
          prescription.doctorName ||
          "Unknown Doctor",
        doctorSpecialization:
          prescription.doctorId?.specialization ||
          prescription.doctorSpecialization ||
          "N/A",
      };
    });

    res.status(200).json({
      success: true,
      count: transformedPrescriptions.length,
      data: transformedPrescriptions,
    });
  } catch (error) {
    console.error("Get prescriptions by patient error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
      error: error.message,
    });
  }
};

// ✅ Fixed: Get All Prescriptions by Doctor
export const getPrescriptionsByDoctor = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const prescriptions = await Prescription.find({ doctorId })
      .populate("patientId", "name email phone bloodGroup")
      .populate({
        path: "appointmentId",
        select: "bookingId appointmentDate appointmentTime status",
        // ✅ Add lean() to avoid virtual property issues
      })
      .lean() // ✅ This will return plain JavaScript objects without virtuals
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions,
    });
  } catch (error) {
    console.error("Get prescriptions by doctor error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
      error: error.message,
    });
  }
};

// ✅ Get Single Prescription by ID
export const getPrescriptionById = async (req, res) => {
  try {
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findById(prescriptionId)
      .populate("patientId", "name email phone bloodGroup address dateOfBirth")
      .populate("doctorId", "name specialization qualification bmdcNumber")
      .populate(
        "appointmentId",
        "bookingId appointmentDate appointmentTime service"
      );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check authorization
    const isPatient =
      req.user._id.toString() === prescription.patientId._id.toString();
    const isDoctor =
      req.user._id.toString() === prescription.doctorId._id.toString();
    const isAdmin = req.user.role === 2;

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to view this prescription",
      });
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    console.error("Get prescription by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescription",
      error: error.message,
    });
  }
};

// ✅ Get Prescriptions by Appointment ID
export const getPrescriptionsByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const prescriptions = await Prescription.find({ appointmentId })
      .populate("patientId", "name email phone")
      .populate("doctorId", "name specialization")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions,
    });
  } catch (error) {
    console.error("Get prescriptions by appointment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch prescriptions",
      error: error.message,
    });
  }
};

// ✅ Update Prescription
export const updatePrescription = async (req, res) => {
  try {
    const doctorId = req.user._id; // ✅ Use _id
    const { prescriptionId } = req.params;
    const { medicines, generalInstructions, nextVisit, diagnosis, status } =
      req.body;

    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // Check if doctor owns this prescription
    if (prescription.doctorId.toString() !== doctorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this prescription",
      });
    }

    // Update fields
    if (medicines) prescription.medicines = medicines;
    if (generalInstructions !== undefined)
      prescription.generalInstructions = generalInstructions;
    if (nextVisit !== undefined) prescription.nextVisit = nextVisit;
    if (diagnosis !== undefined) prescription.diagnosis = diagnosis;
    if (status) prescription.status = status;

    // Add to audit log
    prescription.auditLog.push({
      action: "updated",
      performedBy: doctorId,
      note: "Prescription updated",
    });

    await prescription.save();

    await prescription.populate("patientId", "name email phone");
    await prescription.populate("doctorId", "name specialization");

    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: prescription,
    });
  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update prescription",
      error: error.message,
    });
  }
};

// ✅ Delete Prescription
export const deletePrescription = async (req, res) => {
  try {
    const doctorId = req.user._id; // ✅ Use _id
    const { prescriptionId } = req.params;

    const prescription = await Prescription.findById(prescriptionId);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    if (prescription.doctorId.toString() !== doctorId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this prescription",
      });
    }

    // Soft delete
    prescription.status = "cancelled";
    prescription.auditLog.push({
      action: "cancelled",
      performedBy: doctorId,
      note: "Prescription cancelled",
    });

    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Prescription cancelled successfully",
    });
  } catch (error) {
    console.error("Delete prescription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete prescription",
      error: error.message,
    });
  }
};

// ✅ Get Prescription Statistics
export const getPrescriptionStats = async (req, res) => {
  try {
    const doctorId = req.user._id; // ✅ Use _id

    const total = await Prescription.countDocuments({ doctorId });
    const active = await Prescription.countDocuments({
      doctorId,
      status: "active",
    });
    const completed = await Prescription.countDocuments({
      doctorId,
      status: "completed",
    });

    const recent = await Prescription.find({ doctorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("patientId", "name")
      .populate("appointmentId", "appointmentDate");

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        completed,
        recent,
      },
    });
  } catch (error) {
    console.error("Get prescription stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};
