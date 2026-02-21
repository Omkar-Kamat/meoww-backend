import mongoose from "mongoose";
import { logger } from "../utils/appError.js";

const connectDB = async (retries = 5) => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            autoIndex: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            compressors: ['zlib'],
            zlibCompressionLevel: 6,
        });

        logger.info(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logger.error("MongoDB connection failed", { error: error.message });
        
        if (retries > 0) {
            logger.info(`Retrying connection... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectDB(retries - 1);
        }
        
        process.exit(1);
    }
};

export default connectDB;
