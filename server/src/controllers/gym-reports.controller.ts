import type { Request, Response } from "express";
import { buildMonthlyReport, monthlyReportCsv } from "../services/gym-monthly-report.service.js";
import { handleError } from "../utils/app-error.js";

// Relatorio mensal da academia (painel web). Qualquer membro pode ver.
export class GymReportsController {
    async monthly(req: Request, res: Response): Promise<Response> {
        try {
            const { report } = await buildMonthlyReport(req.gymId, req.query.month);
            return res.status(200).json(report);
        } catch (error) {
            return handleError(error, res);
        }
    }

    // Uma linha por aluno matriculado no fim do mes.
    async monthlyCsv(req: Request, res: Response): Promise<Response> {
        try {
            const { report, rows } = await buildMonthlyReport(req.gymId, req.query.month);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="relatorio-${report.month}.csv"`);
            return res.status(200).send(monthlyReportCsv(rows));
        } catch (error) {
            return handleError(error, res);
        }
    }
}
