import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import AdminController from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/users", authMiddleware, roleMiddleware("ADMIN"), AdminController.getUsers);

export default router;
