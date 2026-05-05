import { Prisma } from "@prisma/client";

type Serializable =
  | string
  | number
  | boolean
  | null
  | Serializable[]
  | { [key: string]: Serializable };

export function serializePrisma<T>(value: T): Serializable {
  if (value === null || value === undefined) {
    return value as Serializable;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializePrisma(item));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce(
      (accumulator, [key, item]) => {
        accumulator[key] = serializePrisma(item);
        return accumulator;
      },
      {} as Record<string, Serializable>,
    );
  }

  return value as Serializable;
}
