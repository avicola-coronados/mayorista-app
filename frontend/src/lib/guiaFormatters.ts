export function formatGuiaPeso(value: number | null | undefined): string {
  if (value == null || value === 0) {
    return "—";
  }

  return `${new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} kg`;
}

export function formatGuiaImporte(value: number | null | undefined): string {
  if (value == null || value === 0) {
    return "—";
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatGuiaEntero(value: number | null | undefined): string {
  if (value == null || value === 0) {
    return "—";
  }

  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatGuiaJabas(value: number | null | undefined): string {
  if (value == null) {
    return "—";
  }

  if (value === 0) {
    return "0";
  }

  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatGuiaFechaTitulo(value: string) {
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
