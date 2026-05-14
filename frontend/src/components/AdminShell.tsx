import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type AdminShellProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  beforeTitle?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/jornadas", label: "Jornadas" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/granjas", label: "Granjas" },
  { to: "/admin/reportes", label: "Reportes" },
  { to: "/admin/usuarios", label: "Usuarios" },
  { to: "/admin/config", label: "Config." },
];

export function AdminShell({ actions, beforeTitle, children, subtitle, title }: AdminShellProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="flex min-h-screen">
        <aside className="flex w-[175px] shrink-0 flex-col bg-coronados-orange text-white">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-[#fff7ed]">
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-coronados-green text-center text-[5px] font-bold leading-tight text-coronados-green">
                  <span>
                    Frescura
                    <br />
                    Garantizada
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[16px] font-bold leading-none">Coronados</p>
                <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em]">Avícola</p>
              </div>
            </div>
          </div>

          <nav className="flex-1">
            {navItems.map((item) => {
              const active = item.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block cursor-pointer px-5 py-3 text-[15px] font-medium text-white transition ${
                    active ? "bg-black/15" : "hover:bg-black/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mx-5 mb-5 border-t border-white/25 pt-5">
            <p className="text-[14px] font-bold leading-tight">{user?.nombre ?? "María"} (Admin)</p>
            <p className="mt-1 text-[12px] font-medium text-white/75">Dueña · acceso total</p>
            <button
              type="button"
              onClick={clearAuth}
              className="mt-3 text-[12px] font-medium text-white/80 underline-offset-2 hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#F5F5F5]">
          <header className="flex items-center justify-between gap-4 bg-coronados-orange px-[30px] py-5 text-white">
            <div className="flex min-w-0 items-start gap-3">
              {beforeTitle}
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-medium leading-tight">{title}</h1>
                <p className="mt-1 text-[13px] font-medium text-white/85">{subtitle}</p>
              </div>
            </div>
            {actions}
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
