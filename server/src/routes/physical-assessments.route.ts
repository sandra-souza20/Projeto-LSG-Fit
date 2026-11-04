import { Router } from "express";
import { PhysicalAssessmentsController } from "../controllers/physical-assessments.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const physicalAssessmentsRoutes = Router();

const physicalAssessmentsController = new PhysicalAssessmentsController();

// RNF05: so o proprio aluno; a academia nunca acessa avaliacoes fisicas.
physicalAssessmentsRoutes.use(ensureAuthenticated, restrictTo("STUDENT"));
physicalAssessmentsRoutes.get("/", physicalAssessmentsController.list);
physicalAssessmentsRoutes.post("/", physicalAssessmentsController.create);
