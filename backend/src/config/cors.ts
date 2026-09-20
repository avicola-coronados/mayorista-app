import type { CorsOptions } from "cors";

export const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://mayorista-app-olive.vercel.app",
  "http://coronados.ariwalabs.com",
  "https://coronados.ariwalabs.com",
];

const ORIGIN_ENV_KEYS = [
  "FRONTEND_URLS",
  "CORS_ORIGIN",
  "ALLOWED_ORIGINS",
  "FRONTEND_URL",
  "CLIENT_URL",
] as const;

export function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

export function parseOriginList(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env) {
  const fromEnv = ORIGIN_ENV_KEYS.flatMap((key) => parseOriginList(env[key]));

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])];
}

export function isAllowedOrigin(origin: string, allowedOrigins = getAllowedOrigins()) {
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOrigins.some((allowedOrigin) => {
    const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);

    if (normalizedAllowedOrigin === normalizedOrigin) {
      return true;
    }

    if (!normalizedAllowedOrigin.includes("*")) {
      return false;
    }

    const pattern = new RegExp(
      `^${normalizedAllowedOrigin
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")}$`,
    );

    return pattern.test(normalizedOrigin);
  });
}

export function createCorsOptions(allowedOrigins = getAllowedOrigins()): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };
}
