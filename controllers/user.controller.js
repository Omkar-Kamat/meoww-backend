import UserService from "../services/user.service.js";
import { UserProfileDTO } from "../dtos/user.dto.js";

class UserController {
    // get profile
    static async getProfile(req, res, next) {
        try {
            const user = await UserService.getProfile(req.user.id);
            const dto = UserProfileDTO.fromModel(user);

            res.status(200).json({
                status: "success",
                data: dto,
            });
        } catch (error) {
            next(error);
        }
    }

    // update profile
    static async updateProfile(req, res, next) {
        try {
            const updatedUser = await UserService.updateProfile(
                req.user.id,
                req.body,
            );
            const dto = UserProfileDTO.fromModel(updatedUser);

            res.status(200).json({
                status: "success",
                data: dto,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default UserController;
