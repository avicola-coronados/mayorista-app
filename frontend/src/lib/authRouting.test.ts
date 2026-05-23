import { describe, expect, it } from "vitest";
import { getHomeForRole, normalizeRole, resolveAuthRole } from "./authRouting";

describe("authRouting", () => {
  it("normalizes role casing", () => {
    expect(normalizeRole(" Cajero ")).toBe("cajero");
  });

  it("redirects each role to its home", () => {
    expect(getHomeForRole("admin")).toBe("/admin");
    expect(getHomeForRole("cajero")).toBe("/cajero/clientes");
    expect(getHomeForRole("operario")).toBe("/pesada/nueva");
  });

  it("prefers user role over token role", () => {
    const tokenRole = "operario";
    const payload = Buffer.from(JSON.stringify({ role: tokenRole })).toString("base64");
    const token = `header.${payload}.signature`;

    expect(resolveAuthRole(token, "cajero")).toBe("cajero");
  });
});
