import ReportService from "../services/report.service.js";

class ReportController {
  static async create(req, res, next) {
    try {
      const { sessionId, reason } = req.body;

      const result = await ReportService.createReport(
        req.user.id,
        sessionId,
        reason
      );

      res.status(201).json({
        status: "success",
        message: result.message,
        autoBanned: result.autoBanned,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ReportController;