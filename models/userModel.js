import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
    password: {
      type: String,
      required: true,
    },
    nickname: { type: String },
    profileImage: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false, // Default to false for authors
    },
    role: {
      type: Number,
      default: 0, // 0 = Normal User, 1 = Author, 2 = Admin
    },
  },
  { timestamps: true }
);

export default mongoose.model("users", userSchema);
