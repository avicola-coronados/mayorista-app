import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  IconCash,
  IconClock,
  IconReceipt,
  IconUsers,
} from "@tabler/icons-react";
import { useAuthStore } from "../../store/authStore";

const menuItems = [
  { label: "Clientes", href: "/cajero/clientes", icon: IconUsers },
  { label: "Pagos del día", href: "/cajero/pagos", icon: IconReceipt },
  { label: "Egresos", href: "/cajero/egresos", icon: IconCash },
  { label: "Historial", href: "/cajero/historial", icon: IconClock },
];

export function CajeroShell({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle: ReactNode;
  title: string;
}) {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const displayName = user?.nombre || user?.username || "Cajero";

  function handleLogout() {
    clearAuth();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-[175px] shrink-0 flex-col overflow-hidden bg-coronados-orange text-white">
          <div className="shrink-0 p-5">
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

          <nav className="min-h-0 flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 text-[15px] font-medium transition hover:bg-black/10 ${
                      isActive ? "bg-black/15" : ""
                    }`
                  }
                >
                  <Icon size={18} stroke={2.2} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mx-5 mb-5 shrink-0 border-t border-white/25 pt-5">
            <p className="text-[14px] font-bold leading-tight">{displayName} (Cajero)</p>
            <p className="mt-1 text-[12px] font-medium text-white/75">Caja · pagos y consultas</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-[8px] bg-coronados-green px-3 py-2 text-center text-[12px] font-bold text-white transition hover:bg-green-700"
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#F5F5F5]">
          <header className="flex items-center justify-between gap-4 bg-coronados-orange px-[30px] py-5 text-white">
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-medium leading-tight">{title}</h1>
              <p className="mt-1 text-[13px] font-medium text-white/85">{subtitle}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-bold">{displayName}</p>
              <p className="mt-1 text-[12px] font-medium capitalize text-white/80">{user?.role || "cajero"}</p>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
