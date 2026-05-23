import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { AuthRoleGuard } from "./AuthRoleGuard";
import { useAuthStore } from "../store/authStore";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthRoleGuard />
      <Routes>
        <Route path="/pesada/nueva" element={<div>Pantalla operario</div>} />
        <Route path="/cajero/clientes" element={<div>Caja clientes</div>} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthRoleGuard", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: "token",
      user: { id: 1, username: "cajero", role: "cajero" },
      hasHydrated: true,
    });
  });

  it("sends cajero away from operario routes", async () => {
    renderAt("/pesada/nueva");

    expect(await screen.findByText("Caja clientes")).toBeInTheDocument();
  });

  it("sends cajero away from admin routes", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AuthRoleGuard />
        <Routes>
          <Route path="/admin" element={<div>Admin dashboard</div>} />
          <Route path="/cajero/clientes" element={<div>Caja clientes</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Caja clientes")).toBeInTheDocument();
  });
});
