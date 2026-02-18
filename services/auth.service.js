import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { generateOtp, hashOtp, getOtpExpiry } from "../utils/otp.js";
import EmailService from "./email.service.js";

class AuthService {
  static async register(data) {
    const { email, password, registrationNumber, mobileNumber } = data;

    const existingUser = await User.findOne({
      $or: [
        { email },
        { mobileNumber },
        { registrationNumber },
      ],
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const user = await User.create({
      email,
      password,
      registrationNumber,
      mobileNumber,
      isVerified: false,
    });

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    await Otp.deleteMany({
      user: user._id,
      type: "VERIFY_ACCOUNT",
    });

    await Otp.create({
      user: user._id,
      type: "VERIFY_ACCOUNT",
      hashedOtp,
      expiresAt: getOtpExpiry(),
    });

    await EmailService.sendOtpEmail(email, otp);

    return {
      message: "Registration successful. OTP sent for verification.",
    };
  }
}

export default AuthService;
