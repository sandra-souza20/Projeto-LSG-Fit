import "./env.js";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { routes } from "./routes/routes.js";

const app = express();
const port = Number(process.env["PORT"]) || 3333;

app.use(cors());
// RNF06: GIFs dos exercicios servidas com cache longo, para o celular baixar
// cada uma so uma vez e nao travar com internet movel instavel na academia.
app.use(
    "/media",
    express.static(fileURLToPath(new URL("../public/media", import.meta.url)), {
        maxAge: "7d",
    }),
);
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(routes);

app.listen(port, () => console.log(`Server is running on port ${port}`))