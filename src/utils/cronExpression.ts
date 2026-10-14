import type { TFunction } from "i18next";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const WEEKDAY_NAMES: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

function isAny(value: string) {
  return value === "*" || value === "?";
}

function toNumber(value: string, min: number, max: number) {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= min && number <= max ? number : null;
}

function parseStep(value: string) {
  const match = value.match(/^(?:\*|0)\/(\d+)$/);
  if (!match) return null;
  const step = Number(match[1]);
  return step > 0 ? step : null;
}

function formatTime(hour: string, minute: string) {
  const parsedHour = toNumber(hour, 0, 23);
  const parsedMinute = toNumber(minute, 0, 59);
  if (parsedHour === null || parsedMinute === null) return null;
  return `${String(parsedHour).padStart(2, "0")}:${String(parsedMinute).padStart(2, "0")}`;
}

function parseWeekday(value: string) {
  const upper = value.toUpperCase();
  if (upper in WEEKDAY_NAMES) return WEEKDAY_NAMES[upper];

  const quartzDay = toNumber(value, 1, 7);
  if (quartzDay === null) return null;
  return quartzDay === 1 ? 0 : quartzDay - 1;
}

function formatWeekdayToken(value: string, t: TFunction): string | null {
  if (value.includes("-")) {
    const [fromValue, toValue, ...rest] = value.split("-");
    if (rest.length > 0) return null;

    const from = parseWeekday(fromValue);
    const to = parseWeekday(toValue);
    if (from === null || to === null) return null;

    return t("jobSchedule.weekdayRange", {
      from: t(`job.weekday.${WEEKDAY_KEYS[from]}`),
      to: t(`job.weekday.${WEEKDAY_KEYS[to]}`),
    });
  }

  const weekday = parseWeekday(value);
  return weekday === null ? null : t(`job.weekday.${WEEKDAY_KEYS[weekday]}`);
}

function formatWeekdays(value: string, t: TFunction): string | null {
  const tokens = value.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  const labels = tokens.map((token) => formatWeekdayToken(token, t));
  if (labels.some((label) => label === null)) return null;

  return labels.join(t("jobSchedule.listSeparator"));
}

export function formatQuartzCronExpression(value: unknown, t: TFunction): string {
  if (typeof value !== "string") return "-";

  const expression = value.trim();
  const parts = expression.split(/\s+/);
  if (parts.length !== 6 && parts.length !== 7) return expression;

  const [second, minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (second !== "0" || month !== "*") return expression;

  const minuteStep = parseStep(minute);
  const hourStep = parseStep(hour);
  const fixedMinute = toNumber(minute, 0, 59);
  const fixedTime = formatTime(hour, minute);
  const noSpecificDay = isAny(dayOfMonth) && isAny(dayOfWeek);

  if (minuteStep !== null && hour === "*" && noSpecificDay) {
    return t("jobSchedule.everyMinutes", { count: minuteStep });
  }

  if (hourStep !== null && fixedMinute !== null && noSpecificDay) {
    return t("jobSchedule.everyHoursAtMinute", {
      count: hourStep,
      minute: String(fixedMinute).padStart(2, "0"),
    });
  }

  if (hour === "*" && fixedMinute !== null && noSpecificDay) {
    return t("jobSchedule.hourlyAtMinute", {
      minute: String(fixedMinute).padStart(2, "0"),
    });
  }

  if (!fixedTime) return expression;

  if (!isAny(dayOfWeek) && isAny(dayOfMonth)) {
    const weekdays = formatWeekdays(dayOfWeek, t);
    return weekdays ? t("jobSchedule.weeklySummary", { days: weekdays, time: fixedTime }) : expression;
  }

  if (!isAny(dayOfMonth) && isAny(dayOfWeek)) {
    const day = toNumber(dayOfMonth, 1, 31);
    return day === null ? expression : t("jobSchedule.monthlySummary", { day, time: fixedTime });
  }

  if (noSpecificDay) {
    return t("jobSchedule.dailySummary", { time: fixedTime });
  }

  return expression;
}
