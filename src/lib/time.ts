export const MS = {
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const;

export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
  totalMs: number;
  /** Fractional age in years (e.g. 24.531234) */
  decimalYears: number;
}

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
  totalMs: number;
}

export interface PeriodProgress {
  start: Date;
  end: Date;
  fraction: number; // 0..1
  percent: number; // 0..100
  remainingMs: number;
}

export interface YearProgress extends PeriodProgress {
  year: number;
  dayOfYear: number;
  daysInYear: number;
  daysRemaining: number;
  weekOfYear: number;
  quarter: number;
}

export const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
export const daysInYear = (y: number) => (isLeapYear(y) ? 366 : 365);
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Same calendar date/time as `base`, but in `year` (Feb 29 clamps to Feb 28). */
export function anniversary(base: Date, year: number): Date {
  const m = base.getMonth();
  const d = Math.min(base.getDate(), daysInMonth(year, m));
  return new Date(year, m, d, base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
}

export function addMonthsClamped(base: Date, months: number): Date {
  const total = base.getMonth() + months;
  const y = base.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const d = Math.min(base.getDate(), daysInMonth(y, m));
  return new Date(y, m, d, base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function breakdownMs(totalMs: number): Duration {
  const t = Math.max(0, totalMs);
  return {
    days: Math.floor(t / MS.day),
    hours: Math.floor((t % MS.day) / MS.hour),
    minutes: Math.floor((t % MS.hour) / MS.minute),
    seconds: Math.floor((t % MS.minute) / MS.second),
    ms: Math.floor(t % MS.second),
    totalMs: t,
  };
}

export function computeAge(birth: Date, nowDate: Date): AgeBreakdown {
  const now = nowDate.getTime();
  const totalMs = Math.max(0, now - birth.getTime());

  // Years
  let years = nowDate.getFullYear() - birth.getFullYear();
  let cursor = anniversary(birth, birth.getFullYear() + years);
  if (cursor.getTime() > now) {
    years -= 1;
    cursor = anniversary(birth, birth.getFullYear() + years);
  }
  years = Math.max(0, years);

  // Months
  let months = 0;
  for (let i = 1; i <= 12; i++) {
    const next = addMonthsClamped(cursor, i);
    if (next.getTime() > now) break;
    months = i;
  }
  cursor = addMonthsClamped(cursor, months);

  // Days (DST-safe using calendar day stepping)
  let days = Math.floor((now - cursor.getTime()) / MS.day);
  let dayCursor = addDays(cursor, days);
  if (dayCursor.getTime() > now) {
    days -= 1;
    dayCursor = addDays(cursor, days);
  } else {
    const nextDay = addDays(dayCursor, 1);
    if (nextDay.getTime() <= now) {
      days += 1;
      dayCursor = nextDay;
    }
  }
  days = Math.max(0, days);

  const rest = breakdownMs(now - dayCursor.getTime());

  // Decimal years: years + fraction of current life-year
  const yStart = anniversary(birth, birth.getFullYear() + years);
  const yEnd = anniversary(birth, birth.getFullYear() + years + 1);
  const frac = clamp((now - yStart.getTime()) / (yEnd.getTime() - yStart.getTime()), 0, 1);

  return {
    years,
    months,
    days,
    hours: rest.hours,
    minutes: rest.minutes,
    seconds: rest.seconds,
    ms: rest.ms,
    totalMs,
    decimalYears: years + frac,
  };
}

export function nextBirthday(birth: Date, nowDate: Date) {
  const now = nowDate.getTime();
  let year = nowDate.getFullYear();
  let date = anniversary(birth, year);
  if (date.getTime() <= now) {
    year += 1;
    date = anniversary(birth, year);
  }
  const prev = anniversary(birth, year - 1);
  const remainingMs = date.getTime() - now;
  const fraction = clamp((now - prev.getTime()) / (date.getTime() - prev.getTime()), 0, 1);
  return {
    date,
    turning: year - birth.getFullYear(),
    remaining: breakdownMs(remainingMs),
    remainingMs,
    fraction,
    percent: fraction * 100,
    isToday:
      birth.getMonth() === nowDate.getMonth() &&
      Math.min(birth.getDate(), daysInMonth(nowDate.getFullYear(), birth.getMonth())) === nowDate.getDate(),
  };
}

export function periodProgress(start: Date, end: Date, nowDate: Date): PeriodProgress {
  const now = nowDate.getTime();
  const fraction = clamp((now - start.getTime()) / (end.getTime() - start.getTime()), 0, 1);
  return { start, end, fraction, percent: fraction * 100, remainingMs: Math.max(0, end.getTime() - now) };
}

export function dayOfYear(d: Date): number {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / MS.day) + 1;
}

export function yearProgress(nowDate: Date): YearProgress {
  const y = nowDate.getFullYear();
  const base = periodProgress(new Date(y, 0, 1), new Date(y + 1, 0, 1), nowDate);
  const doy = dayOfYear(nowDate);
  const diy = daysInYear(y);
  return {
    ...base,
    year: y,
    dayOfYear: doy,
    daysInYear: diy,
    daysRemaining: diy - doy,
    weekOfYear: Math.ceil(doy / 7),
    quarter: Math.floor(nowDate.getMonth() / 3) + 1,
  };
}

export function dayProgress(nowDate: Date): PeriodProgress {
  const s = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  return periodProgress(s, addDays(s, 1), nowDate);
}

/** Week starting Monday */
export function weekProgress(nowDate: Date): PeriodProgress {
  const s = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
  const dow = (s.getDay() + 6) % 7; // Mon=0
  const start = addDays(s, -dow);
  return periodProgress(start, addDays(start, 7), nowDate);
}

export function monthProgress(nowDate: Date): PeriodProgress {
  const s = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
  const e = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1);
  return periodProgress(s, e, nowDate);
}

export function quarterProgress(nowDate: Date): PeriodProgress {
  const q = Math.floor(nowDate.getMonth() / 3);
  const s = new Date(nowDate.getFullYear(), q * 3, 1);
  const e = new Date(nowDate.getFullYear(), q * 3 + 3, 1);
  return periodProgress(s, e, nowDate);
}

export function monthFraction(year: number, month: number, nowDate: Date): number {
  const s = new Date(year, month, 1);
  const e = new Date(year, month + 1, 1);
  return clamp((nowDate.getTime() - s.getTime()) / (e.getTime() - s.getTime()), 0, 1);
}

/** Next "round" day milestone: 1000-step below 10k, 5000-step after. */
export function nextDayMilestone(daysLived: number): number {
  const step = daysLived < 10_000 ? 1000 : 5000;
  return (Math.floor(daysLived / step) + 1) * step;
}

export const pad = (n: number, len = 2) => String(Math.floor(Math.abs(n))).padStart(len, "0");

export const fmtInt = (n: number) => Math.floor(n).toLocaleString("en-US");

export const fmtCompact = (n: number) => {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return fmtInt(n);
};

export const fmtPercent = (p: number, decimals = 6) => p.toFixed(decimals);

export const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const DAYS_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function fmtDate(d: Date) {
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTime(d: Date, h24 = true) {
  let h = d.getHours();
  const suffix = h24 ? "" : h >= 12 ? " PM" : " AM";
  if (!h24) h = h % 12 || 12;
  return `${pad(h)}:${pad(d.getMinutes())}${suffix}`;
}

/** Parse "YYYY-MM-DD" + "HH:MM" as local time without normalising invalid dates. */
export function parseLocal(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const timeMatch = time ? /^(\d{2}):(\d{2})$/.exec(time) : null;
  if (time && !timeMatch) return null;
  const hh = timeMatch ? Number(timeMatch[1]) : 0;
  const mm = timeMatch ? Number(timeMatch[2]) : 0;
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59) return null;

  // Date(year, ...) treats years 0–99 as 1900–1999. Starting from an epoch
  // and using setFullYear keeps the browser input's four-digit year intact.
  const dt = new Date(0);
  dt.setFullYear(y, m - 1, d);
  dt.setHours(hh, mm, 0, 0);
  if (isNaN(dt.getTime())) return null;
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d && dt.getHours() === hh && dt.getMinutes() === mm
    ? dt
    : null;
}

export function toDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function toTimeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
