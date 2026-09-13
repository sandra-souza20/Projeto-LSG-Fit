import { Router } from "express";
import { WorkoutPlanController } from "../controllers/workout-plan.controller.js";
import { ensureAuthenticated } from "../middlewares/ensure-authenticated.js";

export const workoutPlanRoutes = Router();

const workoutPlanController = new WorkoutPlanController();

workoutPlanRoutes.use(ensureAuthenticated);
workoutPlanRoutes.get("/", workoutPlanController.list);
workoutPlanRoutes.patch("/:id", workoutPlanController.registerWeight);
