import reviewModel from "../models/reviewModel.js";
import userModel from "../models/userModel.js";
import appointmentModel from "../models/appointmentModel.js";

// Patient review submit korbe (appointment complete hole)

export const submitReview = async (req, res) => {
  try {
    const { doctorId, appointmentId, rating, comment } = req.body;
    const patientId = req.user._id;
    // DEBUG: Check if patientId exists
    console.log("Patient ID from req.userId:", patientId);
    console.log("Full req.user:", req.user);
    // Validation - appointmentId optional
    if (!doctorId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID, rating and comment are required",
      });
    }

    // Appointment ID thakle validate koro
    if (appointmentId) {
      const appointment = await appointmentModel.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      if (appointment.status !== "completed") {
        return res.status(400).json({
          success: false,
          message: "You can only review completed appointments",
        });
      }

      if (appointment.userId.toString() !== patientId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to review this appointment",
        });
      }

      const existingReview = await reviewModel.findOne({
        appointment: appointmentId,
      });
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "Review already submitted for this appointment",
        });
      }
    } else {
      // General review check
      const existingReview = await reviewModel.findOne({
        patient: patientId,
        doctor: doctorId,
        appointment: null,
      });
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this doctor",
        });
      }
    }

    // Check if doctor exists - ROLE NUMBER (1) CHECK KORO
    const doctor = await userModel.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found in database",
      });
    }

    // Role 1 = doctor check koro (Number comparison)
    if (doctor.role !== 1) {
      return res.status(400).json({
        success: false,
        message: `User found but role is ${doctor.role}, not doctor (role: 1)`,
      });
    }

    // Create review
    const newReview = new reviewModel({
      patient: patientId,
      doctor: doctorId,
      appointment: appointmentId || undefined, // null na pathale, undefined pathao ba field e include koro na
      rating,
      comment,
      isVerifiedPatient: !!appointmentId,
      isReviewSubmitted: true,
      status: "pending",
    });

    await newReview.save();

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully. Awaiting approval.",
      review: newReview,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: error.message,
    });
  }
};

// Specific doctor er reviews fetch
export const getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status = "approved" } = req.query;

    // Check if doctor exists
    const doctor = await userModel.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Fetch reviews
    const reviews = await reviewModel
      .find({
        doctor: doctorId,
        status: status,
      })
      .populate("patient", "name image")
      .populate("appointment", "date slotTime")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return res.status(200).json({
      success: true,
      totalReviews: reviews.length,
      averageRating: averageRating.toFixed(1),
      ratingDistribution,
      reviews,
    });
  } catch (error) {
    console.error("Get doctor reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// Admin er jonno all reviews (all status) fetch
export const getAllReviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch reviews with pagination
    const reviews = await reviewModel
      .find(query)
      .populate("patient", "name profileImage email")
      .populate("doctor", "name speciality profileImage")
      .populate({
        path: "appointment",
        select: "date slotTime status",
        model: "appointments", // Explicitly specify the model name
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalReviews = await reviewModel.countDocuments(query);

    // Calculate stats
    const stats = {
      total: await reviewModel.countDocuments(),
      pending: await reviewModel.countDocuments({ status: "pending" }),
      approved: await reviewModel.countDocuments({ status: "approved" }),
      rejected: await reviewModel.countDocuments({ status: "rejected" }),
    };

    return res.status(200).json({
      success: true,
      reviews,
      stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / parseInt(limit)),
        totalReviews,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};
// Admin review approve/reject korbe
export const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status } = req.body; // "approved" or "rejected"

    // Validation
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'",
      });
    }

    // Find and update review
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.status = status;
    await review.save();

    return res.status(200).json({
      success: true,
      message: `Review ${status} successfully`,
      review,
    });
  } catch (error) {
    console.error("Moderate review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to moderate review",
      error: error.message,
    });
  }
};

// Patient tar own reviews dekhbe
export const getMyReviews = async (req, res) => {
  try {
    const patientId = req.userId; // Auth middleware theke asbe

    const reviews = await reviewModel
      .find({ patient: patientId })
      .populate("doctor", "name speciality image fees")
      .populate("appointment", "date slotTime status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      totalReviews: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error("Get my reviews error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your reviews",
      error: error.message,
    });
  }
};

// Patient review edit korbe
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const patientId = req.userId;

    // Validation
    if (!rating && !comment) {
      return res.status(400).json({
        success: false,
        message: "Provide at least rating or comment to update",
      });
    }

    // Find review
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if review belongs to this patient
    if (review.patient.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to edit this review",
      });
    }

    // Update fields
    if (rating) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      review.rating = rating;
    }
    if (comment) review.comment = comment;

    // Reset to pending if approved review is edited
    if (review.status === "approved") {
      review.status = "pending";
    }

    await review.save();

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update review",
      error: error.message,
    });
  }
};

// Patient review delete korbe
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const patientId = req.userId;

    // Find review
    const review = await reviewModel.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Check if review belongs to this patient
    if (review.patient.toString() !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this review",
      });
    }

    await reviewModel.findByIdAndDelete(reviewId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};
