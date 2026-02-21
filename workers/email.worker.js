import { Worker } from "bullmq";
import getTransporter from "../config/mailer.js";
import { logger } from "../utils/appError.js";

let emailWorker;

export const startEmailWorker = () => {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker(
    "email",
    async (job) => {
      const transporter = getTransporter();
      await transporter.sendMail(job.data);
      logger.info("Email sent", { to: job.data.to, jobId: job.id });
    },
    {
      connection: {
        host: process.env.REDIS_URL?.split("://")[1]?.split(":")[0] || "localhost",
        port: parseInt(process.env.REDIS_URL?.split(":")[2]) || 6379,
      },
      concurrency: 5,
    }
  );

  emailWorker.on("completed", (job) => {
    logger.debug("Email job completed", { jobId: job.id });
  });

  emailWorker.on("failed", (job, err) => {
    logger.error("Email job failed", { 
      jobId: job?.id, 
      error: err.message,
      to: job?.data?.to 
    });
  });

  logger.info("Email worker started with concurrency 5");

  return emailWorker;
};

export const stopEmailWorker = async () => {
  if (emailWorker) {
    await emailWorker.close();
    logger.info("Email worker stopped");
  }
};
