// export default mongoose.model("reviews", reviewSchema);
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Matches your User model export
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users", // Matches your User model export
    required: true,
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "appointments", // ✅ Change from "Appointment" to "appointments"
    required: false,
    default: null,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isVerifiedPatient: {
    type: Boolean,
    default: false,
  },
  isReviewSubmitted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("reviews", reviewSchema);
