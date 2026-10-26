/**
 * Month/day helpers on plain ISO strings ("2026-09", "2026-09-01"), computed in
 * UTC so the local time zone can never shift a date.
 */

export const MONTH_NAMES = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
];

/** Index 0 = Monday (ISO weekday 1). */
export const WEEKDAY_NAMES = [
  "pondělí",
  "úterý",
  "středa",
  "čtvrtek",
  "pátek",
  "sobota",
  "neděle",
];
export const WEEKDAY_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export type CalendarDay = {
  /** ISO date, e.g. "2026-09-01". */
  date: string;
  day: number;
  /** 0 = Monday … 6 = Sunday. */
  weekdayIndex: number;
  isWeekend: boolean;
  /** Czech public holiday name, or null. */
  holiday: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function toMonthKey(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(key: string) {
  return MONTH_KEY.test(key);
}

export function parseMonthKey(key: string) {
  const match = MONTH_KEY.exec(key);
  if (!match) {
    throw new Error(`Invalid month key: ${key}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** Local calendar date of `date` as ISO "2026-10-26". */
export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "26. 10. 2026" */
export function formatDate(date: Date) {
  return `${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

/**
 * Czech noun agreement: 1 → `one`, 2–4 → `few`, otherwise `many`.
 * plural(3, "osoba", "osoby", "osob") → "3 osoby"
 */
export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return `${n} ${one}`;
  if (n >= 2 && n <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function currentMonthKey(now = new Date()) {
  return toMonthKey(now.getFullYear(), now.getMonth() + 1);
}

export function addMonths(key: string, delta: number) {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + delta;
  return toMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

/** "září 2026" */
export function formatMonth(key: string) {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Easter Sunday (Gregorian, anonymous algorithm) as month/day. */
export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function isoFromUtc(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Czech public holidays (státní svátky a ostatní svátky) for a year. */
export function czechHolidays(year: number): Map<string, string> {
  const fixed: [number, number, string][] = [
    [1, 1, "Den obnovy samostatného českého státu, Nový rok"],
    [5, 1, "Svátek práce"],
    [5, 8, "Den vítězství"],
    [7, 5, "Den slovanských věrozvěstů Cyrila a Metoděje"],
    [7, 6, "Den upálení mistra Jana Husa"],
    [9, 28, "Den české státnosti"],
    [10, 28, "Den vzniku samostatného československého státu"],
    [11, 17, "Den boje za svobodu a demokracii"],
    [12, 24, "Štědrý den"],
    [12, 25, "1. svátek vánoční"],
    [12, 26, "2. svátek vánoční"],
  ];
  const holidays = new Map<string, string>();
  for (const [month, day, name] of fixed) {
    holidays.set(`${year}-${pad(month)}-${pad(day)}`, name);
  }
  const easter = easterSunday(year);
  const sunday = Date.UTC(year, easter.month - 1, easter.day);
  const DAY = 86_400_000;
  holidays.set(isoFromUtc(new Date(sunday - 2 * DAY)), "Velký pátek");
  holidays.set(isoFromUtc(new Date(sunday + DAY)), "Velikonoční pondělí");
  return holidays;
}

export function monthDays(key: string): CalendarDay[] {
  const { year, month } = parseMonthKey(key);
  const holidays = czechHolidays(year);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const weekdayIndex =
      (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
    return {
      date,
      day,
      weekdayIndex,
      isWeekend: weekdayIndex >= 5,
      holiday: holidays.get(date) ?? null,
    };
  });
}

/** "1. 9." */
export function formatShortDate(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day}. ${month}.`;
}

/** Weekdays that are not public holidays. */
export function countWorkdays(days: CalendarDay[]) {
  return days.filter((d) => !d.isWeekend && !d.holiday).length;
}

/** The same weekday a week earlier, or null when that falls in another month. */
export function weekAgoInMonth(day: CalendarDay, days: CalendarDay[]) {
  return days.find((d) => d.day === day.day - 7)?.date ?? null;
}
