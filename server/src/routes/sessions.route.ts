import { Router } from "express";
import { SessionsController } from "../controllers/sessions.controller.js";
import { SessionManagementController } from "../controllers/session-management.controller.js";
import { ensureAuthenticated } from "../middlewares/ensure-authenticated.js";
import { loginRateLimit } from "../middlewares/rate-limit.js";

export const sessionsRoutes = Router();

const sessionsController = new SessionsController();
const sessionManagementController = new SessionManagementController();

// Login unico de aluno e profissional (mobile).
sessionsRoutes.post("/", loginRateLimit, sessionsController.create);

// Sessoes da conta logada (qualquer papel).
sessionsRoutes.get("/csrf", ensureAuthenticated, sessionManagementController.csrf);
sessionsRoutes.get("/", ensureAuthenticated, sessionManagementController.list);
sessionsRoutes.delete("/", ensureAuthenticated, sessionManagementController.revokeAll);
sessionsRoutes.delete("/:id", ensureAuthenticated, sessionManagementController.revokeOne);
