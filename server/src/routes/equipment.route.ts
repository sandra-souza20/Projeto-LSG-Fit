import { Router } from "express";
import { listEquipment } from "../utils/equipment.js";

// Lista fixa de equipamentos (publica): usada no cadastro de exercicio e na
// tela de equipamentos da academia.
export const equipmentRoutes = Router();

equipmentRoutes.get("/", (_req, res) => {
    res.status(200).json(listEquipment());
});
