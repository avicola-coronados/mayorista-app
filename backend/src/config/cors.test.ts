import { describe, expect, it } from "vitest";
import {
  createCorsOptions,
  getAllowedOrigins,
  isAllowedOrigin,
  parseOriginList,
} from "./cors";

describe("parseOriginList", () => {
  it("separa valores por comas y elimina espacios y barras finales", () => {
    expect(
      parseOriginList(" http://coronados.ariwalabs.com/ , https://mayorista-app-olive.vercel.app/ "),
    ).toEqual([
      "http://coronados.ariwalabs.com",
      "https://mayorista-app-olive.vercel.app",
    ]);
  });
});

describe("getAllowedOrigins", () => {
  it("incluye los orígenes de producción y los de las variables de entorno", () => {
    const origins = getAllowedOrigins({
      FRONTEND_URLS: "https://mayorista-*.vercel.app, https://preview.example.com/",
      FRONTEND_URL: "http://localhost:4173/",
      CORS_ORIGIN: "https://extra.ariwalabs.com/",
    });

    expect(origins).toEqual(
      expect.arrayContaining([
        "http://localhost:5173",
        "https://mayorista-app-olive.vercel.app",
        "http://coronados.ariwalabs.com",
        "https://coronados.ariwalabs.com",
        "https://mayorista-*.vercel.app",
        "https://preview.example.com",
        "http://localhost:4173",
        "https://extra.ariwalabs.com",
      ]),
    );
  });
});

describe("isAllowedOrigin", () => {
  it("acepta los dos orígenes de producción aunque tengan barra final", () => {
    const origins = getAllowedOrigins({});

    expect(isAllowedOrigin("http://coronados.ariwalabs.com/", origins)).toBe(true);
    expect(isAllowedOrigin("https://coronados.ariwalabs.com", origins)).toBe(true);
    expect(isAllowedOrigin("https://mayorista-app-olive.vercel.app", origins)).toBe(true);
  });

  it("acepta patrones con comodín", () => {
    expect(
      isAllowedOrigin("https://mayorista-app-git-main-team.vercel.app", [
        "https://mayorista-*.vercel.app",
      ]),
    ).toBe(true);
  });
});

describe("createCorsOptions", () => {
  it("permite métodos y encabezados requeridos con credenciales", () => {
    const options = createCorsOptions();

    expect(options.credentials).toBe(true);
    expect(options.methods).toEqual(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
    expect(options.allowedHeaders).toEqual(["Content-Type", "Authorization"]);
    expect(options.optionsSuccessStatus).toBe(204);
  });
});
