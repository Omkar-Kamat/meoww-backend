import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import AppError from "../utils/appError.js";

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Not authenticated", 401);
        }

        const token = authHeader.split(" ")[1];
        const decoded = verifyAccessToken(token);

        const user = await User.findById(decoded.userId);

        if (!user) {
            throw new AppError("User no longer exists", 401);
        }

        if (user.isCurrentlyBanned()) {
            throw new AppError("Account is banned", 403);
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

export default authMiddleware;
