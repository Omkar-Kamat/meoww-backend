import UserRepository from "../repositories/user.repository.js";
import MatchSessionRepository from "../repositories/matchSession.repository.js";
import AppError from "../utils/appError.js";
import { getIO } from "../sockets/socket.server.js";
import { MAX_PAGINATION_LIMIT } from "../utils/constants.js";

class AdminService {
    static async getAllUsers(query) {
        const page = parseInt(query.page) || 1;
        const limit = Math.min(parseInt(query.limit) || 10, MAX_PAGINATION_LIMIT);
        const skip = (page - 1) * limit;

        const users = await UserRepository.find(
            {},
            {
                select: "-password -__v",
                skip,
                limit,
                sort: { createdAt: -1 }
            }
        );

        const total = await UserRepository.countDocuments();

        return {
            total,
            page,
            totalPages: Math.ceil(total / limit),
            users,
        };
    }

    static async banUser(adminId, userId, durationHours) {
        if (adminId === userId) {
            throw new AppError("Admin cannot ban themselves", 400);
        }

        const user = await UserRepository.findById(userId);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        user.isBanned = true;

        if (durationHours) {
            user.banExpiresAt = new Date(
                Date.now() + durationHours * 60 * 60 * 1000,
            );
        } else {
            user.banExpiresAt = null;
        }

        await UserRepository.save(user);

        const activeSession = await MatchSessionRepository.findOne({
            $or: [{ userA: userId }, { userB: userId }],
            status: "ACTIVE",
        });

        if (activeSession) {
            activeSession.status = "ENDED";
            activeSession.endedAt = new Date();
            await MatchSessionRepository.save(activeSession);

            const partnerId =
                activeSession.userA.toString() === userId
                    ? activeSession.userB.toString()
                    : activeSession.userA.toString();

            const io = getIO();
            io.to(partnerId).emit("matchEnded", {
                sessionId: activeSession._id,
                reason: "Partner was banned",
            });
        }

        const io = getIO();
        io.to(userId).emit("banned", {
            message: "You have been banned by an administrator.",
        });

        const sockets = await io.in(userId).fetchSockets();
        for (const socket of sockets) {
            socket.disconnect(true);
        }

        return {
            message: "User banned successfully",
        };
    }

    static async unbanUser(adminId, userId) {
        if (adminId === userId) {
            throw new AppError("Admin cannot unban themselves", 400);
        }

        const user = await UserRepository.findById(userId);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (!user.isBanned) {
            throw new AppError("User is not banned", 400);
        }

        user.isBanned = false;
        user.banExpiresAt = null;

        await UserRepository.save(user);

        return {
            message: "User unbanned successfully",
        };
    }
}

export default AdminService;
