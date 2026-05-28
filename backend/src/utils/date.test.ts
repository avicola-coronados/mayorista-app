import { afterEach, describe, expect, it } from "vitest";
import { getDayRangeInTimezone } from "./date";

describe("getDayRangeInTimezone", () => {
  const previousTz = process.env.TZ;

  afterEach(() => {
    if (previousTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTz;
    }
  });

  it("incluye pagos de la noche en Perú aunque el servidor esté en UTC", () => {
    process.env.TZ = "UTC";

    const { end, start } = getDayRangeInTimezone("2026-05-27");
    const pagoNochePeru = new Date("2026-05-28T03:00:00.000Z");

    expect(pagoNochePeru.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(pagoNochePeru.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it("excluye pagos fuera del día calendario en Lima", () => {
    process.env.TZ = "UTC";

    const { end, start } = getDayRangeInTimezone("2026-05-27");
    const pagoDiaSiguiente = new Date("2026-05-28T05:01:00.000Z");

    expect(pagoDiaSiguiente.getTime()).toBeGreaterThan(end.getTime());
    expect(start.toISOString()).toBe("2026-05-27T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-28T04:59:59.999Z");
  });
});
