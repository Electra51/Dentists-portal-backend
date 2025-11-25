// models/prescriptionModel.js
import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "Tablet",
      "Capsule",
      "Syrup",
      "Injection",
      "Ointment",
      "Drops",
      "Other",
    ],
    default: "Tablet",
  },
  dosage: {
    type: String, // "500mg", "10ml"
    required: true,
  },
  frequency: {
    type: String, // "1+0+1", "1+1+1", "0+0+1"
    required: true,
  },
  timing: {
    type: String,
    enum: [
      "Before meal",
      "After meal",
      "With meal",
      "Empty stomach",
      "As needed",
    ],
    default: "After meal",
  },
  duration: {
    type: String, // "7 days", "2 weeks", "1 month"
    required: true,
  },
  instructions: {
    type: String,
    default: "",
  },
});

const testSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  urgency: {
    type: String,
    enum: ["Normal", "Urgent", "Very Urgent"],
    default: "Normal",
  },
  instructions: {
    type: String,
    default: "",
  },
});

const prescriptionSchema = new mongoose.Schema(
  {
    // Prescription Number (auto-generated)
    prescriptionNumber: {
      type: String,
      unique: true,
    },

    // Patient Information
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },
    patientAge: {
      type: Number,
    },
    patientGender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    patientBloodGroup: {
      type: String,
    },

    // Doctor Information
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    doctorName: {
      type: String,
      required: true,
    },
    doctorSpecialization: {
      type: String,
    },
    doctorBMDC: {
      type: String,
    },

    // Appointment Reference
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointments",
      default: null,
    },

    // Medical Details
    chiefComplaints: {
      type: String, // Main problem/symptoms
      default: "",
    },
    diagnosis: {
      type: String,
      required: true,
    },
    vitalSigns: {
      bloodPressure: { type: String, default: "" },
      temperature: { type: String, default: "" },
      pulse: { type: String, default: "" },
      weight: { type: String, default: "" },
      height: { type: String, default: "" },
    },

    // Medicines
    medicines: [medicineSchema],

    // Tests/Investigations
    tests: [testSchema],

    // Advice/Instructions
    advice: {
      type: String,
      default: "",
    },
    dietaryInstructions: {
      type: String,
      default: "",
    },
    lifestyleAdvice: {
      type: String,
      default: "",
    },

    // Follow-up
    nextVisit: {
      type: Date,
      default: null,
    },
    followUpInstructions: {
      type: String,
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    // Notes
    doctorNotes: {
      type: String, // Private notes (not shown to patient)
      default: "",
    },

    // Digital Signature
    isDigitallySigned: {
      type: Boolean,
      default: true,
    },
    signedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Auto-generate prescription number
prescriptionSchema.pre("save", async function (next) {
  if (!this.prescriptionNumber) {
    const count = await mongoose.model("prescriptions").countDocuments();
    const year = new Date().getFullYear();
    this.prescriptionNumber = `RX-${year}-${String(count + 1).padStart(
      6,
      "0"
    )}`;
  }
  next();
});

// Index for faster queries
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionNumber: 1 });

export default mongoose.model("prescriptions", prescriptionSchema);
