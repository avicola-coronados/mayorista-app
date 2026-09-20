import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";

const PREFLIGHT_PATHS = [
  "/api/admin/metricas-dashboard",
  "/api/admin/top-clientes",
  "/api/admin/merma-historica",
  "/api/jornadas/activa",
];

describe("CORS preflight", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp();
    server = http.createServer(app);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it.each(PREFLIGHT_PATHS)(
    "responde al preflight de %s desde el dominio personalizado",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "OPTIONS",
        headers: {
          Origin: "http://coronados.ariwalabs.com",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "authorization",
        },
      });

      expect([200, 204]).toContain(response.status);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        "http://coronados.ariwalabs.com",
      );
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
      expect(response.headers.get("access-control-allow-headers")?.toLowerCase()).toContain(
        "authorization",
      );
      expect(response.headers.get("access-control-allow-methods")?.toUpperCase()).toContain("GET");
    },
  );

  it("sigue permitiendo el origen anterior de Vercel", async () => {
    const response = await fetch(`${baseUrl}/api/admin/metricas-dashboard`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://mayorista-app-olive.vercel.app",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    expect([200, 204]).toContain(response.status);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://mayorista-app-olive.vercel.app",
    );
  });
});
