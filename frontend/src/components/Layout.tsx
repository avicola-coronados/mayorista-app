import type { ReactNode } from "react";
import { Navigate, NavLink } from "react-router-dom";
import { getHomeForRole, resolveAuthRole } from "../lib/authRouting";
import { useAuthStore } from "../store/authStore";

type LayoutProps = {
  title: string;
  subtitle?: string;
  statusBadge?: string;
  statusTone?: "open" | "closed";
  children: ReactNode;
};

const navItems = [
  { to: "/", label: "Inicio" },
  { to: "/pesada/nueva", label: "Pesadas" },
  { to: "/operario/guias", label: "Guías" },
  { to: "/clientes", label: "Clientes" },
  { to: "/cierre", label: "Historial" },
];

function formatRole(role?: string) {
  if (!role) {
    return "";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function Layout({ title, subtitle, statusBadge, statusTone = "open", children }: LayoutProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const role = resolveAuthRole(token, user?.role);

  if (role === "cajero") {
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return (
    <div className="min-h-screen bg-[#d8d8d8] pb-24">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-2 py-2 sm:px-2">
        <header className="overflow-hidden rounded-t-[16px] bg-white shadow-soft">
          <div className="flex min-h-[69px] items-center justify-between gap-4 bg-coronados-orange px-5 py-3 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#fff7ed] sm:h-[42px] sm:w-[42px]">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-dashed border-coronados-green text-center text-[6px] font-bold leading-tight text-coronados-green sm:h-[31px] sm:w-[31px]">
                  <span>
                    Frescura
                    <br />
                    Garantizada
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-[24px] font-bold leading-none sm:text-[30px]">
                  Coronados
                </p>
                <p className="mt-1 text-[14px] font-semibold uppercase leading-none tracking-[0.23em] sm:text-[18px]">
                  Avícola
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[14px] font-bold leading-tight text-white sm:text-[16px]">
                {user?.username}
              </p>
              <p className="mt-1 text-[13px] font-medium leading-tight text-white sm:text-[14px]">
                {formatRole(user?.role)}
              </p>
              <button
                type="button"
                onClick={() => clearAuth()}
                className="mt-2 rounded-[8px] bg-coronados-green px-3 py-2 text-[12px] font-bold text-white transition hover:bg-green-700 sm:text-[13px]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <div className="flex min-h-[38px] items-center justify-between gap-4 bg-coronados-green px-5 py-2 text-white sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold sm:text-[16px]">{title}</p>
              {subtitle ? <p className="mt-1 text-[12px] font-medium text-white/75 sm:hidden">{subtitle}</p> : null}
            </div>

            {statusBadge ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] font-bold leading-none sm:text-[13px] ${
                  statusTone === "closed"
                    ? "bg-neutral-200 text-neutral-700"
                    : "bg-white/25 text-white"
                }`}
              >
                {statusBadge}
                <span
                  className={`h-[5px] w-[5px] rounded-full ${
                    statusTone === "closed" ? "bg-neutral-500" : "bg-white"
                  }`}
                />
              </span>
            ) : null}
          </div>
        </header>

        <main className="flex-1 bg-[#f3f3f3] px-4 py-4">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-2 z-20 mx-auto w-[calc(100%-1rem)] max-w-7xl overflow-hidden rounded-b-[16px] bg-white px-4 py-2 shadow-2xl shadow-slate-900/10">
        <div className="grid grid-cols-4 gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-[8px] px-3 py-1 text-center text-[12px] font-semibold transition ${
                  isActive
                    ? "text-coronados-orange"
                    : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-[19px] w-[19px] rounded-[5px] ${
                      isActive ? "bg-orange-100" : "bg-neutral-100"
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
