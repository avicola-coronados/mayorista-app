export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Lima";

export function getTimezoneOffsetForInstant(instant: Date, timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);

  const offsetName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offsetName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);

  if (!match) {
    return "+00:00";
  }

  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] ?? "00").padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

/** Inicio y fin del día calendario en la zona horaria de la app (p. ej. America/Lima). */
export function getDayRangeInTimezone(fecha?: string, timeZone = APP_TIMEZONE) {
  const dateKey = fecha ?? getCurrentDateInTimezone(new Date(), timeZone);
  const noonUtc = new Date(`${dateKey}T12:00:00.000Z`);
  const offset = getTimezoneOffsetForInstant(noonUtc, timeZone);
  const start = new Date(`${dateKey}T00:00:00.000${offset}`);
  const end = new Date(`${dateKey}T23:59:59.999${offset}`);

  return { dateKey, end, start };
}

export function getCurrentJornadaCode(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [day, month, year] = formatter.format(date).split("/");
  return `${day}${month}${year}`;
}

export function getCurrentDateInTimezone(date = new Date(), timeZone = APP_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}
