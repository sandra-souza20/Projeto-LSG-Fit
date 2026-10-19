import { Router } from "express";
import { UsersController } from "../controllers/users.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const usersRoutes = Router();

const usersController = new UsersController();

usersRoutes.post("/", usersController.create);
usersRoutes.get("/me", ensureAuthenticated, restrictTo("STUDENT"), usersController.me);
usersRoutes.patch("/me", ensureAuthenticated, restrictTo("STUDENT"), usersController.updateMe);
usersRoutes.patch("/me/professional", ensureAuthenticated, restrictTo("STUDENT"), usersController.linkProfessional);
usersRoutes.post("/verify", usersController.verify);
usersRoutes.post("/resend-verification", usersController.resendVerification);
usersRoutes.post("/forgot-password", usersController.forgotPassword);
usersRoutes.post("/reset-password", usersController.resetPassword);