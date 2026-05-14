import "dotenv/config";
import cors from "cors";
import express from "express";
import { errorMiddleware } from "./errors/error.middleware";
import { requireAuth } from "./middleware/auth.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { clientesRouter } from "./modules/clientes/clientes.routes";
import { granjasRouter } from "./modules/granjas/granjas.routes";
import { jornadasRouter } from "./modules/jornadas/jornadas.routes";
import { lineasVentaRouter } from "./modules/lineas-venta/lineas-venta.routes";
import { sobranteRouter } from "./modules/sobrante/sobrante.routes";
import { adminRouter } from "./routes/admin.routes";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
console.log(`Booting Coronados backend with PORT=${PORT}`);
const allowedOrigins = (process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) {
      return true;
    }

    if (!allowedOrigin.includes("*")) {
      return false;
    }

    const pattern = new RegExp(
      `^${allowedOrigin
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")}$`,
    );

    return pattern.test(origin);
  });
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({ ok: true, service: "coronados-backend" });
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/jornadas", requireAuth, jornadasRouter);
app.use("/api/granjas", requireAuth, granjasRouter);
app.use("/api/clientes", requireAuth, clientesRouter);
app.use("/api/lineas-venta", requireAuth, lineasVentaRouter);
app.use("/api/sobrante", requireAuth, sobranteRouter);
app.use("/api/admin", requireAuth, adminRouter);

app.use(errorMiddleware);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
