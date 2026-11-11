import { Router } from "express";
import { WorkoutPlanController } from "../controllers/workout-plan.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const workoutPlanRoutes = Router();

const workoutPlanController = new WorkoutPlanController();

// Ficha do proprio aluno (o profissional usa /professionals/students/:id/workout-plan).
workoutPlanRoutes.use(ensureAuthenticated, restrictTo("STUDENT"));
workoutPlanRoutes.get("/", workoutPlanController.list);
workoutPlanRoutes.post("/", workoutPlanController.create);
workoutPlanRoutes.patch("/:id", workoutPlanController.update);
workoutPlanRoutes.delete("/:id", workoutPlanController.remove);
