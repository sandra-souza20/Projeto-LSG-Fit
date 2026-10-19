import { config } from "dotenv";

// Importado antes de tudo no index.ts: em ES Modules os imports rodam antes do
// corpo do arquivo, entao o .env.local precisa ser carregado no seu proprio modulo.
config({ path: ".env.local" });
