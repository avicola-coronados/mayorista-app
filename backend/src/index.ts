import "dotenv/config";
import { createApp } from "./app";
import { ensureDefaultPrecio } from "./bootstrap/default-precio";
import { ensureDefaultProducto } from "./bootstrap/default-producto";
import { ensureDefaultUsers } from "./bootstrap/default-users";

const PORT = Number(process.env.PORT ?? 3000);
console.log(`Booting Coronados backend with PORT=${PORT}`);

const app = createApp();

async function startServer() {
  await ensureDefaultUsers();
  await ensureDefaultProducto();
  await ensureDefaultPrecio();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
