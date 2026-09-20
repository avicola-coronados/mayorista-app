export type OperarioNavItem = {
  to: string;
  label: string;
  end?: boolean;
};

export const OPERARIO_NAV_ITEMS: OperarioNavItem[] = [
  { to: "/", label: "Inicio", end: true },
  { to: "/pesada/nueva", label: "Ingreso" },
  { to: "/pesada/piso", label: "Piso" },
  { to: "/clientes", label: "Clientes" },
  { to: "/cierre", label: "Historial" },
];
