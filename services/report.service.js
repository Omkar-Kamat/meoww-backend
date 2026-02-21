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

        let autoBanned = false;

        if (reportedUser.violationCount >= REPORT_THRESHOLD) {
            reportedUser.isBanned = true;
            reportedUser.banExpiresAt = null;
            autoBanned = true;
        }

        await reportedUser.save();

        if (autoBanned) {
            const io = getIO();

            const activeSession = await MatchSession.findOne({
                $or: [{ userA: reportedUserId }, { userB: reportedUserId }],
                status: "ACTIVE",
            });

            if (activeSession) {
                activeSession.status = "ENDED";
                activeSession.endedAt = new Date();
                await activeSession.save();

                const partnerId =
                    activeSession.userA.toString() === reportedUserId
                        ? activeSession.userB.toString()
                        : activeSession.userA.toString();

                io.to(partnerId).emit("matchEnded", {
                    sessionId: activeSession._id,
                });
            }

            io.to(reportedUserId).emit("banned", {
                message: "You have been banned due to multiple violations.",
            });

            const sockets = await io.in(reportedUserId).fetchSockets();

            for (const socket of sockets) {
                socket.disconnect(true);
            }
        }

        return {
            message: "Report submitted successfully",
            autoBanned,
        };
    }
}

export default ReportService;
