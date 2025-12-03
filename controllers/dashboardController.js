import appointmentModel from "../models/appointmentModel.js";
import prescriptionModel from "../models/prescriptionModel.js";
import userModel from "../models/userModel.js";
export const getPatientDashboard = async (req, res) => {
  try {
    const patientId = req.user._id;

    // Get today's date at 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Appointments
    const totalAppointments = await appointmentModel.countDocuments({
      patientId: patientId,
    });

    // Upcoming Appointments (including today)
    const upcomingAppointments = await appointmentModel.countDocuments({
      patientId: patientId,
      appointmentDate: { $gte: today },
      status: { $in: ["scheduled", "confirmed"] }, // Changed: include both statuses
    });

    // Completed Visits
    const completedVisits = await appointmentModel.countDocuments({
      patientId: patientId,
      status: "completed",
    });

    // Cancelled Appointments
    const cancelledAppointments = await appointmentModel.countDocuments({
      patientId: patientId,
      status: "cancelled",
    });

    const latestAppointment = await appointmentModel
      .findOne({ patientId: patientId })
      .sort({ appointmentDate: -1, appointmentTime24: -1 })
      .select("appointmentDate appointmentTime doctorId service")
      .populate("doctorId", "name profileImage specialization")
      .lean();

    const nextPrescriptionVisit = await prescriptionModel
      .findOne({
        patientId: patientId,
        nextVisit: { $gte: today }, // Only future visits
      })
      .sort({ nextVisit: 1 })
      .select("nextVisit doctorId")
      .populate("doctorId", "name profileImage specialization")
      .lean();

    // Next Upcoming Appointment (including today)
    const nextAppointmentRaw = await appointmentModel
      .findOne({
        patientId: patientId,
        appointmentDate: { $gte: today },
        status: { $in: ["scheduled", "confirmed"] }, // Include both statuses
      })
      .populate("doctorId", "name specialization profileImage")
      .sort({ appointmentDate: 1, appointmentTime24: 1 })
      .lean();

    // Transform the next appointment data
    const nextAppointment = nextAppointmentRaw
      ? {
          _id: nextAppointmentRaw._id,
          appointmentDate: nextAppointmentRaw.appointmentDate,
          appointmentTime: nextAppointmentRaw.appointmentTime,
          appointmentTime24: nextAppointmentRaw.appointmentTime24,
          service: nextAppointmentRaw.service,
          status: nextAppointmentRaw.status,
          doctorName:
            nextAppointmentRaw.doctorId?.name || nextAppointmentRaw.doctorName,
          doctorSpecialization:
            nextAppointmentRaw.doctorId?.specialization ||
            nextAppointmentRaw.doctorSpecialization,
          doctorProfileImage: nextAppointmentRaw.doctorId?.profileImage || null,
          patientNotes: nextAppointmentRaw.patientNotes,
        }
      : null;

    // Recent Visits (Last 5)
    const recentVisitsRaw = await appointmentModel
      .find({
        patientId: patientId,
        status: "completed",
      })
      .populate("doctorId", "name specialization profileImage")
      .sort({ appointmentDate: -1, appointmentTime24: -1 })
      .limit(5)
      .lean();

    // Transform recent visits
    const recentVisits = recentVisitsRaw.map((visit) => ({
      _id: visit._id,
      appointmentDate: visit.appointmentDate,
      appointmentTime: visit.appointmentTime,
      service: visit.service,
      status: visit.status,
      doctorName: visit.doctorId?.name || visit.doctorName,
      doctorSpecialization:
        visit.doctorId?.specialization || visit.doctorSpecialization,
      doctorProfileImage: visit.doctorId?.profileImage || null,
      payment: visit.payment,
    }));

    // Active Prescriptions
    const activePrescriptions = await prescriptionModel.countDocuments({
      patientId: patientId,
      status: "active",
    });

    // Pending Payments
    const pendingPayments = await appointmentModel.countDocuments({
      patientId: patientId,
      "payment.paymentStatus": "pending",
    });

    console.log("📊 Dashboard Stats:", {
      totalAppointments,
      upcomingAppointments,
      completedVisits,
      cancelledAppointments,
      activePrescriptions,
      pendingPayments,
      nextAppointment: nextAppointment ? "Found" : "None",
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalAppointments,
          upcomingAppointments,
          completedVisits,
          cancelledAppointments,
          activePrescriptions,
          pendingPayments,
          nextPrescriptionVisit,
          latestAppointment,
        },
        nextAppointment,
        recentVisits,
      },
    });
  } catch (error) {
    console.error("❌ Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};

export const getAppointmentStats = async (req, res) => {
  try {
    const patientId = req.user._id;

    // Monthly appointments for last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await appointmentModel.aggregate([
      {
        $match: {
          patientId: patientId,
          appointmentDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$appointmentDate" },
            month: { $month: "$appointmentDate" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: monthlyStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
};

export const getDoctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Get today's date at 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ==================== TODAY'S STATS ====================

    // Today's Appointments (scheduled + confirmed)
    const todayAppointments = await appointmentModel.countDocuments({
      doctorId: doctorId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow,
      },
      status: { $in: ["scheduled", "confirmed"] },
    });

    // Today's Completed Appointments
    const todayCompleted = await appointmentModel.countDocuments({
      doctorId: doctorId,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow,
      },
      status: "completed",
    });

    // ==================== FOLLOW-UPS ====================

    // Follow-ups Scheduled (upcoming prescription visits)
    const followUpsScheduled = await prescriptionModel.countDocuments({
      doctorId: doctorId,
      nextVisit: { $gte: today },
      status: "active",
    });

    // ==================== REVENUE STATS ====================

    // Total Revenue (paid appointments)
    const paidAppointments = await appointmentModel.find({
      doctorId: doctorId,
      "payment.paymentStatus": "paid",
    });

    const totalRevenue = paidAppointments.reduce(
      (sum, apt) => sum + (apt.payment?.amount || 0),
      0
    );

    // Pending Revenue (unpaid appointments)
    const unpaidAppointments = await appointmentModel.find({
      doctorId: doctorId,
      "payment.paymentStatus": "pending",
    });

    const pendingRevenue = unpaidAppointments.reduce(
      (sum, apt) => sum + (apt.payment?.amount || 0),
      0
    );

    // Count of paid appointments
    const paidAppointmentsCount = paidAppointments.length;

    // Count of unpaid appointments
    const unpaidAppointmentsCount = unpaidAppointments.length;

    // ==================== PATIENTS STATS ====================

    // Total Unique Patients
    const totalPatients = await appointmentModel.distinct("patientId", {
      doctorId: doctorId,
    });

    // Recent Visits (patients seen in last 30 days)
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentVisitsPatients = await appointmentModel.distinct("patientId", {
      doctorId: doctorId,
      appointmentDate: { $gte: thirtyDaysAgo },
      status: "completed",
    });

    // Patients with Allergies (role: 0 means patient)
    const patientsWithAllergies = await userModel.countDocuments({
      role: 0,
      "medicalHistory.allergies": { $exists: true, $ne: [] },
      _id: { $in: totalPatients },
    });

    // Patients with Chronic Conditions (role: 0 means patient)
    const chronicPatients = await userModel.countDocuments({
      role: 0,
      "medicalHistory.chronicConditions": { $exists: true, $ne: [] },
      _id: { $in: totalPatients },
    });

    // ==================== TODAY'S APPOINTMENTS LIST ====================

    const todayAppointmentsList = await appointmentModel
      .find({
        doctorId: doctorId,
        appointmentDate: {
          $gte: today,
          $lt: tomorrow,
        },
        status: { $in: ["scheduled", "confirmed"] },
      })
      .populate("patientId", "name email phone profileImage")
      .sort({ appointmentTime24: 1 })
      .lean();

    // Transform today's appointments
    const transformedTodayAppointments = todayAppointmentsList.map((apt) => ({
      _id: apt._id,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      appointmentTime24: apt.appointmentTime24,
      service: apt.service,
      status: apt.status,
      patientName: apt.patientId?.name || apt.patientName,
      patientEmail: apt.patientId?.email,
      patientPhone: apt.patientId?.phone,
      patientProfileImage: apt.patientId?.profileImage || null,
      payment: apt.payment,
      patientNotes: apt.patientNotes,
    }));

    // ==================== UPCOMING FOLLOW-UPS ====================

    const upcomingFollowUps = await prescriptionModel
      .find({
        doctorId: doctorId,
        nextVisit: { $gte: today },
        status: "active",
      })
      .populate("patientId", "name email phone profileImage")
      .sort({ nextVisit: 1 })
      .limit(5)
      .lean();

    // Transform follow-ups
    const transformedFollowUps = upcomingFollowUps.map((prescription) => ({
      _id: prescription._id,
      prescriptionId: prescription.prescriptionId,
      nextVisit: prescription.nextVisit,
      patientName: prescription.patientId?.name,
      patientProfileImage: prescription.patientId?.profileImage || null,
      medicinesCount: prescription.medicines?.length || 0,
    }));

    // ==================== RECENT PATIENTS ====================

    const recentPatientsList = await appointmentModel
      .find({
        doctorId: doctorId,
        status: "completed",
      })
      .populate("patientId", "name email phone profileImage medicalHistory")
      .sort({ appointmentDate: -1, appointmentTime24: -1 })
      .limit(10)
      .lean();

    // Get unique recent patients
    const uniqueRecentPatients = [];
    const seenPatientIds = new Set();

    for (const apt of recentPatientsList) {
      const patientId = apt.patientId?._id?.toString();
      if (patientId && !seenPatientIds.has(patientId)) {
        seenPatientIds.add(patientId);
        uniqueRecentPatients.push({
          _id: apt.patientId._id,
          name: apt.patientId.name,
          email: apt.patientId.email,
          phone: apt.patientId.phone,
          profileImage: apt.patientId.profileImage,
          lastVisit: apt.appointmentDate,
          hasAllergies: apt.patientId.medicalHistory?.allergies?.length > 0,
          hasChronicConditions:
            apt.patientId.medicalHistory?.chronicConditions?.length > 0,
        });
      }
      if (uniqueRecentPatients.length >= 5) break;
    }

    // ==================== ARCHIVED APPOINTMENTS ====================

    const archivedCount = await appointmentModel.countDocuments({
      doctorId: doctorId,
      status: "cancelled",
    });

    console.log("📊 Doctor Dashboard Stats:", {
      todayAppointments,
      todayCompleted,
      followUpsScheduled,
      totalRevenue,
      pendingRevenue,
      totalPatients: totalPatients.length,
      recentVisitsCount: recentVisitsPatients.length,
      patientsWithAllergies,
      chronicPatients,
      archivedCount,
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          todayAppointments: {
            count: todayAppointments,
            confirmed: todayCompleted,
          },
          followUps: {
            scheduled: followUpsScheduled,
          },
          revenue: {
            total: totalRevenue,
            pending: pendingRevenue,
            paidCount: paidAppointmentsCount,
            unpaidCount: unpaidAppointmentsCount,
          },
          patients: {
            total: totalPatients.length,
            recentVisits: recentVisitsPatients.length,
            withAllergies: patientsWithAllergies,
            chronicCases: chronicPatients,
          },
          archived: archivedCount,
        },
        todayAppointments: transformedTodayAppointments,
        upcomingFollowUps: transformedFollowUps,
        recentPatients: uniqueRecentPatients,
      },
    });
  } catch (error) {
    console.error("❌ Doctor Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor dashboard data",
      error: error.message,
    });
  }
};
