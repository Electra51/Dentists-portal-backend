import appointmentModel from "../models/appointmentModel.js";

// ✅ Get Doctor Earnings Dashboard
export const getMyEarningsDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id; // From auth middleware

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // ✅ Total Earnings (All Time)
    const totalEarningsResult = await appointmentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          "payment.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payment.paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalEarnings = totalEarningsResult[0]?.total || 0;
    const totalPaidAppointments = totalEarningsResult[0]?.count || 0;

    // ✅ This Month's Earnings
    const monthEarningsResult = await appointmentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          "payment.paymentStatus": "paid",
          "payment.paidAt": { $gte: firstDayOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payment.paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthEarnings = monthEarningsResult[0]?.total || 0;
    const monthPaidCount = monthEarningsResult[0]?.count || 0;

    // ✅ Today's Earnings
    const todayEarningsResult = await appointmentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          "payment.paymentStatus": "paid",
          "payment.paidAt": { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payment.paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const todayEarnings = todayEarningsResult[0]?.total || 0;
    const todayPaidCount = todayEarningsResult[0]?.count || 0;

    // ✅ Pending Payments
    const pendingResult = await appointmentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          "payment.paymentStatus": "pending",
          status: { $in: ["scheduled", "confirmed", "completed"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$payment.consultationFee" },
          count: { $sum: 1 },
        },
      },
    ]);

    const pendingAmount = pendingResult[0]?.total || 0;
    const pendingCount = pendingResult[0]?.count || 0;

    // ✅ Earnings by Service
    const serviceEarnings = await appointmentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          "payment.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: "$service",
          totalEarnings: { $sum: "$payment.paidAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalEarnings: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalEarnings,
          totalPaidAppointments,
          monthEarnings,
          monthPaidCount,
          todayEarnings,
          todayPaidCount,
          pendingAmount,
          pendingCount,
        },
        serviceEarnings,
      },
    });
  } catch (error) {
    console.error("Doctor Earnings Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings dashboard",
      error: error.message,
    });
  }
};

// ✅ Get My Earnings History (Patient-wise)
export const getMyEarningsHistory = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { page = 1, limit = 20, status = "paid" } = req.query;

    const filter = {
      doctorId: doctorId,
    };

    if (status !== "all") {
      filter["payment.paymentStatus"] = status;
    }

    const earnings = await appointmentModel
      .find(filter)
      .select(
        "bookingId patientInfo.name service payment appointmentDate appointmentTime status"
      )
      .sort({ "payment.paidAt": -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await appointmentModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        earnings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Earnings History Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch earnings history",
      error: error.message,
    });
  }
};

// ✅ Get Monthly Earnings Trend (Last 6 Months)
export const getMyMonthlyTrend = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await appointmentModel.aggregate([
      {
        $match: {
          doctorId: doctorId,
          "payment.paymentStatus": "paid",
          "payment.paidAt": { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$payment.paidAt" },
            month: { $month: "$payment.paidAt" },
          },
          totalEarnings: { $sum: "$payment.paidAmount" },
          totalAppointments: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalEarnings: 1,
          totalAppointments: 1,
          monthName: {
            $arrayElemAt: [
              [
                "",
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
              "$_id.month",
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: monthlyTrend,
    });
  } catch (error) {
    console.error("Monthly Trend Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly trend",
      error: error.message,
    });
  }
};

// ✅ Get Pending Payments (To collect from patients)
export const getPendingPayments = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const pendingPayments = await appointmentModel
      .find({
        doctorId: doctorId,
        "payment.paymentStatus": "pending",
        status: { $in: ["scheduled", "confirmed", "completed"] },
      })
      .select(
        "bookingId patientInfo service payment appointmentDate appointmentTime status"
      )
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      data: pendingPayments,
    });
  } catch (error) {
    console.error("Pending Payments Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending payments",
      error: error.message,
    });
  }
};

// ✅ Mark Payment as Received (Doctor can mark cash payment)
export const markPaymentReceived = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { appointmentId } = req.params;
    const { amount, note = "" } = req.body;

    // Find appointment
    const appointment = await appointmentModel.findOne({
      _id: appointmentId,
      doctorId: doctorId,
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.payment.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already received",
      });
    }

    // Use the model method to mark as paid
    await appointment.markAsPaid(doctorId, amount, note);

    res.status(200).json({
      success: true,
      message: "Payment marked as received",
      data: appointment,
    });
  } catch (error) {
    console.error("Mark Payment Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark payment as received",
      error: error.message,
    });
  }
};
