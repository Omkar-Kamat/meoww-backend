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
}

export default AdminService;
