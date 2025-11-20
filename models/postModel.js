import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ratingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    value: { type: Number, required: true }, // Assuming a rating scale of 1-5
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "love", "funny", "wow", "angry"],
      required: true,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    users: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tags",
      },
    ],
    status: [
      {
        type: String,
        enum: ["Trending", "Featured", "Reject", "Pending"],
      },
    ],
    image: {
      type: String,
    },
    featuredImage: {
      type: String,
    },
    comments: [commentSchema], // Array of comments
    ratings: [ratingSchema], // Array of ratings
    averageRating: { type: Number, default: 0 }, // Calculated average rating
    reactions: [reactionSchema],

    shareCount: {
      type: Number,
      default: 0, // Tracks how many times the post has been shared
    },

    sharedUsers: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Posts", postSchema);
