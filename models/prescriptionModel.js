import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    // ✅ Prescription ID - Unique identifier
    prescriptionId: {
      type: String,
      unique: true,
    },

    // ✅ Patient Information
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
    },

    // ✅ Doctor Information
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
    },
    doctorSpecialization: {
      type: String,
      default: "",
    },

    // ✅ Appointment Reference
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
      index: true,
    },

    // ✅ Medicines List
    medicines: [
      {
        medicineName: {
          type: String,
          required: true,
        },
        dosage: {
          type: String,
          required: true,
        },
        frequency: {
          type: String,
          required: true,
        },
        duration: {
          type: String,
          required: true,
        },
        instructions: {
          type: String,
          default: "",
        },
      },
    ],

    // ✅ General Instructions
    generalInstructions: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    // ✅ Next Visit Date
    nextVisit: {
      type: Date,
      default: null,
    },

    // ✅ Status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    // ✅ Diagnosis (Optional - can be added later)
    diagnosis: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // ✅ Audit Trail
    auditLog: [
      {
        action: {
          type: String,
          required: true,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ✅ Pre-save hook to generate prescriptionId
prescriptionSchema.pre("save", async function (next) {
  if (this.isNew && !this.prescriptionId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("prescriptions").countDocuments();
    this.prescriptionId = `PRX-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// ✅ Indexes for faster queries
prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });
prescriptionSchema.index({ appointmentId: 1 });
prescriptionSchema.index({ prescriptionId: 1 });

export default mongoose.model("prescriptions", prescriptionSchema);
