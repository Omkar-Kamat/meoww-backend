import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import UserController from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateProfileSchema } from "../validations/user.schema.js";


const router = express.Router();

router.get("/profile", authMiddleware, UserController.getProfile);

router.patch("/profile", authMiddleware, validate(updateProfileSchema), UserController.updateProfile);

export default router;