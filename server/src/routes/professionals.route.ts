import { Router } from "express";
import { ProfessionalsController } from "../controllers/professionals.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";
import { professionalWorkoutPlanRoutes } from "./professional-workout-plan.route.js";
import { professionalPhysicalAssessmentsRoutes } from "./professional-physical-assessments.route.js";

export const professionalsRoutes = Router();

const professionalsController = new ProfessionalsController();

professionalsRoutes.post("/", professionalsController.create);
professionalsRoutes.post("/sessions", professionalsController.login);
professionalsRoutes.get("/", professionalsController.listAll);
professionalsRoutes.get("/me", ensureAuthenticated, restrictTo("PROFESSIONAL"), professionalsController.me);
professionalsRoutes.patch("/me", ensureAuthenticated, restrictTo("PROFESSIONAL"), professionalsController.updateMe);
professionalsRoutes.get(
    "/students",
    ensureAuthenticated,
    restrictTo("PROFESSIONAL"),
    professionalsController.students,
);
professionalsRoutes.get(
    "/students/:studentId/workout-sessions",
    ensureAuthenticated,
    restrictTo("PROFESSIONAL"),
    professionalsController.studentWorkoutSessions,
);
professionalsRoutes.use("/students/:studentId/workout-plan", professionalWorkoutPlanRoutes);
professionalsRoutes.use(
    "/students/:studentId/physical-assessments",
    professionalPhysicalAssessmentsRoutes,
);
