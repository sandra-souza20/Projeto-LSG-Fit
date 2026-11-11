import { Router } from "express";
import { CheckInsController } from "../controllers/check-ins.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const checkInsRoutes = Router();

const checkInsController = new CheckInsController();

// Check-in do aluno (o painel da academia usa /gyms/me/check-ins).
checkInsRoutes.use(ensureAuthenticated, restrictTo("STUDENT"));
checkInsRoutes.get("/today", checkInsController.today);
checkInsRoutes.post("/", checkInsController.create);
checkInsRoutes.delete("/today", checkInsController.cancel);
