import Otp from "../models/Otp.js";

class OtpRepository {
  async create(data, options = {}) {
    if (options.session) {
      return Otp.create([data], { session: options.session });
    }
    return Otp.create(data);
  }

  async findOne(query, options = {}) {
    return Otp.findOne(query, options.select, options);
  }

  async deleteOne(query) {
    return Otp.deleteOne(query);
  }

  async deleteMany(query) {
    return Otp.deleteMany(query);
  }

  async save(otp) {
    return otp.save();
  }
}

export default new OtpRepository();
