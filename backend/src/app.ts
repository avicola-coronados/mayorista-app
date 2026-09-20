import cors from "cors";
import express from "express";
import { createCorsOptions } from "./config/cors";
import { errorMiddleware } from "./errors/error.middleware";
import { requireAuth } from "./middleware/auth.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { cajeroRouter } from "./modules/cajero/cajero.routes";
import { guiasRouter } from "./modules/guias/guias.routes";
import { preciosRouter } from "./modules/precios/precios.routes";
import { clientesRouter } from "./modules/clientes/clientes.routes";
import { devolucionesRouter } from "./modules/devoluciones/devoluciones.routes";
import { granjasRouter } from "./modules/granjas/granjas.routes";
import { jornadasRouter } from "./modules/jornadas/jornadas.routes";
import { lineasVentaRouter } from "./modules/lineas-venta/lineas-venta.routes";
import { sobranteRouter } from "./modules/sobrante/sobrante.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";
import { adminRouter } from "./routes/admin.routes";

export function createApp() {
  const app = express();
  const corsOptions = createCorsOptions();

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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
  app.use("/api/devoluciones", requireAuth, devolucionesRouter);
  app.use("/api/lineas-venta", requireAuth, lineasVentaRouter);
  app.use("/api/sobrante", requireAuth, sobranteRouter);
  app.use("/api/usuarios", requireAuth, usuariosRouter);
  app.use("/api/admin", requireAuth, adminRouter);
  app.use("/api/cajero", requireAuth, cajeroRouter);
  app.use("/api/guias", guiasRouter);
  app.use("/api/precios", preciosRouter);

  app.use(errorMiddleware);

  return app;
}
