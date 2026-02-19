import getTransporter from "../config/mailer.js";

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

        const transporter = getTransporter();
        await transporter.sendMail(mailOptions);
    }
}

export default EmailService;
