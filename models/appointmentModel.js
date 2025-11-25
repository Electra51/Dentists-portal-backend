// // models/appointmentModel.js
// import mongoose from "mongoose";

// const appointmentSchema = new mongoose.Schema(
//   {
//     // Patient Information
//     patientId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "users",
//       required: true,
//     },
//     patientName: {
//       type: String,
//       required: true,
//     },
//     patientEmail: {
//       type: String,
//       required: true,
//     },
//     patientPhone: {
//       type: String,
//       required: true,
//     },

//     // Doctor Information
//     doctorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "users",
//       required: true,
//     },
//     doctorName: {
//       type: String,
//       required: true,
//     },
//     doctorSpecialization: {
//       type: String,
//       default: "",
//     },

//     // Appointment Details
//     appointmentDate: {
//       type: Date,
//       required: true,
//     },
//     appointmentTime: {
//       type: String, // "10:00 AM", "02:30 PM"
//       required: true,
//     },
//     duration: {
//       type: Number, // in minutes
//       default: 30,
//     },

//     // Service Details
//     service: {
//       type: String,
//       enum: [
//         "Teeth Orthodontics",
//         "Cosmetic Dentistry",
//         "Teeth Cleaning",
//         "Cavity Protection",
//         "Pediatric Dental",
//         "Oral Surgery",
//         "General Checkup",
//         "Root Canal",
//         "Teeth Whitening",
//         "Dental Implants",
//         "Other",
//       ],
//       required: true,
//     },
//     serviceDescription: {
//       type: String,
//       default: "",
//     },

//     // Status
//     status: {
//       type: String,
//       enum: ["pending", "confirmed", "completed", "cancelled", "no-show"],
//       default: "pending",
//     },

//     // Cancellation
//     cancellationReason: {
//       type: String,
//       default: "",
//     },
//     cancelledBy: {
//       type: String,
//       enum: ["patient", "doctor", "admin", ""],
//       default: "",
//     },
//     cancelledAt: {
//       type: Date,
//       default: null,
//     },

//     // Patient Notes (from patient during booking)
//     patientNotes: {
//       type: String,
//       default: "",
//       maxlength: 500,
//     },

//     // Doctor Notes (after appointment)
//     doctorNotes: {
//       type: String,
//       default: "",
//       maxlength: 1000,
//     },

//     // Symptoms
//     symptoms: {
//       type: [String],
//       default: [],
//     },

//     // Follow-up
//     isFollowUp: {
//       type: Boolean,
//       default: false,
//     },
//     previousAppointmentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "appointments",
//       default: null,
//     },
//     nextAppointmentDate: {
//       type: Date,
//       default: null,
//     },

//     // Payment
//     consultationFee: {
//       type: Number,
//       default: 0,
//     },
//     isPaid: {
//       type: Boolean,
//       default: false,
//     },
//     paymentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "payments",
//       default: null,
//     },

//     // Notifications
//     reminderSent: {
//       type: Boolean,
//       default: false,
//     },
//     confirmationSent: {
//       type: Boolean,
//       default: false,
//     },

//     // Ratings (after appointment)
//     isRated: {
//       type: Boolean,
//       default: false,
//     },
//     reviewId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "reviews",
//       default: null,
//     },
//   },
//   { timestamps: true }
// );

// // Index for faster queries
// appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
// appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
// appointmentSchema.index({ status: 1 });

// export default mongoose.model("appointments", appointmentSchema);

// models/appointmentModel.js
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
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
    patientEmail: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
      required: true,
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
      default: "",
    },

    // Appointment Details
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String, // "10:00 AM", "02:30 PM"
      required: true,
    },
    // ✅ ADD THIS - Time in 24hr format for easier comparison
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
      enum: [
        "General Consultation",
        "Braces & Aligners",
        "Teeth Whitening",
        "Dental Cleaning",
        "Orthodontic Treatment",
        "Teeth Orthodontics",
        "Cosmetic Dentistry",
        "Cavity Protection",
        "Pediatric Dental",
        "Oral Surgery",
        "General Checkup",
        "Root Canal",
        "Dental Implants",
        "Other",
      ],
      required: true,
    },
    serviceDescription: {
      type: String,
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no-show"],
      default: "pending",
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

    // Payment
    consultationFee: {
      type: Number,
      default: 0,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "payments",
      default: null,
    },

    // Notifications
    reminderSent: {
      type: Boolean,
      default: false,
    },
    confirmationSent: {
      type: Boolean,
      default: false,
    },

    // Ratings (after appointment)
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
  { timestamps: true }
);

// Index for faster queries
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });
// ✅ ADD THIS - For checking slot availability
appointmentSchema.index({
  doctorId: 1,
  appointmentDate: 1,
  appointmentTime24: 1,
});

export default mongoose.model("appointments", appointmentSchema);
