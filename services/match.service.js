import MatchSession from "../models/MatchSession.js";
import User from "../models/User.js";
import matchQueue from "./matchQueue.service.js";
import AppError from "../utils/appError.js";
import { getIO } from "../sockets/socket.server.js";

class MatchService {
    // start match
    static async start(userId) {
        const existingSession = await MatchSession.findOne({
            $or: [{ userA: userId }, { userB: userId }],
            status: "ACTIVE",
        });

        if (existingSession) {
            return {
                alreadyMatched: true,
                sessionId: existingSession._id,
            };
        }

        const user = await User.findById(userId);

        if (!user) {
            throw new AppError("User not found", 404);
        }

        if (user.isCurrentlyBanned()) {
            throw new AppError("Account is banned", 403);
        }

        await MatchQueue.add(userId);

        const users = await MatchQueue.popTwo();

        if (!users) {
            return {
                waiting: true,
            };
        }

        const [userA, userB] = users;

        if (userA === userB) {
            await MatchQueue.add(userA);
            return { waiting: true };
        }

        const session = await MatchSession.create({
            userA,
            userB,
        });

        const io = getIO();

        io.to(userA).emit("matchFound", {
            sessionId: session._id,
            partnerId: userB,
        });

        io.to(userB).emit("matchFound", {
            sessionId: session._id,
            partnerId: userA,
        });

        return {
            matched: true,
            sessionId: session._id,
            partnerId: userId === userA ? userB : userA,
        };
    }

    // skip
    static async skip(userId) {
        const session = await MatchSession.findOne({
            $or: [{ userA: userId }, { userB: userId }],
            status: "ACTIVE",
        });

        if (!session) {
            throw new AppError("No active session to skip", 400);
        }

        session.status = "ENDED";
        session.endedAt = new Date();
        await session.save();

        const partnerId =
            session.userA.toString() === userId
                ? session.userB.toString()
                : session.userA.toString();

        const io = getIO();

        io.to(partnerId).emit("matchEnded", {
            sessionId: session._id,
        });

        await MatchQueue.remove(userId);

        return await this.start(userId);
    }

    // end
    static async end(userId) {
        const session = await MatchSession.findOne({
            $or: [{ userA: userId }, { userB: userId }],
            status: "ACTIVE",
        });

        if (!session) {
            throw new AppError("No active session to end", 400);
        }


        session.status = "ENDED";
        session.endedAt = new Date();
        await session.save();

        const partnerId =
            session.userA.toString() === userId
                ? session.userB.toString()
                : session.userA.toString();

        const io = getIO();

        io.to(partnerId).emit("matchEnded", {
            sessionId: session._id,
        });

        await MatchQueue.remove(userId);

        return {
            message: "Match ended successfully",
        };
    }
}

export default MatchService;
