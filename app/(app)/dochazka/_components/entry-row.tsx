"use client";

import {
  RiCloseLine,
  RiCornerDownRightLine,
  RiScissorsLine,
} from "@remixicon/react";
import { memo } from "react";

import { BreakInput } from "@/components/app/break-input";
import { ContractBadge } from "@/components/app/contract-badge";
import { TimeInput } from "@/components/app/time-input";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  type Employee,
  type Entry,
  STATUS_LABEL,
  STATUS_SHORT,
  STATUSES,
  type Status,
  shiftIssue,
  splitShift,
} from "@/lib/attendance/model";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendance-store";

/** The six columns of a day's table from `md` up. */
export const ROW_GRID =
  "md:grid-cols-[minmax(10rem,1fr)_6.5rem_6.5rem_15.5rem_9.5rem_4.25rem] md:items-center";

/**
 * Below `md` each entry is a block: name and actions on the first line, then
 * the times, the break and the status on their own lines.
 */
const ROW_PHONE = "grid grid-cols-[1fr_auto] gap-2";

/**
 * One entry of a day. When the employee's day is split, `part` / `parts` say
 * which part this is; the parts after the first show a marker instead of the
 * name, and times stay editable even for an absence, because then they say
 * how long the absence was.
 */
export const EntryRow = memo(function EntryRow({
  month,
  date,
  index,
  entry,
  employee,
  part,
  parts,
}: {
  month: string;
  date: string;
  /** Position in the day's entries, which is how the store addresses it. */
  index: number;
  entry: Entry;
  employee: Employee | undefined;
  /** 1-based position among this employee's entries of the day. */
  part: number;
  parts: number;
}) {
  const { updateEntry, removeEntry, splitEntry } =
    useAttendanceStore.getState();
  const present = entry.status === "pritomen";
  const split = parts > 1;
  const timesEditable = present || split;
  const issue = timesEditable ? shiftIssue(entry) : null;
  const name = employee?.name ?? "Neznámý zaměstnanec";
  const who = split ? `${name}, ${part}. část` : name;
  const update = (patch: Partial<Omit<Entry, "employeeId">>) =>
    updateEntry(month, date, index, patch);

  return (
    <div className="-mx-2 grid gap-1 rounded-md px-2 py-1 transition-colors hover:bg-accent/50">
      <div className={cn(ROW_PHONE, ROW_GRID)}>
        <div className="flex min-w-0 items-center gap-2 max-md:row-start-1">
          {part > 1 ? (
            <span className="flex items-center gap-1 pl-3 text-sm text-muted-foreground">
              <RiCornerDownRightLine className="size-4" aria-hidden="true" />
              {part}. část
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  !present && !split && "text-muted-foreground",
                )}
              >
                {name}
              </span>
              {employee && employee.contract !== "HPP" ? (
                <ContractBadge
                  contract={employee.contract}
                  className="shrink-0"
                />
              ) : null}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 max-md:col-span-2 md:contents">
          <TimeInput
            required
            value={entry.start}
            onChange={(start) => start && update({ start })}
            disabled={!timesEditable}
            invalid={Boolean(issue)}
            aria-label={`${who} od`}
          />
          <span className="text-muted-foreground md:hidden" aria-hidden="true">
            –
          </span>
          <TimeInput
            required
            value={entry.end}
            onChange={(end) => end && update({ end })}
            disabled={!timesEditable}
            invalid={Boolean(issue)}
            aria-label={`${who} do`}
          />
        </div>
        <div className="flex items-center gap-2 max-md:col-span-2">
          <span className="w-10 text-xs text-muted-foreground md:hidden">
            Pauza
          </span>
          <BreakInput
            breakStart={entry.breakStart}
            breakEnd={entry.breakEnd}
            onChange={(breakStart, breakEnd) =>
              update({ breakStart, breakEnd })
            }
            disabled={!timesEditable}
            label={who}
          />
        </div>
        <NativeSelect
          size="sm"
          value={entry.status}
          aria-label={`${who} přítomnost`}
          title={STATUS_LABEL[entry.status]}
          className={cn(
            "w-full max-md:col-span-2 md:w-[9.5rem]",
            !present && "border-warning bg-warning/15 font-medium",
          )}
          onChange={(event) => update({ status: event.target.value as Status })}
        >
          {STATUSES.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {STATUS_SHORT[status]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <div className="flex items-center max-md:col-start-2 max-md:row-start-1 max-md:justify-self-end">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Rozdělit na dvě části (např. půl dne dovolená)"
            aria-label={`Rozdělit ${who} na dvě části`}
            disabled={splitShift(entry) === null}
            onClick={() => splitEntry(month, date, index)}
          >
            <RiScissorsLine />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title={
              split
                ? "Zrušit tuto část; její čas připadne sousední části"
                : undefined
            }
            aria-label={
              split ? `Zrušit ${who}` : `Odebrat ${name} z tohoto dne`
            }
            onClick={() => removeEntry(month, date, index)}
          >
            <RiCloseLine />
          </Button>
        </div>
      </div>
      {issue ? <p className="text-xs text-destructive">{issue}</p> : null}
    </div>
  );
});
