import crypto from "crypto";
import bcrypt from "bcrypt";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 10;

export const generateOtp = () => {
  const buffer = crypto.randomBytes(4);
  const otp = parseInt(buffer.toString("hex"), 16)
    .toString()
    .slice(0, OTP_LENGTH);

  return otp.padStart(OTP_LENGTH, "0");
};

export const hashOtp = async (otp) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(otp, salt);
};

export const compareOtp = async (plainOtp, hashedOtp) => {
  return bcrypt.compare(plainOtp, hashedOtp);
};

export const getOtpExpiry = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
};
