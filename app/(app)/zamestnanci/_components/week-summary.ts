import { WEEKDAY_SHORT } from "@/lib/attendance/calendar";
import type { WeekTemplate } from "@/lib/attendance/model";

/** "Po–Pá", "Čt, Pá", or "Bez pravidelného rozvrhu". */
export function weekSummary(week: WeekTemplate) {
  const days = week.flatMap((shift, i) => (shift ? [i] : []));
  if (days.length === 0) return "Bez pravidelného rozvrhu";
  const isRun = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (isRun && days.length >= 3) {
    return `${WEEKDAY_SHORT[days[0]]}–${WEEKDAY_SHORT[days.at(-1) ?? 0]}`;
  }
  return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
}
