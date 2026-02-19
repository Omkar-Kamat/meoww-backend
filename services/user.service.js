import User from "../models/User.js";
import AppError from "../utils/appError.js";

class UserService {
  // get profile
  static async getProfile(userId) {
    const user = await User.findById(userId).select(
      "-password -__v"
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }
}

export default UserService;
