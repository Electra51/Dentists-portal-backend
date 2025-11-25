// models/paymentModel.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // Transaction ID (auto-generated)
    transactionId: {
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

    // Appointment Reference
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "appointments",
      required: true,
    },

    // Payment Details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "BDT",
    },

    // Service Details
    service: {
      type: String,
      required: true,
    },
    serviceDescription: {
      type: String,
      default: "",
    },

    // Payment Method
    paymentMethod: {
      type: String,
      enum: [
        "Cash",
        "Credit Card",
        "Debit Card",
        "bKash",
        "Nagad",
        "Rocket",
        "Bank Transfer",
        "Online Payment",
        "Insurance",
        "Other",
      ],
      required: true,
    },

    // Payment Gateway Info (if online payment)
    paymentGateway: {
      type: String,
      enum: ["SSLCommerz", "bKash", "Nagad", "Stripe", "PayPal", ""],
      default: "",
    },
    gatewayTransactionId: {
      type: String,
      default: "",
    },
    gatewayPaymentId: {
      type: String,
      default: "",
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
      ],
      default: "pending",
    },

    // Payment Breakdown
    breakdown: {
      consultationFee: {
        type: Number,
        default: 0,
      },
      serviceFee: {
        type: Number,
        default: 0,
      },
      medicinesCost: {
        type: Number,
        default: 0,
      },
      testsCost: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      tax: {
        type: Number,
        default: 0,
      },
      platformFee: {
        type: Number,
        default: 0,
      },
    },

    // Discount/Coupon
    discountCode: {
      type: String,
      default: "",
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },

    // Dates
    paidAt: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },

    // Refund
    isRefunded: {
      type: Boolean,
      default: false,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: {
      type: String,
      default: "",
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundTransactionId: {
      type: String,
      default: "",
    },

    // Invoice
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    invoiceUrl: {
      type: String,
      default: "",
    },

    // Receipt
    receiptNumber: {
      type: String,
      default: "",
    },
    receiptUrl: {
      type: String,
      default: "",
    },

    // Notes
    paymentNotes: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },

    // Billing Address
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "Bangladesh" },
    },

    // Payment Attempts
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },

    // Error Info (if failed)
    errorCode: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },

    // Notification
    receiptSent: {
      type: Boolean,
      default: false,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },

    // Settlement (for doctor payment)
    isSettled: {
      type: Boolean,
      default: false,
    },
    settledAmount: {
      type: Number,
      default: 0,
    },
    settledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate transaction ID and invoice number
paymentSchema.pre("save", async function (next) {
  if (!this.transactionId) {
    const count = await mongoose.model("payments").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    this.transactionId = `TXN-${year}${month}-${String(count + 1).padStart(
      6,
      "0"
    )}`;
  }

  if (this.status === "completed" && !this.invoiceNumber) {
    const count = await mongoose.model("payments").countDocuments({
      status: "completed",
    });
    const year = new Date().getFullYear();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }

  if (this.status === "completed" && !this.paidAt) {
    this.paidAt = new Date();
  }

  next();
});

// Index for faster queries
paymentSchema.index({ patientId: 1, createdAt: -1 });
paymentSchema.index({ doctorId: 1, createdAt: -1 });
paymentSchema.index({ appointmentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ invoiceNumber: 1 });

// Calculate total revenue
paymentSchema.statics.calculateRevenue = async function (filters = {}) {
  const query = { status: "completed", ...filters };

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || { totalRevenue: 0, count: 0 };
};

export default mongoose.model("payments", paymentSchema);
