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
import { AdminUsuarios } from "./pages/admin/AdminUsuarios";
import { ClientesCajero } from "./pages/cajero/ClientesCajero";
import { DetalleClienteCajero } from "./pages/cajero/DetalleClienteCajero";
import { EgresosCajero } from "./pages/cajero/EgresosCajero";
import { getHomeForRole, resolveAuthRole } from "./lib/authRouting";
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleHomeRedirect() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = resolveAuthRole(token, user?.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomeForRole(role)} replace />;
}

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = resolveAuthRole(token, user?.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return <>{children}</>;
}

function ProtectedCajeroRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = resolveAuthRole(token, user?.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "cajero" && role !== "admin") {
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return <>{children}</>;
}

function ProtectedOperarioRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const role = resolveAuthRole(token, user?.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "operario") {
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return <>{children}</>;
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
        path="/admin/usuarios"
        element={
          <ProtectedAdminRoute>
            <AdminUsuarios />
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
        path="/cajero"
        element={
          <ProtectedCajeroRoute>
            <Navigate to="/cajero/clientes" replace />
          </ProtectedCajeroRoute>
        }
      />
      <Route
        path="/cajero/clientes"
        element={
          <ProtectedCajeroRoute>
            <ClientesCajero />
          </ProtectedCajeroRoute>
        }
      />
      <Route
        path="/cajero/clientes/:id"
        element={
          <ProtectedCajeroRoute>
            <DetalleClienteCajero />
          </ProtectedCajeroRoute>
        }
      />
      <Route
        path="/cajero/egresos"
        element={
          <ProtectedCajeroRoute>
            <EgresosCajero />
          </ProtectedCajeroRoute>
        }
      />
      <Route
        path="/"
        element={<RoleHomeRedirect />}
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
          <ProtectedOperarioRoute>
            <Clientes />
          </ProtectedOperarioRoute>
        }
      />
      <Route
        path="/cierre"
        element={
          <ProtectedOperarioRoute>
            <CierreJornada />
          </ProtectedOperarioRoute>
        }
      />
      <Route path="*" element={<RoleHomeRedirect />} />
    </Routes>
  );
}
