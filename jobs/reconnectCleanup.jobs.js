import MatchSession from "../models/MatchSession.js";
import ReconnectService from "../services/reconnect.service.js";
import { getIO } from "../sockets/socket.server.js";

const CLEANUP_INTERVAL = 5000;

export const startReconnectCleanupJob = () => {
    setInterval(async () => {
        try {
            const sessions = await MatchSession.find({
                status: "ACTIVE",
            });

            for (const session of sessions) {
                const users = [
                    session.userA.toString(),
                    session.userB.toString(),
                ];

                for (const userId of users) {
                    const stillInGrace =
                        await ReconnectService.hasReconnectWindow(
                            session._id.toString(),
                            userId
                        );

                    if (stillInGrace) continue;

                    const wasMarked =
                        await ReconnectService.wasEverMarked?.(
                            session._id.toString(),
                            userId
                        );

                    if (!wasMarked) continue;


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

                    break;
                }
            }
        } catch (err) {
            console.error("Reconnect cleanup job error:", err);
        }
    }, CLEANUP_INTERVAL);
};