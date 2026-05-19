import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { RegistrarPesada } from "./pages/RegistrarPesada";
import { RegistrarDevolucion } from "./pages/RegistrarDevolucion";
import { Clientes } from "./pages/Clientes";
import { CierreJornada } from "./pages/CierreJornada";
import { AdminGranjas } from "./pages/admin/AdminGranjas";
import { AdminJornadaDetalle, AdminJornadas } from "./pages/admin/AdminJornadas";
import { AdminClientes } from "./pages/admin/AdminClientes";
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = getRoleFromToken(token) ?? user?.role;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function ProtectedOperarioRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = getRoleFromToken(token) ?? user?.role;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function getRoleFromToken(token: string | null) {
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
    return decodedPayload.role ?? null;
  } catch {
    return null;
  }
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/jornadas"
        element={
          <ProtectedAdminRoute>
            <AdminJornadas />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/jornadas/:id"
        element={
          <ProtectedAdminRoute>
            <AdminJornadaDetalle />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/clientes"
        element={
          <ProtectedAdminRoute>
            <AdminClientes />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/granjas"
        element={
          <ProtectedAdminRoute>
            <AdminGranjas />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <Dashboard />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedAdminRoute>
            <Dashboard />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pesada/nueva"
        element={
          <ProtectedOperarioRoute>
            <RegistrarPesada />
          </ProtectedOperarioRoute>
        }
      />
      <Route
        path="/operario/devolucion"
        element={
          <ProtectedOperarioRoute>
            <RegistrarDevolucion />
          </ProtectedOperarioRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <Clientes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cierre"
        element={
          <ProtectedRoute>
            <CierreJornada />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
