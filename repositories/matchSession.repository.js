import MatchSession from "../models/MatchSession.js";

class MatchSessionRepository {
  async create(data) {
    return MatchSession.create(data);
  }

  async findOne(query, options = {}) {
    return MatchSession.findOne(query, options.select, options);
  }

  async findById(id) {
    return MatchSession.findById(id);
  }

  async find(query = {}, options = {}) {
    return MatchSession.find(query, options.select, options);
  }

  async save(session) {
    return session.save();
  }
}

export default new MatchSessionRepository();
