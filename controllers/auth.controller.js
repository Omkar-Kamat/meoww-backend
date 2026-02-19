import AuthService from "../services/auth.service.js";

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

    // verify
    static async verifyAccount(req, res, next) {
        try {
            const { email, otp } = req.body;

            const result = await AuthService.verifyAccount(email, otp);

            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 2 * 60 * 60 * 1000, 
            });

            res.status(200).json({
                status: "success",
                message: result.message,
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

            res.cookie("accessToken", result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 2 * 60 * 60 * 1000,
            });

            res.status(200).json({
                status: "success",
                message: "Logged in successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    // logout
    static async logout(req, res, next) {
        try {
            res.clearCookie("accessToken");

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
