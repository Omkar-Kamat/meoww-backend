import AdminService from "../services/admin.service.js";
import { logger } from "../utils/appError.js";

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

    // ban user
    static async banUser(req, res, next) {
        try {
            const { id } = req.params;
            const { durationHours } = req.body;

            const result = await AdminService.banUser(
                req.user.id,
                id,
                durationHours,
            );

            logger.info(`Admin banned user`, { 
                adminId: req.user.id, 
                userId: id, 
                durationHours: durationHours || 'permanent',
                requestId: req.id 
            });

            res.status(200).json({
                status: "success",
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }

    // unban
    static async unbanUser(req, res, next) {
        try {
            const { id } = req.params;

            const result = await AdminService.unbanUser(req.user.id, id);

            logger.info(`Admin unbanned user`, { 
                adminId: req.user.id, 
                userId: id,
                requestId: req.id 
            });

            res.status(200).json({
                status: "success",
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default AdminController;
