import { Router } from "express";
import { usersRoutes } from "./users.route.js";
import { sessionsRoutes } from "./sessions.route.js";
import { exercisesRoutes } from "./exercises.route.js";
import { workoutPlanRoutes } from "./workout-plan.route.js";
import { professionalsRoutes } from "./professionals.route.js";
import { gymsRoutes } from "./gyms.route.js";

export const routes = Router();

routes.use("/users", usersRoutes);
routes.use("/sessions", sessionsRoutes);
routes.use("/exercises", exercisesRoutes);
routes.use("/workout-plan", workoutPlanRoutes);
routes.use("/professionals", professionalsRoutes);
routes.use("/gyms", gymsRoutes);
routes.get("/health", async (req, res) => {
    return res.status(200).json({
        message: "Server is up and running"
    });
});