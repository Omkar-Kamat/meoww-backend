import UserService from "../services/user.service.js";

class UserController {
  // get profile
  static async getProfile(req, res, next) {
    try {
      const user = await UserService.getProfile(req.user.id);

      res.status(200).json({
        status: "success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default UserController;
