import UserRepository from "../repositories/user.repository.js";
import AppError from "../utils/appError.js";
import { normalizeFullName } from "../utils/name.js";
import cacheService from "../cache/cache.service.js";

class UserService {
    // get profile
    static async getProfile(userId) {
        const cached = await cacheService.getUserProfile(userId);
        if (cached) return cached;

        const user = await UserRepository.findById(userId, { select: "-password -__v" });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        await cacheService.setUserProfile(userId, user);
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

        const updatedUser = await UserRepository.findByIdAndUpdate(
            userId,
            { $set: updates },
            {
                returnDocument: "after",
                runValidators: true,
                select: "-password -__v"
            },
        );

        if (!updatedUser) {
            throw new AppError("User not found", 404);
        }

        await cacheService.invalidateUserProfile(userId);
        return updatedUser;
    }
}

export default UserService;
