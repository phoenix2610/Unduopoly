const IST_OFFSET_MIN = 330;
const MIN = 60_000;

export interface IstDay {
  y: number;
  m: number;
  d: number;
}

export function istNow(now = new Date()): IstDay & { minutes: number } {
  const t = new Date(now.getTime() + IST_OFFSET_MIN * MIN);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    d: t.getUTCDate(),
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
  };
}

export function istDate(day: IstDay, minutes: number): Date {
  return new Date(Date.UTC(day.y, day.m, day.d, 0, minutes) - IST_OFFSET_MIN * MIN);
}

export function addDays(day: IstDay, n: number): IstDay {
  const t = new Date(Date.UTC(day.y, day.m, day.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() };
}

export function minutesBetween(a: Date | string, b: Date | string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MIN);
}

export function addMinutes(at: Date | string, n: number): Date {
  return new Date(new Date(at).getTime() + n * MIN);
}

const clock = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatClock(at: Date | string): string {
  return clock.format(new Date(at)).replace(/\s?([ap])\.?m\.?/i, " $1m").toLowerCase();
}

export function formatClock24(at: Date | string): string {
  const { minutes } = istNow(new Date(at));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function formatMinutesOfDay(minutes: number): string {
  return formatClock(istDate({ y: 2026, m: 0, d: 1 }, minutes));
}

export function formatDayLabel(at: Date | string, now = new Date()): string {
  const target = istNow(new Date(at));
  const today = istNow(now);
  const tomorrow = addDays(today, 1);
  const same = (a: IstDay, b: IstDay) => a.y === b.y && a.m === b.m && a.d === b.d;
  if (same(target, today)) return "Today";
  if (same(target, tomorrow)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(at));
}
