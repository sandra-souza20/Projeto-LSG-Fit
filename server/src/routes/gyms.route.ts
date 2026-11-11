import { Router } from "express";
import { GymsController } from "../controllers/gyms.controller.js";
import { GymCheckInsController } from "../controllers/gym-check-ins.controller.js";
import { checkWebOrigin } from "../middlewares/check-web-origin.js";
import { ensureAuthenticated, restrictTo, restrictToGymOwner } from "../middlewares/ensure-authenticated.js";
import {
    codeVerifyRateLimit,
    emailSendRateLimit,
    loginRateLimit,
    signupRateLimit,
} from "../middlewares/rate-limit.js";

export const gymsRoutes = Router();

const gymsController = new GymsController();
const gymCheckInsController = new GymCheckInsController();

// Autenticacao dos membros da academia (app web, sessao por cookie).
gymsRoutes.post("/", checkWebOrigin, signupRateLimit, gymsController.create);
gymsRoutes.post("/sessions", checkWebOrigin, loginRateLimit, gymsController.login);
gymsRoutes.post("/forgot-password", checkWebOrigin, emailSendRateLimit, gymsController.forgotPassword);
gymsRoutes.post("/reset-password", checkWebOrigin, codeVerifyRateLimit, gymsController.resetPassword);
// Convite de membro: pagina "aceitar convite" do app web (token no corpo).
gymsRoutes.post("/members/invite", checkWebOrigin, codeVerifyRateLimit, gymsController.memberInvite);
gymsRoutes.post("/members/activate", checkWebOrigin, codeVerifyRateLimit, gymsController.activateMember);
gymsRoutes.get("/", gymsController.listAll);

gymsRoutes.get("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.me);
gymsRoutes.patch("/me", ensureAuthenticated, restrictTo("GYM"), gymsController.updateMe);

// Membro logado (a pessoa).
gymsRoutes.get("/me/account", ensureAuthenticated, restrictTo("GYM"), gymsController.account);
gymsRoutes.patch("/me/account", ensureAuthenticated, restrictTo("GYM"), gymsController.updateAccount);

// Membros da academia: todos veem; so o dono convida e remove.
gymsRoutes.get("/me/members", ensureAuthenticated, restrictTo("GYM"), gymsController.members);
gymsRoutes.post(
    "/me/members",
    ensureAuthenticated,
    restrictTo("GYM"),
    restrictToGymOwner,
    emailSendRateLimit,
    gymsController.inviteMember,
);
gymsRoutes.post(
    "/me/members/:memberId/resend-invite",
    ensureAuthenticated,
    restrictTo("GYM"),
    restrictToGymOwner,
    emailSendRateLimit,
    gymsController.resendMemberInvite,
);
gymsRoutes.delete(
    "/me/members/:memberId",
    ensureAuthenticated,
    restrictTo("GYM"),
    restrictToGymOwner,
    gymsController.removeMember,
);

// Profissionais da academia (relacao "Contrata" do DER).
gymsRoutes.get("/me/professionals", ensureAuthenticated, restrictTo("GYM"), gymsController.professionals);
gymsRoutes.get(
    "/me/professionals/:professionalId",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.professionalDetails,
);
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
// Matricula pelo e-mail do aluno (o aluno nao escolhe academia no app).
gymsRoutes.post("/me/students", ensureAuthenticated, restrictTo("GYM"), gymsController.enrollStudent);
gymsRoutes.get("/me/students/:studentId", ensureAuthenticated, restrictTo("GYM"), gymsController.studentDetails);
gymsRoutes.get(
    "/me/students/:studentId/workout-sessions",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.studentWorkoutSessions,
);
gymsRoutes.delete("/me/students/:studentId", ensureAuthenticated, restrictTo("GYM"), gymsController.removeStudent);
gymsRoutes.post(
    "/me/students/:studentId/deactivate",
    ensureAuthenticated,
    restrictTo("GYM"),
    gymsController.deactivateStudent,
);
gymsRoutes.post("/me/students/:studentId/activate", ensureAuthenticated, restrictTo("GYM"), gymsController.activateStudent);

// Check-ins dos alunos: fila em tempo real (SSE), aprovar e negar.
gymsRoutes.get("/me/check-ins", ensureAuthenticated, restrictTo("GYM"), gymCheckInsController.list);
gymsRoutes.get("/me/check-ins/stream", ensureAuthenticated, restrictTo("GYM"), gymCheckInsController.stream);
gymsRoutes.post("/me/check-ins/:checkInId/approve", ensureAuthenticated, restrictTo("GYM"), gymCheckInsController.approve);
gymsRoutes.post("/me/check-ins/:checkInId/deny", ensureAuthenticated, restrictTo("GYM"), gymCheckInsController.deny);
