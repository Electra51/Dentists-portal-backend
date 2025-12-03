import appointmentModel from "../models/appointmentModel.js";

// ✅ Get Admin Revenue Dashboard Overview
export const getRevenueDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // ✅ Total Revenue (All Time - Only Paid)
    const totalRevenueResult = await appointmentModel.aggregate([
      {
        $match: {
          "payment.paymentStatus": "paid",
          status: { $in: ["completed", "confirmed"] },
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

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const totalPaidAppointments = totalRevenueResult[0]?.count || 0;

    // ✅ Today's Revenue
    const todayRevenueResult = await appointmentModel.aggregate([
      {
        $match: {
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

    const todayRevenue = todayRevenueResult[0]?.total || 0;
    const todayPaidCount = todayRevenueResult[0]?.count || 0;

    // ✅ This Month's Revenue
    const monthRevenueResult = await appointmentModel.aggregate([
      {
        $match: {
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

    const monthRevenue = monthRevenueResult[0]?.total || 0;
    const monthPaidCount = monthRevenueResult[0]?.count || 0;

    // ✅ Pending Payments
    const pendingResult = await appointmentModel.aggregate([
      {
        $match: {
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

    // ✅ Revenue by Payment Method
    const paymentMethodStats = await appointmentModel.aggregate([
      {
        $match: {
          "payment.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: "$payment.paymentMethod",
          total: { $sum: "$payment.paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          totalPaidAppointments,
          todayRevenue,
          todayPaidCount,
          monthRevenue,
          monthPaidCount,
          pendingAmount,
          pendingCount,
        },
        paymentMethods: paymentMethodStats,
      },
    });
  } catch (error) {
    console.error("Revenue Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue dashboard",
      error: error.message,
    });
  }
};

// ✅ Get Revenue by Doctor (Top Earners)
export const getRevenueByDoctor = async (req, res) => {
  try {
    const revenueByDoctor = await appointmentModel.aggregate([
      {
        $match: {
          "payment.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: "$doctorId",
          doctorName: { $first: "$doctorName" },
          doctorSpecialization: { $first: "$doctorSpecialization" },
          totalRevenue: { $sum: "$payment.paidAmount" },
          totalAppointments: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10, // Top 10 doctors
      },
    ]);

    res.status(200).json({
      success: true,
      data: revenueByDoctor,
    });
  } catch (error) {
    console.error("Revenue by Doctor Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by doctor",
      error: error.message,
    });
  }
};

// ✅ Get Revenue by Service Type
export const getRevenueByService = async (req, res) => {
  try {
    const revenueByService = await appointmentModel.aggregate([
      {
        $match: {
          "payment.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: "$service",
          totalRevenue: { $sum: "$payment.paidAmount" },
          totalAppointments: { $sum: 1 },
          averageFee: { $avg: "$payment.paidAmount" },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: revenueByService,
    });
  } catch (error) {
    console.error("Revenue by Service Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue by service",
      error: error.message,
    });
  }
};

// ✅ Get Monthly Revenue Trend (Last 6 Months)
export const getMonthlyRevenueTrend = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await appointmentModel.aggregate([
      {
        $match: {
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
          totalRevenue: { $sum: "$payment.paidAmount" },
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
          totalRevenue: 1,
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
    console.error("Monthly Revenue Trend Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly revenue trend",
      error: error.message,
    });
  }
};

// ✅ Get Recent Transactions (Last 20)
export const getRecentTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const filter = {};
    if (status && status !== "all") {
      filter["payment.paymentStatus"] = status;
    }

    const transactions = await appointmentModel
      .find(filter)
      .select(
        "bookingId patientInfo.name doctorName service payment appointmentDate appointmentTime status"
      )
      .sort({ "payment.paidAt": -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await appointmentModel.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Recent Transactions Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent transactions",
      error: error.message,
    });
  }
};
