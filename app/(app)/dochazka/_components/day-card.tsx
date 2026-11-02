"use client";

import {
  RiDeleteBin6Line,
  RiFileCopyLine,
  RiMore2Line,
  RiRefreshLine,
} from "@remixicon/react";
import { memo } from "react";
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
import { type DayPart, groupDayEntries } from "@/lib/attendance/prefill";
import { formatHours } from "@/lib/attendance/summary";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendance-store";
import type { EmployeeSelection } from "./employee-filter";
import { EntryRow, ROW_GRID } from "./entry-row";

const NO_ENTRIES: Entry[] = [];

/** All parts' working minutes, or null when any part is inconsistent. */
function sumMinutes(rows: DayPart[]): number | null {
  let total = 0;
  for (const { entry } of rows) {
    const own = shiftMinutes(entry);
    if (own === null) return null;
    total += own;
  }
  return total;
}

function DayTotal({ minutes }: { minutes: number | null }) {
  return (
    <p className="-mt-1 pl-3 text-xs text-muted-foreground">
      Celkem za den
      {minutes === null
        ? ": některá část má neplatný čas"
        : ` ${formatHours(minutes)} h`}
    </p>
  );
}

export const DayCard = memo(function DayCard({
  month,
  day,
  employees,
  weekAgo,
  selection,
}: {
  month: string;
  day: CalendarDay;
  employees: Employee[];
  /** The same weekday one week earlier, when it falls in this month. */
  weekAgo: string | null;
  /** Show just these employees' rows; the day-wide actions hide meanwhile. */
  selection: EmployeeSelection;
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
  const addable = employees.filter(
    (e) => !present.has(e.id) && (selection === null || selection.has(e.id)),
  );
  const title = `${WEEKDAY_NAMES[day.weekdayIndex]} ${formatShortDate(day.date)}`;
  // Grouped before filtering so each row keeps its index in the whole day.
  const groups = groupDayEntries(entries).filter(
    (g) => selection === null || selection.has(g.employeeId),
  );
  const isEmpty = groups.length === 0;

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
            {plural(groups.length, "osoba", "osoby", "osob")}
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
          {selection !== null ? null : (
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
          )}
        </div>
      </div>

      {isEmpty ? null : (
        <div className="px-4 md:overflow-x-auto">
          <div className="grid gap-2 max-md:divide-y md:min-w-[52.5rem]">
            <div
              className={cn(
                ROW_GRID,
                "hidden text-xs text-muted-foreground md:grid",
              )}
              aria-hidden="true"
            >
              <span>Zaměstnanec</span>
              <span>Od</span>
              <span>Do</span>
              <span>Obědová pauza</span>
              <span>Přítomnost</span>
              <span />
            </div>
            {groups.map(({ employeeId, rows }) => (
              <div
                key={employeeId}
                className={cn(
                  "grid gap-2 max-md:py-3",
                  rows.length > 1 &&
                    "-mx-2 rounded-lg border bg-muted/40 px-2 py-2 md:-mx-3 md:px-3",
                )}
              >
                {rows.map(({ entry, index, part }) => (
                  <EntryRow
                    key={part}
                    month={month}
                    date={day.date}
                    index={index}
                    entry={entry}
                    employee={byId.get(employeeId)}
                    part={part}
                    parts={rows.length}
                  />
                ))}
                {rows.length > 1 ? (
                  <DayTotal minutes={sumMinutes(rows)} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
});
