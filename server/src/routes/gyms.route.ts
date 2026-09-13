import { Router } from "express";
import { GymsController } from "../controllers/gyms.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const gymsRoutes = Router();

const gymsController = new GymsController();

gymsRoutes.post("/", gymsController.create);
gymsRoutes.post("/sessions", gymsController.login);
gymsRoutes.get("/", gymsController.listAll);
gymsRoutes.get("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.me);
