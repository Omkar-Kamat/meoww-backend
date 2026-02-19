import AdminService from "../services/admin.service.js";

class AdminController {
  // get all
  static async getUsers(req, res, next) {
    try {
      const result = await AdminService.getAllUsers(req.query);

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminController;
