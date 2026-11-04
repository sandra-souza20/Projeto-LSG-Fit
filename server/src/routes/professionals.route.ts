import { Router } from "express";
import { ProfessionalsController } from "../controllers/professionals.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";
import { professionalWorkoutPlanRoutes } from "./professional-workout-plan.route.js";
import { professionalPhysicalAssessmentsRoutes } from "./professional-physical-assessments.route.js";

export const professionalsRoutes = Router();

const professionalsController = new ProfessionalsController();

// O profissional e cadastrado pela academia (/gyms/me/professionals), entra
// pelo login unico (POST /sessions) e edita o perfil em /users/me.
professionalsRoutes.get("/", ensureAuthenticated, professionalsController.listAll);
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
