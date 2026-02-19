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

    // skip match
    static async skip(req, res, next) {
        try {
            const result = await MatchService.skip(req.user.id);

            res.status(200).json({
                status: "success",
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    // end match
    static async end(req, res, next) {
        try {
            const result = await MatchService.end(req.user.id);

            res.status(200).json({
                status: "success",
                message: result.message,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default MatchController;
