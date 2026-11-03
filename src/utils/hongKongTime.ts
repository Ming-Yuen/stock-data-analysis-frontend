const timeZone = "Asia/Hong_Kong";
const dateInputFormatter = new Intl.DateTimeFormat("en", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hongKongDateInputValue(instant: Date): string {
  const parts = Object.fromEntries(dateInputFormatter.formatToParts(instant).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatHongKongDateTime(value: string, locale?: string): string {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return value;

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(instant);
}
