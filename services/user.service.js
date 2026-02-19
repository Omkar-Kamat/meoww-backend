import User from "../models/User.js";
import AppError from "../utils/appError.js";

class UserService {
    // get profile
    static async getProfile(userId) {
        const user = await User.findById(userId).select("-password -__v");

        if (!user) {
            throw new AppError("User not found", 404);
        }

        return user;
    }
    // update profile
    static async updateProfile(userId, data) {
        const updates = {};

        if (data.fullName) {
            updates.fullName = normalizeFullName(data.fullName);
        }

        if (data.mobileNumber) {
            updates.mobileNumber = data.mobileNumber.trim();
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            {
                returnDocument: "after",
                runValidators: true,
            },
        ).select("-password -__v");

        if (!updatedUser) {
            throw new AppError("User not found", 404);
        }

        return updatedUser;
    }
}

export default UserService;
