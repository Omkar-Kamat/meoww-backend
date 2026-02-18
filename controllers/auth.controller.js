import AuthService from "../services/auth.service.js";

class AuthController {
  static async register(req, res, next) {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        status: "success",
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyAccount(req, res, next) {
    try {
      const { identifier, otp } = req.body;

      const result = await AuthService.verifyAccount(identifier, otp);

      // Set refresh token cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        status: "success",
        message: result.message,
        accessToken: result.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
