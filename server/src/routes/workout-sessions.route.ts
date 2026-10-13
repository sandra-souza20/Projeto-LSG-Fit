import { Router } from "express";
import { WorkoutSessionsController } from "../controllers/workout-sessions.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const workoutSessionsRoutes = Router();

const workoutSessionsController = new WorkoutSessionsController();

workoutSessionsRoutes.use(ensureAuthenticated, restrictTo("STUDENT"));
workoutSessionsRoutes.get("/", workoutSessionsController.list);
workoutSessionsRoutes.post("/", workoutSessionsController.create);
