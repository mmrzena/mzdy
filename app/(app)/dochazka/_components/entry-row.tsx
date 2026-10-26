"use client";

import { RiCloseLine } from "@remixicon/react";
import { memo } from "react";

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
} from "@/lib/attendance/model";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendance-store";

export const ROW_GRID =
  "grid grid-cols-[minmax(10rem,1fr)_6.5rem_6.5rem_14rem_9.5rem_2rem] items-center gap-2";

export const EntryRow = memo(function EntryRow({
  month,
  date,
  entry,
  employee,
}: {
  month: string;
  date: string;
  entry: Entry;
  employee: Employee | undefined;
}) {
  const { updateEntry, removeEntry } = useAttendanceStore.getState();
  const present = entry.status === "pritomen";
  const issue = present ? shiftIssue(entry) : null;
  const name = employee?.name ?? "Neznámý zaměstnanec";
  const update = (patch: Partial<Omit<Entry, "employeeId">>) =>
    updateEntry(month, date, entry.employeeId, patch);

  return (
    <div className="grid gap-1">
      <div className={ROW_GRID}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              !present && "text-muted-foreground",
            )}
          >
            {name}
          </span>
          {employee && employee.contract !== "HPP" ? (
            <ContractBadge contract={employee.contract} className="shrink-0" />
          ) : null}
        </div>
        <TimeInput
          required
          value={entry.start}
          onChange={(start) => start && update({ start })}
          disabled={!present}
          invalid={Boolean(issue)}
          aria-label={`${name} od`}
        />
        <TimeInput
          required
          value={entry.end}
          onChange={(end) => end && update({ end })}
          disabled={!present}
          invalid={Boolean(issue)}
          aria-label={`${name} do`}
        />
        <div className="flex items-center gap-1">
          <TimeInput
            value={entry.breakStart}
            onChange={(breakStart) => update({ breakStart })}
            disabled={!present}
            aria-label={`${name} pauza od`}
          />
          <span className="text-muted-foreground">–</span>
          <TimeInput
            value={entry.breakEnd}
            onChange={(breakEnd) => update({ breakEnd })}
            disabled={!present}
            aria-label={`${name} pauza do`}
          />
        </div>
        <NativeSelect
          size="sm"
          value={entry.status}
          aria-label={`${name} přítomnost`}
          title={STATUS_LABEL[entry.status]}
          className={cn(
            "w-[9.5rem]",
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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Odebrat ${name} z tohoto dne`}
          onClick={() => removeEntry(month, date, entry.employeeId)}
        >
          <RiCloseLine />
        </Button>
      </div>
      {issue ? <p className="text-xs text-destructive">{issue}</p> : null}
    </div>
  );
});
