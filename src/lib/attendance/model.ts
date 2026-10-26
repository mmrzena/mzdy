import { z } from "zod";

/** "HH:MM", 24-hour — the value a native `<input type="time">` produces. */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = z.string().regex(TIME_PATTERN);

export const CONTRACT_TYPES = ["HPP", "DPC", "DPP"] as const;
export const contractSchema = z.enum(CONTRACT_TYPES);
export type ContractType = z.infer<typeof contractSchema>;

export const CONTRACT_LABEL: Record<
  ContractType,
  { short: string; long: string }
> = {
  HPP: { short: "HPP", long: "Hlavní pracovní poměr" },
  DPC: { short: "DPČ", long: "Dohoda o pracovní činnosti" },
  DPP: { short: "DPP", long: "Dohoda o provedení práce" },
};

/** One working block: start/end plus an optional lunch break. */
export const shiftSchema = z.object({
  start: time,
  end: time,
  breakStart: time.nullable(),
  breakEnd: time.nullable(),
});
export type Shift = z.infer<typeof shiftSchema>;

/** Usual shift per ISO weekday, index 0 = Monday … 6 = Sunday; null = off. */
export const weekTemplateSchema = z.array(shiftSchema.nullable()).length(7);
export type WeekTemplate = z.infer<typeof weekTemplateSchema>;

export const employeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  contract: contractSchema,
  active: z.boolean(),
  week: weekTemplateSchema,
});
export type Employee = z.infer<typeof employeeSchema>;

/** The clinic's absence reasons, in the order they are offered. */
export const ABSENCE_STATUSES = [
  "dovolena",
  "neplacene_volno",
  "pracovni_cesta",
  "pn_ocr",
  "prekazky_zamestnavatel",
] as const;

export const STATUSES = ["pritomen", ...ABSENCE_STATUSES, "svatek"] as const;
export type Status = (typeof STATUSES)[number];

/** Statuses from before the clinic's reason list; mapped when data is read. */
const LEGACY_STATUS: Record<string, Status> = {
  nemoc: "pn_ocr",
  lekar: "pn_ocr",
};

export function migrateStatus(value: unknown): unknown {
  return typeof value === "string" ? (LEGACY_STATUS[value] ?? value) : value;
}

export const statusSchema = z.preprocess(migrateStatus, z.enum(STATUSES));

export const STATUS_LABEL: Record<Status, string> = {
  pritomen: "Přítomen",
  dovolena: "Dovolená",
  neplacene_volno: "Neplacené volno",
  pracovni_cesta: "Pracovní cesta",
  pn_ocr: "Pracovní neschopnost / OČR",
  prekazky_zamestnavatel: "Překážky na straně zaměstnavatele",
  svatek: "Svátek",
};

/** For narrow places: the day-row select, table headings, the PDF. */
export const STATUS_SHORT: Record<Status, string> = {
  pritomen: "Přítomen",
  dovolena: "Dovolená",
  neplacene_volno: "Neplac. volno",
  pracovni_cesta: "Prac. cesta",
  pn_ocr: "PN / OČR",
  prekazky_zamestnavatel: "Překážky zam.",
  svatek: "Svátek",
};

/**
 * One employee on one day. Times are kept even when the status is an absence
 * so switching back to "přítomen" restores them.
 */
export const entrySchema = shiftSchema.extend({
  employeeId: z.string().min(1),
  status: statusSchema,
});
export type Entry = z.infer<typeof entrySchema>;

/** A month's sheet: ISO date ("2026-09-01") → that day's entries. */
export const monthSheetSchema = z.object({
  days: z.record(z.string(), z.array(entrySchema)),
});
export type MonthSheet = z.infer<typeof monthSheetSchema>;

/** Everything that is saved (and what a backup file contains). */
export const attendanceDataSchema = z.object({
  employees: z.array(employeeSchema),
  /** "2026-09" → sheet. A month absent from the map has not been started. */
  months: z.record(z.string(), monthSheetSchema),
});
export type AttendanceData = z.infer<typeof attendanceDataSchema>;

/**
 * The clinic's usual opening hours (Mon–Fri), offered as the starting weekly
 * template for a new full-time employee.
 */
export const CLINIC_WEEK: WeekTemplate = [
  { start: "07:00", end: "17:00", breakStart: "12:00", breakEnd: "12:30" },
  { start: "07:00", end: "16:00", breakStart: "12:00", breakEnd: "12:30" },
  { start: "07:45", end: "16:15", breakStart: "12:00", breakEnd: "12:30" },
  { start: "07:45", end: "15:15", breakStart: "12:00", breakEnd: "12:30" },
  { start: "07:30", end: "15:00", breakStart: "12:00", breakEnd: "12:30" },
  null,
  null,
];

/**
 * For a weekday without a usual shift: the clinic's hours that day, else 8–16.
 * The break is included because Czech labour law requires one after 6 hours.
 */
export function fallbackShift(weekdayIndex: number): Shift {
  return (
    CLINIC_WEEK[weekdayIndex] ?? {
      start: "08:00",
      end: "16:00",
      breakStart: "12:00",
      breakEnd: "12:30",
    }
  );
}

export const EMPTY_WEEK: WeekTemplate = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Working time of a shift in minutes: end − start − lunch break. The meal
 * break is not working time under Czech labour law (§ 88 zákoníku práce).
 * Null when the shift is inconsistent (see shiftIssue).
 */
export function shiftMinutes(shift: Shift): number | null {
  if (shiftIssue(shift)) return null;
  const pause =
    shift.breakStart && shift.breakEnd
      ? minutes(shift.breakEnd) - minutes(shift.breakStart)
      : 0;
  return minutes(shift.end) - minutes(shift.start) - pause;
}

/** A human-readable problem with a shift, or null when it is consistent. */
export function shiftIssue(shift: Shift): string | null {
  if (minutes(shift.end) <= minutes(shift.start)) {
    return "Konec musí být později než začátek.";
  }
  const { breakStart, breakEnd } = shift;
  if ((breakStart === null) !== (breakEnd === null)) {
    return "U pauzy vyplňte začátek i konec.";
  }
  if (breakStart !== null && breakEnd !== null) {
    if (minutes(breakEnd) <= minutes(breakStart)) {
      return "Konec pauzy musí být později než její začátek.";
    }
    if (
      minutes(breakStart) < minutes(shift.start) ||
      minutes(breakEnd) > minutes(shift.end)
    ) {
      return "Pauza musí být uvnitř pracovní doby.";
    }
  }
  return null;
}
