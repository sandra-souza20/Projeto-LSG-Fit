import { Router } from "express";
import { ExercisesController } from "../controllers/exercises.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const exercisesRoutes = Router();

const exercisesController = new ExercisesController();

exercisesRoutes.get("/", ensureAuthenticated, exercisesController.list);
exercisesRoutes.post("/", ensureAuthenticated, restrictTo("PROFESSIONAL"), exercisesController.create);
exercisesRoutes.delete("/:id", ensureAuthenticated, restrictTo("PROFESSIONAL"), exercisesController.remove);
