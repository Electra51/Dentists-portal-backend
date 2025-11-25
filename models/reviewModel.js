// models/reviewModel.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
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

    // Appointment Reference
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
    },

    // Rating (1-5 stars)
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Detailed Ratings (Optional)
    detailedRating: {
      professionalism: {
        type: Number,
        min: 1,
        max: 5,
        default: 0,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
        default: 0,
      },
      facilities: {
        type: Number,
        min: 1,
        max: 5,
        default: 0,
      },
      waitTime: {
        type: Number,
        min: 1,
        max: 5,
        default: 0,
      },
      overallExperience: {
        type: Number,
        min: 1,
        max: 5,
        default: 0,
      },
    },

    // Review Content
    title: {
      type: String,
      default: "",
      maxlength: 100,
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    // Recommendation
    wouldRecommend: {
      type: Boolean,
      default: true,
    },

    // Treatment/Service
    treatmentReceived: {
      type: String,
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
    },

    // Moderation
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    moderationNote: {
      type: String,
      default: "",
    },

    // Doctor Response
    doctorResponse: {
      type: String,
      default: "",
      maxlength: 500,
    },
    doctorRespondedAt: {
      type: Date,
      default: null,
    },

    // Helpful votes
    helpfulCount: {
      type: Number,
      default: 0,
    },
    notHelpfulCount: {
      type: Number,
      default: 0,
    },

    // Verified Review (patient actually had appointment)
    isVerified: {
      type: Boolean,
      default: true,
    },

    // Visibility
    isVisible: {
      type: Boolean,
      default: true,
    },

    // Report/Flag
    isReported: {
      type: Boolean,
      default: false,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    reportReasons: [
      {
        reason: String,
        reportedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster queries
reviewSchema.index({ doctorId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ patientId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isVisible: 1 });

// Calculate average rating for doctor (Virtual)
reviewSchema.statics.calculateDoctorRating = async function (doctorId) {
  const reviews = await this.find({
    doctorId,
    status: "approved",
    isVisible: true,
  });

  if (reviews.length === 0) return { avgRating: 0, totalReviews: 0 };

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRating / reviews.length;

  return {
    avgRating: parseFloat(avgRating.toFixed(1)),
    totalReviews: reviews.length,
  };
};

export default mongoose.model("reviews", reviewSchema);
