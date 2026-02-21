import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    if (!process.env.SMTP_HOST) {
        throw new Error("SMTP_HOST is not defined");
    }
    if (!process.env.SMTP_PORT) {
        throw new Error("SMTP_PORT is not defined");
    }
    if (!process.env.SMTP_USER) {
        throw new Error("SMTP_USER is not defined");
    }
    if (!process.env.SMTP_PASS) {
        throw new Error("SMTP_PASS is not defined");
    }

    const port = Number(process.env.SMTP_PORT) || 587;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    return transporter;
};

export default getTransporter;
