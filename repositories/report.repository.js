import Report from "../models/Report.js";

class ReportRepository {
  async create(data, options = {}) {
    if (options.session) {
      return Report.create([data], { session: options.session });
    }
    return Report.create(data);
  }

  async findOne(query, options = {}) {
    return Report.findOne(query, options.select, options);
  }
}

export default new ReportRepository();
