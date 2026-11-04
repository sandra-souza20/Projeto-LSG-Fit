import type { Request, Response } from "express";
import { AuthenticateUserService } from "../services/authenticate-user.service.js";
import { handleError } from "../utils/app-error.js";
import { startUserSession } from "../utils/account-session.js";

export class SessionsController {
    // Login unico de aluno e profissional (mobile). O papel vem do cadastro.
    async create(req: Request, res: Response): Promise<Response> {
        try {
            const authenticateUser = new AuthenticateUserService();

            const { user } = await authenticateUser.execute(req.body ?? {});
            const session = await startUserSession(req, res, user);

            return res.status(200).json({ user, ...session });
        } catch (error) {
            return handleError(error, res);
        }
    }
}
