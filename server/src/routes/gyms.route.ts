import { Router } from "express";
import { GymsController } from "../controllers/gyms.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const gymsRoutes = Router();

const gymsController = new GymsController();

gymsRoutes.post("/", gymsController.create);
gymsRoutes.post("/sessions", gymsController.login);
gymsRoutes.get("/", gymsController.listAll);
gymsRoutes.get("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.me);
gymsRoutes.patch("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.updateMe);
gymsRoutes.get("/me/professionals", ensureAuthenticated, restrictTo("GYM"), gymsController.professionals);
gymsRoutes.patch(
    "/me/professionals/:professionalId/approve",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.approveProfessional,
);
gymsRoutes.delete(
    "/me/professionals/:professionalId",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.removeProfessional,
);
gymsRoutes.get("/me/students", ensureAuthenticated, restrictTo("GYM"), gymsController.students);
gymsRoutes.get(
    "/me/students/:studentId/workout-sessions",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.studentWorkoutSessions,
);
gymsRoutes.delete("/me/students/:studentId", ensureAuthenticated, restrictTo("GYM"), gymsController.removeStudent);
