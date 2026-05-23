import { describe, expect, it } from "vitest";
import { getHomeForRole, getPostLoginPath, normalizeRole, resolveAuthRole } from "./authRouting";

describe("authRouting", () => {
  it("normalizes role casing", () => {
    expect(normalizeRole(" Cajero ")).toBe("cajero");
  });

  it("redirects each role to its home", () => {
    expect(getPostLoginPath("admin")).toBe("/admin");
    expect(getPostLoginPath("cajero")).toBe("/cajero/clientes");
    expect(getPostLoginPath("operario")).toBe("/pesada/nueva");
    expect(getHomeForRole("cajero")).toBe("/cajero/clientes");
  });

  it("prefers user role over token role", () => {
    const tokenRole = "operario";
    const payload = Buffer.from(JSON.stringify({ role: tokenRole })).toString("base64");
    const token = `header.${payload}.signature`;

    expect(resolveAuthRole(token, "cajero")).toBe("cajero");
  });
});
