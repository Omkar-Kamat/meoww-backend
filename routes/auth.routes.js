import express from "express";
import AuthController from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
    registerSchema,
    verifySchema,
    loginSchema,
} from "../validations/auth.schema.js";

const router = express.Router();

router.post("/register", validate(registerSchema), AuthController.register);

router.post("/verify", validate(verifySchema), AuthController.verifyAccount);

router.post("/login", validate(loginSchema), AuthController.login);

router.post("/refresh", AuthController.refresh);

router.post("/logout", AuthController.logout);

export default router;
