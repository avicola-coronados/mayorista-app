import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  IconCash,
  IconClock,
  IconLogout,
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

  function handleLogout() {
    clearAuth();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      <aside className="flex w-[200px] shrink-0 flex-col bg-coronados-orange text-white">
        <div className="border-b border-white/20 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#fff7ed] text-[9px] font-bold leading-tight text-coronados-green">
              Frescura
            </div>
            <div>
              <p className="text-[16px] font-bold leading-none">Coronados</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em]">Avícola</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 text-[14px] font-bold transition hover:bg-black/10 ${
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

        <div className="px-4 pb-5">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-[8px] bg-coronados-green px-4 py-3 text-[14px] font-bold text-white transition hover:bg-green-700"
          >
            <IconLogout size={18} stroke={2.4} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between bg-coronados-orange px-[30px] py-5 text-white">
          <div>
            <h1 className="text-[20px] font-medium leading-tight">{title}</h1>
            <p className="mt-1 text-[13px] font-medium opacity-85">{subtitle}</p>
          </div>
          <div className="text-right">
            <p className="text-[14px] font-bold">{user?.nombre || user?.username || "cajero"}</p>
            <p className="mt-1 text-[12px] font-medium capitalize opacity-80">{user?.role || "cajero"}</p>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
