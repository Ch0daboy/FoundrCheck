export function laTodayWindow(tz: string = "America/Los_Angeles") {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // Create start/end in TZ by rendering midnight and 23:59:59 then converting to UTC ISO
  const startLocal = new Date(Date.UTC(y, m, d, 7, 0, 0)); // rough offset placeholder
  const endLocal = new Date(Date.UTC(y, m, d, 7 + 23, 59, 59));
  // TODO: Improve with temporal polyfill or luxon if needed
  return { startIso: startLocal.toISOString(), endIso: endLocal.toISOString() };
}


