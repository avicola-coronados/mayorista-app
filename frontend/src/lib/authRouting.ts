export function normalizeRole(role?: string | null) {
  if (!role) {
    return null;
  }

  return role.trim().toLowerCase();
}

export function getRoleFromToken(token: string | null) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(window.atob(normalizedPayload)) as { role?: string };
    return normalizeRole(decodedPayload.role ?? null);
  } catch {
    return null;
  }
}

export function resolveAuthRole(token: string | null, userRole?: string | null) {
  return normalizeRole(userRole) ?? getRoleFromToken(token);
}

export function getPostLoginPath(role?: string | null) {
  switch (normalizeRole(role)) {
    case "admin":
      return "/admin";
    case "operario":
      return "/pesada/nueva";
    case "cajero":
      return "/cajero/clientes";
    default:
      return "/login";
  }
}

export function getHomeForRole(role?: string | null) {
  return getPostLoginPath(role);
}
