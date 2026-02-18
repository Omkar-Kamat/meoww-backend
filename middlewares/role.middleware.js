import AppError from "../utils/appError.js";

const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError("Forbidden", 403));
        }
        next();
    };
};

export default roleMiddleware;
