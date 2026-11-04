import { Router } from "express";
import { GymsController } from "../controllers/gyms.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";
import {
    codeVerifyRateLimit,
    emailSendRateLimit,
    loginRateLimit,
    signupRateLimit,
} from "../middlewares/rate-limit.js";

export const gymsRoutes = Router();

const gymsController = new GymsController();

// Autenticacao da academia (app web, sessao por cookie).
gymsRoutes.post("/", signupRateLimit, gymsController.create);
gymsRoutes.post("/sessions", loginRateLimit, gymsController.login);
gymsRoutes.post("/forgot-password", emailSendRateLimit, gymsController.forgotPassword);
gymsRoutes.post("/reset-password", codeVerifyRateLimit, gymsController.resetPassword);
gymsRoutes.get("/", gymsController.listAll);

gymsRoutes.get("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.me);
gymsRoutes.patch("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.updateMe);

// Profissionais da academia (relacao "Contrata" do DER).
gymsRoutes.get("/me/professionals", ensureAuthenticated, restrictTo("GYM"), gymsController.professionals);
gymsRoutes.post(
    "/me/professionals",
    ensureAuthenticated,
    restrictTo("GYM"),
    emailSendRateLimit,
    gymsController.createProfessional,
);
gymsRoutes.post(
    "/me/professionals/:professionalId/resend-invite",
    ensureAuthenticated,
    restrictTo("GYM"),
    emailSendRateLimit,
    gymsController.resendProfessionalInvite,
);
gymsRoutes.delete(
    "/me/professionals/:professionalId",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.removeProfessional,
);

// Alunos matriculados (relacao "Matricula" do DER).
gymsRoutes.get("/me/students", ensureAuthenticated, restrictTo("GYM"), gymsController.students);
gymsRoutes.get(
    "/me/students/:studentId/workout-sessions",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.studentWorkoutSessions,
);
gymsRoutes.delete("/me/students/:studentId", ensureAuthenticated, restrictTo("GYM"), gymsController.removeStudent);
