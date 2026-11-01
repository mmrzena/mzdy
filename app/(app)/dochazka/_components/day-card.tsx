"use client";

import {
  RiDeleteBin6Line,
  RiFileCopyLine,
  RiMore2Line,
  RiRefreshLine,
} from "@remixicon/react";
import { Fragment, memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  type CalendarDay,
  formatShortDate,
  plural,
  WEEKDAY_NAMES,
} from "@/lib/attendance/calendar";
import {
  type Employee,
  type Entry,
  shiftMinutes,
} from "@/lib/attendance/model";
import { formatHours } from "@/lib/attendance/summary";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendance-store";
import { EntryRow, ROW_GRID } from "./entry-row";

const NO_ENTRIES: Entry[] = [];

type DayRow = {
  entry: Entry;
  index: number;
  part: number;
  parts: number;
  /** Set on the last part of a split day: all parts' minutes, null if any is invalid. */
  dayMinutes?: number | null;
};

/**
 * Number the parts of each employee's day (entries are kept grouped by
 * employee) and give the last part of a split day the day's total hours.
 */
function dayRows(entries: Entry[]): DayRow[] {
  const parts = new Map<string, number>();
  for (const e of entries) {
    parts.set(e.employeeId, (parts.get(e.employeeId) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const minutes = new Map<string, number | null>();
  return entries.map((entry, index) => {
    const part = (seen.get(entry.employeeId) ?? 0) + 1;
    seen.set(entry.employeeId, part);
    const count = parts.get(entry.employeeId) ?? 1;
    const own = shiftMinutes(entry);
    const soFar = minutes.get(entry.employeeId);
    const total = own === null || soFar === null ? null : (soFar ?? 0) + own;
    minutes.set(entry.employeeId, total);
    return {
      entry,
      index,
      part,
      parts: count,
      dayMinutes: count > 1 && part === count ? total : undefined,
    };
  });
}

export const DayCard = memo(function DayCard({
  month,
  day,
  employees,
  weekAgo,
}: {
  month: string;
  day: CalendarDay;
  employees: Employee[];
  /** The same weekday one week earlier, when it falls in this month. */
  weekAgo: string | null;
}) {
  const entries = useAttendanceStore(
    (s) => s.months[month]?.days[day.date] ?? NO_ENTRIES,
  );
  const weekAgoHasEntries = useAttendanceStore((s) =>
    weekAgo ? (s.months[month]?.days[weekAgo]?.length ?? 0) > 0 : false,
  );
  const { addEntry, resetDay, copyDay, clearDay } =
    useAttendanceStore.getState();

  const byId = new Map(employees.map((e) => [e.id, e]));
  const present = new Set(entries.map((e) => e.employeeId));
  const addable = employees.filter((e) => !present.has(e.id));
  const title = `${WEEKDAY_NAMES[day.weekdayIndex]} ${formatShortDate(day.date)}`;
  const isEmpty = entries.length === 0;
  const rows = dayRows(entries);

  return (
    <Card
      id={`den-${day.date}`}
      className={cn(
        "min-w-0 scroll-mt-20 gap-3 py-4",
        (day.isWeekend || day.holiday) && isEmpty && "bg-muted/50 shadow-none",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-4">
        <h2 className="font-semibold capitalize">{title}</h2>
        {day.holiday ? (
          <Badge className="bg-brand-red/10 text-brand-red-dark dark:text-primary">
            Svátek · {day.holiday}
          </Badge>
        ) : null}
        {day.isWeekend ? <Badge variant="secondary">Víkend</Badge> : null}
        {!isEmpty ? (
          <span className="text-xs text-muted-foreground">
            {plural(present.size, "osoba", "osoby", "osob")}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {addable.length > 0 ? (
            <NativeSelect
              size="sm"
              value=""
              aria-label={`Přidat zaměstnance na ${title}`}
              className="w-48"
              onChange={(event) => {
                if (event.target.value) {
                  addEntry(month, day, event.target.value);
                }
              }}
            >
              <NativeSelectOption value="">+ Přidat…</NativeSelectOption>
              {addable.map((e) => (
                <NativeSelectOption key={e.id} value={e.id}>
                  {e.name}
                  {e.active ? "" : " (neaktivní)"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Akce pro ${title}`}
              >
                <RiMore2Line />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => resetDay(month, day)}>
                <RiRefreshLine /> Obnovit podle rozvrhů
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!weekAgo || !weekAgoHasEntries}
                onSelect={() => weekAgo && copyDay(month, day.date, weekAgo)}
              >
                <RiFileCopyLine /> Zkopírovat z minulého týdne
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isEmpty}
                onSelect={() => clearDay(month, day.date)}
              >
                <RiDeleteBin6Line /> Vyprázdnit den
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isEmpty ? null : (
        <div className="overflow-x-auto px-4">
          <div className="grid min-w-[52.5rem] gap-2">
            <div
              className={cn(ROW_GRID, "text-xs text-muted-foreground")}
              aria-hidden="true"
            >
              <span>Zaměstnanec</span>
              <span>Od</span>
              <span>Do</span>
              <span>Obědová pauza</span>
              <span>Přítomnost</span>
              <span />
            </div>
            {rows.map(({ entry, index, part, parts, dayMinutes }) => (
              <Fragment key={`${entry.employeeId}:${part}`}>
                <EntryRow
                  month={month}
                  date={day.date}
                  index={index}
                  entry={entry}
                  employee={byId.get(entry.employeeId)}
                  part={part}
                  parts={parts}
                />
                {dayMinutes !== undefined ? (
                  <p className="-mt-1 pl-3 text-xs text-muted-foreground">
                    Celkem za den
                    {dayMinutes === null
                      ? ": některá část má neplatný čas"
                      : ` ${formatHours(dayMinutes)} h`}
                  </p>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});
