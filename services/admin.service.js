import User from "../models/User.js";
import AppError from "../utils/appError.js";

class AdminService {
    // get all users
    static async getAllUsers(query) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select("-password -__v")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        return {
            total,
            page,
            totalPages: Math.ceil(total / limit),
            users,
        };
    }

    // ban user
    static async banUser(adminId, userId, durationHours) {
        if (adminId === userId) {
            throw new AppError("Admin cannot ban themselves", 400);
        }

        const user = await User.findById(userId);

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

        await user.save();

        return {
            message: "User banned successfully",
        };
    }
}

export default AdminService;
