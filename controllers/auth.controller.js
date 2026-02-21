import AuthService from "../services/auth.service.js";
import { getCookieConfig, blacklistToken, getRefreshCookieConfig } from "../utils/jwt.js";
import { generateCsrfToken, getCsrfCookieConfig } from "../utils/csrf.js";
import AppError from "../utils/appError.js";

class AuthController {
    // register
    static async register(req, res, next) {
        try {
            const result = await AuthService.register(req.body);

            const csrfToken = generateCsrfToken();
            res.cookie("csrfToken", csrfToken, getCsrfCookieConfig());

            res.status(201).json({
                status: "success",
                message: result.message,
                csrfToken,
            });
        } catch (error) {
            next(error);
        }
    }

    // verify
    static async verifyAccount(req, res, next) {
        try {
            const { email, otp } = req.body;

            const result = await AuthService.verifyAccount(email, otp);

            const csrfToken = generateCsrfToken();
            res.cookie("csrfToken", csrfToken, getCsrfCookieConfig());
            res.cookie("accessToken", result.accessToken, getCookieConfig());
            res.cookie("refreshToken", result.refreshToken, getRefreshCookieConfig());

            res.status(200).json({
                status: "success",
                message: result.message,
                csrfToken,
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

            if (result.verificationRequired) {
                return res.status(403).json({
                    status: "fail",
                    message: result.message,
                    verificationRequired: true,
                });
            }

            const csrfToken = generateCsrfToken();
            res.cookie("csrfToken", csrfToken, getCsrfCookieConfig());
            res.cookie("accessToken", result.accessToken, getCookieConfig());
            res.cookie("refreshToken", result.refreshToken, getRefreshCookieConfig());

            res.status(200).json({
                status: "success",
                message: "Logged in successfully",
                csrfToken,
            });
        } catch (error) {
            next(error);
        }
    }

    // logout
    static async logout(req, res, next) {
        try {
            const token = req.cookies?.accessToken;
            const refreshToken = req.cookies?.refreshToken;
            
            if (token) {
                await blacklistToken(token);
            }
            if (refreshToken) {
                await blacklistToken(refreshToken);
            }

            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            res.clearCookie("csrfToken");

            res.status(200).json({
                status: "success",
                message: "Logged out successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    static async refreshToken(req, res, next) {
        try {
            const refreshToken = req.cookies?.refreshToken;

            if (!refreshToken) {
                throw new AppError("Refresh token not found", 401);
            }

            const result = await AuthService.refreshToken(refreshToken);

            const csrfToken = generateCsrfToken();
            res.cookie("csrfToken", csrfToken, getCsrfCookieConfig());
            res.cookie("accessToken", result.accessToken, getCookieConfig());

            res.status(200).json({
                status: "success",
                message: "Token refreshed successfully",
                csrfToken,
            });
        } catch (error) {
            next(error);
        }
    }

    // resend otp
    static async resendOtp(req, res, next) {
        try {
            const { email } = req.body;

            const result = await AuthService.resendOtp(email);

            res.status(200).json({
                status: "success",
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default AuthController;
