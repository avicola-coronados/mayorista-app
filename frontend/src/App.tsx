import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { RegistrarPesada } from "./pages/RegistrarPesada";
import { Clientes } from "./pages/Clientes";
import { CierreJornada } from "./pages/CierreJornada";
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
          <ProtectedRoute>
            <RegistrarPesada />
          </ProtectedRoute>
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
