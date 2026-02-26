import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (toEmail, otp) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: toEmail,
    subject: 'Your Meoww verification code',
    html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #1B1A55;">Verify your Meoww account</h2>
                <p>Your one-time code is:</p>
                <h1 style="letter-spacing: 8px; color: #535C91; font-size: 36px;">${otp}</h1>
                <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. Do not share it.</p>
            </div>
        `
  });

  if (error) {
  console.error("RESEND ERROR:", error);
  throw new Error(error.message);
}

  return data;
};
