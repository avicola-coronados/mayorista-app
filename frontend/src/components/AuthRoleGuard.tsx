import { Navigate, useLocation } from "react-router-dom";
import { getPostLoginPath, resolveAuthRole } from "../lib/authRouting";
import { useAuthStore } from "../store/authStore";

const operarioPaths = ["/pesada", "/clientes", "/cierre", "/operario"];
const cajeroPaths = ["/cajero"];
const adminPaths = ["/admin"];

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AuthRoleGuard() {
  const location = useLocation();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = resolveAuthRole(token, user?.role);

  if (!hasHydrated || !token || !role || location.pathname === "/login") {
    return null;
  }

  const home = getPostLoginPath(role);
  const onOperarioRoute = matchesPath(location.pathname, operarioPaths);
  const onCajeroRoute = matchesPath(location.pathname, cajeroPaths);
  const onAdminRoute = matchesPath(location.pathname, adminPaths);

  if (role === "cajero" && (onOperarioRoute || onAdminRoute || location.pathname === "/")) {
    return <Navigate to="/cajero/clientes" replace />;
  }

  if (role === "operario" && (onCajeroRoute || onAdminRoute || location.pathname === "/")) {
    return <Navigate to="/pesada/nueva" replace />;
  }

  if (role === "admin" && (onOperarioRoute || onCajeroRoute || location.pathname === "/")) {
    return <Navigate to={home} replace />;
  }

  if (location.pathname === "/" && home !== "/login") {
    return <Navigate to={home} replace />;
  }

  return null;
}
