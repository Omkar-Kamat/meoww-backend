import { getEmailQueue } from "../config/emailQueue.js";
import { logger } from "../utils/appError.js";

class EmailService {
    static async sendOtpEmail(to, otp) {
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to,
            subject: "Your Meoww Verification Code",
            html: `
        <h3>Verification Code</h3>
        <p>Your OTP is:</p>
        <h2>${otp}</h2>
        <p>This code will expire in 10 minutes.</p>
      `,
        };

        await this.queueEmail(mailOptions);
    }

    static async queueEmail(mailOptions) {
        try {
            const queue = getEmailQueue();
            await queue.add("send-email", mailOptions);
            logger.debug("Email queued", { to: mailOptions.to });
        } catch (error) {
            logger.error("Failed to queue email", { error: error.message });
            throw error;
        }
    }
}

export default EmailService;
