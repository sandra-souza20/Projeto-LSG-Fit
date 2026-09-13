import { Router } from "express";
import { PhysicalAssessmentsController } from "../controllers/physical-assessments.controller.js";
import { ensureAuthenticated } from "../middlewares/ensure-authenticated.js";

export const physicalAssessmentsRoutes = Router();

const physicalAssessmentsController = new PhysicalAssessmentsController();

physicalAssessmentsRoutes.use(ensureAuthenticated);
physicalAssessmentsRoutes.get("/", physicalAssessmentsController.list);
physicalAssessmentsRoutes.post("/", physicalAssessmentsController.create);
