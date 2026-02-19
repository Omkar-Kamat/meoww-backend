import MatchService from "../services/match.service.js";

class MatchController {
    // start match
    static async start(req, res, next) {
        try {
            const result = await MatchService.start(req.user.id);

            res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default MatchController;
