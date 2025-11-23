import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ========== EXISTING FIELDS ==========
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String },
    googleId: { type: String },
    nickname: { type: String },
    profileImage: {
      type: String,
      default: "",
    },
    role: {
      type: Number,
      default: 0, // 0 = patients, 1 = doctor, 2 = Admin
    },

    // ========== NEW FIELDS FOR PATIENT (role: 0) ==========
    phone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    emergencyContact: {
      type: String,
      default: "",
    },

    // Medical History
    allergies: {
      type: String,
      default: "",
    },
    chronicConditions: {
      type: String,
      default: "",
    },
    currentMedications: {
      type: String,
      default: "",
    },

    // ========== NEW FIELDS FOR DENTIST (role: 1) ==========

    specialization: {
      type: String,
      default: "",
    },
    bmdcNumber: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      default: "",
    },
    qualification: {
      type: String,
      default: "",
    },
    department: {
      type: String,
      default: "",
    },
    schedule: {
      type: String,
      default: "",
    },

    // ========== VERIFICATION FIELDS (for Dentist) ==========
    verificationStatus: {
      type: String,
      enum: ["not_requested", "pending", "approved", "rejected"],
      default: "not_requested",
    },
    verificationRequestDate: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Rejection reason too long"],
    },
    // ========== NEW FIELDS FOR ADMIN (role: 2) ==========

    employeeId: {
      type: String,
      default: "",
    },
    joinDate: {
      type: Date,
      default: null,
    },
    accessLevel: {
      type: String,
      default: "",
    },
    permissions: {
      type: String,
      default: "",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("users", userSchema);
