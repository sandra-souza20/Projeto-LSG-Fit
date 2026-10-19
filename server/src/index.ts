import "./env.js";
import cors from "cors";
import express from "express";
import { routes } from "./routes/routes.js";

const app = express();
const port = Number(process.env["PORT"]) || 3333;

app.use(cors());
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(routes);

app.listen(port, () => console.log(`Server is running on port ${port}`))