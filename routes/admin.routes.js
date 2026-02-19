import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import roleMiddleware from "../middlewares/role.middleware.js";
import AdminController from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/users", authMiddleware, roleMiddleware("ADMIN"), AdminController.getUsers);

router.patch("/ban/:id", authMiddleware, roleMiddleware("ADMIN"), AdminController.banUser);

router.patch("/unban/:id", authMiddleware, roleMiddleware("ADMIN"), AdminController.unbanUser);



export default router;
