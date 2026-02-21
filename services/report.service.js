import Report from "../models/Report.js";
import MatchSession from "../models/MatchSession.js";
import User from "../models/User.js";
import AppError from "../utils/appError.js";

const REPORT_THRESHOLD = parseInt(process.env.REPORT_THRESHOLD) || 3;

class ReportService {
  static async createReport(reporterId, sessionId, reason) {
    const session = await MatchSession.findById(sessionId);

    if (!session || session.status !== "ACTIVE") {
      throw new AppError("Invalid session", 400);
    }

    const reportedUserId =
      session.userA.toString() === reporterId
        ? session.userB.toString()
        : session.userA.toString();

    if (!reportedUserId) {
      throw new AppError("Cannot report", 400);
    }

    await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      session: sessionId,
      reason,
    });

    const reportedUser = await User.findById(reportedUserId);

    reportedUser.violationCount += 1;

    if (reportedUser.violationCount >= REPORT_THRESHOLD) {
      reportedUser.isBanned = true;
      reportedUser.banExpiresAt = null;
    }

    await reportedUser.save();

    return {
      message: "Report submitted successfully",
      autoBanned: reportedUser.isBanned,
    };
  }
}

export default ReportService;