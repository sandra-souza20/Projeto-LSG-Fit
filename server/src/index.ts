import "./env.js";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { WEB_ORIGIN } from "./middlewares/check-web-origin.js";
import { globalRateLimit } from "./middlewares/rate-limit.js";
import { routes } from "./routes/routes.js";
import { connectRedis } from "./utils/redis.js";

const app = express();
const port = Number(process.env["PORT"]) || 3333;

// TRUST_PROXY: numero de proxies na frente da API (ex.: 1 em producao), ou
// true/false. Sem a variavel, req.ip e o IP da conexao.
function trustProxySetting(raw: string | undefined): boolean | number | string {
    if (!raw) return false;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return /^\d+$/.test(raw) ? Number(raw) : raw;
}

app.set("trust proxy", trustProxySetting(process.env["TRUST_PROXY"]?.trim()));

if (!WEB_ORIGIN) {
    console.warn("WEB_ORIGIN nao definida: o app web nao passara no CORS nem na checagem de Origin.");
}

// So o app web da academia envia Origin (com cookie). O mobile nao envia
// Origin, entao o CORS nao o afeta.
app.use(
    cors({
        origin: WEB_ORIGIN ?? false,
        credentials: true,
        exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After"],
    }),
);
// RNF06: GIFs dos exercicios servidas com cache longo, para o celular baixar
// cada uma so uma vez e nao travar com internet movel instavel na academia.
app.use(
    "/media",
    express.static(fileURLToPath(new URL("../public/media", import.meta.url)), {
        maxAge: "7d",
    }),
);
app.use(globalRateLimit);
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
// Cookies: o ensureAuthenticated le o `sid` direto do header Cookie.
app.use(routes);

void connectRedis();

app.listen(port, () => console.log(`Server is running on port ${port}`))
