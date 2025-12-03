import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    // unique identifier for appointment
    bookingId: {
      type: String,
      unique: true,
    },

    // patient info
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    patientInfo: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      profileImage: {
        type: String,
        default: "",
      },
    },

    // dentist info
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
      default: "",
    },

    // appointment
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String, // "10:00 AM", "02:30 PM"
      required: true,
    },
    appointmentTime24: {
      type: String, // "10:00", "14:30"
      required: true,
    },
    duration: {
      type: Number, // in minutes
      default: 30,
    },

    // Service Details
    service: {
      type: String,
      default: "",
      required: true,
    },
    serviceDescription: {
      type: String,
      default: "",
    },
    prescription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "prescriptions",
      default: null,
    },
    // Status
    status: {
      type: String,
      enum: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no-show",
        "follow-up",
        "archived",
      ],
      default: "scheduled",
    },

    // Cancellation
    cancellationReason: {
      type: String,
      default: "",
    },
    cancelledBy: {
      type: String,
      enum: ["patient", "doctor", "admin", ""],
      default: "",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },

    // Patient Notes (reason for visit)
    patientNotes: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Doctor Notes (after appointment)
    doctorNotes: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    // Symptoms
    symptoms: {
      type: [String],
      default: [],
    },

    // Follow-up
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    previousAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointments",
      default: null,
    },
    nextAppointmentDate: {
      type: Date,
      default: null,
    },

    // ✅ UPDATED PAYMENT SECTION - Cash Payment Support
    payment: {
      consultationFee: {
        type: Number,
        required: true,
        default: 0,
      },

      paymentMethod: {
        type: String,
        enum: ["cash", "bkash", "card"],
        default: "cash",
      },

      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "refunded"],
        default: "pending",
      },

      // ✅ When doctor marks as paid
      paidAt: {
        type: Date,
        default: null,
      },

      paidAmount: {
        type: Number,
        default: 0,
      },

      // ✅ Doctor can add payment note
      paymentNote: {
        type: String,
        default: "",
        maxlength: 200,
      },

      // ✅ Who marked as paid (doctor/admin)
      markedPaidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null,
      },

      // For future online payment
      transactionId: {
        type: String,
        default: "",
      },

      // Reference to payment collection (if needed later)
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "payments",
        default: null,
      },
    },

    // Notifications
    notifications: {
      confirmationSent: {
        type: Boolean,
        default: false,
      },
      confirmationSentAt: {
        type: Date,
        default: null,
      },
      reminderSent: {
        type: Boolean,
        default: false,
      },
      reminderSentAt: {
        type: Date,
        default: null,
      },
    },

    // Ratings (after appointment)
    rating: {
      isRated: {
        type: Boolean,
        default: false,
      },
      reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "reviews",
        default: null,
      },
    },

    // ✅ Audit Trail
    auditLog: [
      {
        action: {
          type: String, // "created", "confirmed", "completed", "paid", "cancelled"
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

// ✅ Pre-save hook to generate bookingId
appointmentSchema.pre("save", async function (next) {
  if (this.isNew && !this.bookingId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model("appointments").countDocuments();
    this.bookingId = `APT-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// ✅ Method to mark payment as received
appointmentSchema.methods.markAsPaid = function (userId, amount, note = "") {
  this.payment.paymentStatus = "paid";
  this.payment.paidAt = new Date();
  this.payment.paidAmount = amount;
  this.payment.paymentNote = note;
  this.payment.markedPaidBy = userId;

  // Add to audit log
  this.auditLog.push({
    action: "paid",
    performedBy: userId,
    note: `Cash payment received: ${amount}`,
  });

  return this.save();
};

// ✅ Method to complete appointment
appointmentSchema.methods.completeAppointment = function (
  userId,
  doctorNotes = ""
) {
  this.status = "completed";
  this.doctorNotes = doctorNotes;

  this.auditLog.push({
    action: "completed",
    performedBy: userId,
    note: "Appointment completed",
  });

  return this.save();
};

// ✅ Method to cancel appointment
appointmentSchema.methods.cancelAppointment = function (
  userId,
  reason,
  cancelledBy
) {
  this.status = "cancelled";
  this.cancellationReason = reason;
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();

  this.auditLog.push({
    action: "cancelled",
    performedBy: userId,
    note: `Cancelled by ${cancelledBy}: ${reason}`,
  });

  return this.save();
};

// Indexes for faster queries
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ "payment.paymentStatus": 1 });
appointmentSchema.index({ bookingId: 1 });
appointmentSchema.index({
  doctorId: 1,
  appointmentDate: 1,
  appointmentTime24: 1,
});

// ✅ Compound index for payment tracking
appointmentSchema.index({
  doctorId: 1,
  "payment.paymentStatus": 1,
  status: 1,
});

export default mongoose.model("appointments", appointmentSchema);
