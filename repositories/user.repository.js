import User from "../models/User.js";

class UserRepository {
  async findById(id, options = {}) {
    return User.findById(id, options.select, options);
  }

  async findOne(query, options = {}) {
    return User.findOne(query, options.select, options);
  }

  async create(data) {
    return User.create(data);
  }

  async save(user) {
    return user.save();
  }

  async findByIdAndUpdate(id, update, options = {}) {
    return User.findByIdAndUpdate(id, update, options);
  }

  async countDocuments(query = {}) {
    return User.countDocuments(query);
  }

  async find(query = {}, options = {}) {
    let queryBuilder = User.find(query);
    
    if (options.select) queryBuilder = queryBuilder.select(options.select);
    if (options.skip) queryBuilder = queryBuilder.skip(options.skip);
    if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
    if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
    
    return queryBuilder;
  }
}

export default new UserRepository();
