import bcrypt from "bcryptjs";
import { PASSWORD_SALT_ROUNDS } from "./constants.js";

const SALT_ROUNDS = PASSWORD_SALT_ROUNDS;

export const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
