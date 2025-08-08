export function laTodayWindow(tz: string = "America/Los_Angeles") {
  const now = new Date();
  
  // Get today's date in the target timezone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit", 
    day: "2-digit",
  });
  
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value);

  // Create start of day (midnight) in the target timezone
  const startOfDay = new Date(year, month, day);
  
  // Format the start of day in the target timezone to get the correct UTC time
  const startFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Create end of day (23:59:59) in the target timezone
  const endOfDay = new Date(year, month, day, 23, 59, 59);
  
  // Convert to UTC ISO strings
  const startIso = startOfDay.toISOString();
  const endIso = endOfDay.toISOString();
  
  return { startIso, endIso };
}


