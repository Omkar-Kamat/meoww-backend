import MatchSession from "../models/MatchSession.js";
import User from "../models/User.js";
import matchQueue from "./matchQueue.service.js";
import AppError from "../utils/appError.js";

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

        if (matchQueue.has(userId)) {
            return {
                waiting: true,
            };
        }

        const partnerId = matchQueue.findMatch(userId);

        if (!partnerId) {
            matchQueue.add(userId);

            return {
                waiting: true,
            };
        }

        matchQueue.remove(partnerId);

        const session = await MatchSession.create({
            userA: partnerId,
            userB: userId,
        });

        return {
            matched: true,
            sessionId: session._id,
            partnerId,
        };
    }

    // skip match
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

        return await this.start(userId);
    }

    // end match
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

        matchQueue.remove(userId);

        return {
            message: "Match ended successfully",
        };
    }
}

export default MatchService;
