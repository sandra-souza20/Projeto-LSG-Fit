import { Router } from "express";
import { ProfessionalsController } from "../controllers/professionals.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const professionalsRoutes = Router();

const professionalsController = new ProfessionalsController();

professionalsRoutes.post("/", professionalsController.create);
professionalsRoutes.post("/sessions", professionalsController.login);
professionalsRoutes.get("/", professionalsController.listAll);
professionalsRoutes.get("/me", ensureAuthenticated, restrictTo("PROFESSIONAL"), professionalsController.me);
professionalsRoutes.get(
    "/students",
    ensureAuthenticated,
    restrictTo("PROFESSIONAL"),
    professionalsController.students,
);
