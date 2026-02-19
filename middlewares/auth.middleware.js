import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import AppError from "../utils/appError.js";

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;

        if (!token) {
            throw new AppError("Not authenticated", 401);
        }

        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch {
            throw new AppError("Invalid or expired token", 401);
        }

        const user = await User.findById(decoded.userId).select(
            "_id role isBanned banExpiresAt",
        );

        if (!user) {
            throw new AppError("User no longer exists", 401);
        }

        if (user.isCurrentlyBanned()) {
            throw new AppError("Account is banned", 403);
        }

        req.user = {
            id: user._id,
            role: user.role,
        };

        next();
    } catch (err) {
        next(err);
    }
};

export default authMiddleware;
