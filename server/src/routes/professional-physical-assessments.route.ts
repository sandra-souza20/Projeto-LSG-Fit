import { Router } from "express";
import { ProfessionalPhysicalAssessmentsController } from "../controllers/professional-physical-assessments.controller.js";
import { ensureAuthenticated, restrictTo } from "../middlewares/ensure-authenticated.js";

export const professionalPhysicalAssessmentsRoutes = Router({ mergeParams: true });

const professionalPhysicalAssessmentsController = new ProfessionalPhysicalAssessmentsController();

professionalPhysicalAssessmentsRoutes.use(ensureAuthenticated, restrictTo("PROFESSIONAL"));
professionalPhysicalAssessmentsRoutes.get("/", professionalPhysicalAssessmentsController.list);
professionalPhysicalAssessmentsRoutes.post("/", professionalPhysicalAssessmentsController.create);
