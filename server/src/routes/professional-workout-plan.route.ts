import { Router } from "express";
import { ProfessionalWorkoutPlanController } from "../controllers/professional-workout-plan.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const professionalWorkoutPlanRoutes = Router({ mergeParams: true });

const professionalWorkoutPlanController = new ProfessionalWorkoutPlanController();

professionalWorkoutPlanRoutes.use(ensureAuthenticated, restrictTo("PROFESSIONAL"));
professionalWorkoutPlanRoutes.get("/", professionalWorkoutPlanController.list);
professionalWorkoutPlanRoutes.post("/", professionalWorkoutPlanController.create);
professionalWorkoutPlanRoutes.patch("/:id", professionalWorkoutPlanController.update);
professionalWorkoutPlanRoutes.delete("/:id", professionalWorkoutPlanController.remove);
