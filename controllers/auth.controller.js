import AuthService from "../services/auth.service.js";
import AppError from "../utils/appError.js";

class AuthController {
    // register
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

    // verify otp
    static async verifyAccount(req, res, next) {
        try {
            const { identifier, otp } = req.body;

            const result = await AuthService.verifyAccount(identifier, otp);

            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
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

    // login
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await AuthService.login(email, password);

            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.status(200).json({
                status: "success",
                accessToken: result.accessToken,
            });
        } catch (error) {
            next(error);
        }
    }

    // refresh token
    static async refresh(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken;

            const result = await AuthService.refresh(refreshToken);

            res.status(200).json({
                status: "success",
                accessToken: result.accessToken,
            });
        } catch (error) {
            next(error);
        }
    }

    // logout
    static async logout(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken;

            if (!refreshToken) {
                throw new AppError("No refresh token found", 401);
            }

            await AuthService.logoutByToken(refreshToken);

            res.clearCookie("refreshToken");

            res.status(200).json({
                status: "success",
                message: "Logged out successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}

export default AuthController;
