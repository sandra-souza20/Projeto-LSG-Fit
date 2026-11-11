import { Router } from "express";
import { UsersController } from "../controllers/users.controller.js";
import { checkWebOrigin } from "../middlewares/check-web-origin.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";
import { codeVerifyRateLimit, emailSendRateLimit, signupRateLimit } from "../middlewares/rate-limit.js";

export const usersRoutes = Router();

const usersController = new UsersController();

// Cadastro livre, so de aluno.
usersRoutes.post("/", signupRateLimit, usersController.create);
usersRoutes.post("/verify", codeVerifyRateLimit, usersController.verify);
usersRoutes.post("/resend-verification", emailSendRateLimit, usersController.resendVerification);
usersRoutes.post("/forgot-password", emailSendRateLimit, usersController.forgotPassword);
usersRoutes.post("/reset-password", codeVerifyRateLimit, usersController.resetPassword);
// Primeiro acesso do profissional cadastrado pela academia, pela pagina
// "ativar conta" do app web (token do link no corpo, para nao ir para logs).
usersRoutes.post("/activate/invite", checkWebOrigin, codeVerifyRateLimit, usersController.invite);
usersRoutes.post("/activate", checkWebOrigin, codeVerifyRateLimit, usersController.activate);

usersRoutes.get("/me", ensureAuthenticated, restrictTo("STUDENT", "PROFESSIONAL"), usersController.me);
usersRoutes.patch("/me", ensureAuthenticated, restrictTo("STUDENT", "PROFESSIONAL"), usersController.updateMe);
usersRoutes.patch("/me/professional", ensureAuthenticated, restrictTo("STUDENT"), usersController.linkProfessional);
