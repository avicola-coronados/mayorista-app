import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { authRouter } from "./routes/auth.routes";
import { jornadasRouter } from "./routes/jornadas.routes";
import { granjasRouter } from "./routes/granjas.routes";
import { clientesRouter } from "./routes/clientes.routes";
import { lineasVentaRouter } from "./routes/lineas-venta.routes";
import { sobranteRouter } from "./routes/sobrante.routes";
import { requireAuth } from "./middleware/auth.middleware";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/jornadas", requireAuth, jornadasRouter);
app.use("/api/granjas", requireAuth, granjasRouter);
app.use("/api/clientes", requireAuth, clientesRouter);
app.use("/api/lineas-venta", requireAuth, lineasVentaRouter);
app.use("/api/sobrante", requireAuth, sobranteRouter);

app.use((error: Error, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  response.status(500).json({ message: "Ocurrió un error interno" });
});

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
