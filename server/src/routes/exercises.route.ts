import { Router } from "express";
import { ExercisesController } from "../controllers/exercises.controller.js";
import { ensureAuthenticated } from "../middlewares/ensure-authenticated.js";

export const exercisesRoutes = Router();

const exercisesController = new ExercisesController();

// So leitura: a biblioteca e cadastrada pela LSG FIT (seed), para manter
// videos, GIFs e instrucoes no mesmo padrao em todas as academias.
exercisesRoutes.get("/", ensureAuthenticated, exercisesController.list);
