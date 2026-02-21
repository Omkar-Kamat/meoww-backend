import ReportRepository from "../repositories/report.repository.js";
import MatchSessionRepository from "../repositories/matchSession.repository.js";
import UserRepository from "../repositories/user.repository.js";
import mongoose from "mongoose";
import AppError from "../utils/appError.js";
import { getIO } from "../sockets/socket.server.js";
import { AUTO_BAN_DURATION_HOURS } from "../utils/constants.js";

const REPORT_THRESHOLD = parseInt(process.env.REPORT_THRESHOLD) || 5;

class ReportService {
    static async createReport(reporterId, sessionId, reason) {
        const session = await MatchSessionRepository.findById(sessionId);

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

        const existingReport = await ReportRepository.findOne({
            reporter: reporterId,
            reportedUser: reportedUserId,
            session: sessionId,
        });

        if (existingReport) {
            throw new AppError(
                "You have already reported this user in this session",
                400,
            );
        }

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try {
            await ReportRepository.create({
                reporter: reporterId,
                reportedUser: reportedUserId,
                session: sessionId,
                reason,
            }, { session: dbSession });

            const reportedUser = await UserRepository.findById(reportedUserId);

            reportedUser.violationCount += 1;

            let autoBanned = false;

            if (reportedUser.violationCount >= REPORT_THRESHOLD) {
                reportedUser.isBanned = true;
                reportedUser.banExpiresAt = new Date(
                    Date.now() + AUTO_BAN_DURATION_HOURS * 60 * 60 * 1000,
                );
                autoBanned = true;
            }

            await UserRepository.save(reportedUser);

            await dbSession.commitTransaction();

            if (autoBanned) {
                const io = getIO();

                const activeSession = await MatchSessionRepository.findOne({
                    $or: [{ userA: reportedUserId }, { userB: reportedUserId }],
                    status: "ACTIVE",
                });

                if (activeSession) {
                    activeSession.status = "ENDED";
                    activeSession.endedAt = new Date();
                    await MatchSessionRepository.save(activeSession);

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
        } catch (error) {
            await dbSession.abortTransaction();
            throw error;
        } finally {
            dbSession.endSession();
        }
    }
}

export default ReportService;
