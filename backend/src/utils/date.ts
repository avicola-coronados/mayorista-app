const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Lima";

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

export function getCurrentDateInTimezone(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}
