"use client";

import { RiErrorWarningLine } from "@remixicon/react";
import { useMemo } from "react";

import { ContractBadge } from "@/components/app/contract-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { plural } from "@/lib/attendance/calendar";
import {
  NON_WORK_STATUSES,
  STATUS_LABEL,
  STATUS_SHORT,
} from "@/lib/attendance/model";
import {
  formatDays,
  formatHours,
  HOURS_NOTE,
  type StatusTotals,
  summarizeMonth,
  sumTotals,
  type Tally,
} from "@/lib/attendance/summary";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendance-store";
import type { EmployeeSelection } from "./employee-filter";

function TallyCell({ tally }: { tally: Tally }) {
  if (tally.days === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="grid tabular-nums leading-tight">
      <span>{formatDays(tally.days)}</span>
      <span className="text-xs text-muted-foreground">
        {formatHours(tally.minutes)} h
      </span>
    </span>
  );
}

function SummaryCells({ totals }: { totals: StatusTotals }) {
  return (
    <>
      <TableCell className="text-right tabular-nums">
        {totals.pritomen.days}
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">
        {formatHours(totals.pritomen.minutes)}
      </TableCell>
      {NON_WORK_STATUSES.map((status) => (
        <TableCell key={status}>
          <TallyCell tally={totals[status]} />
        </TableCell>
      ))}
    </>
  );
}

export function MonthSummaryTable({
  month,
  selection,
}: {
  month: string;
  /** Show just these employees' rows; a single row gets no total. */
  selection: EmployeeSelection;
}) {
  const sheet = useAttendanceStore((s) => s.months[month]);
  const employees = useAttendanceStore((s) => s.employees);
  const summary = useMemo(
    () => (sheet ? summarizeMonth(sheet, employees) : null),
    [sheet, employees],
  );
  if (!summary) return null;
  const rows = summary.rows.filter(
    ({ employee }) => selection === null || selection.has(employee.id),
  );
  const total =
    selection === null ? summary.total : sumTotals(rows.map((r) => r.totals));

  return (
    <div className="grid gap-3">
      {summary.invalid > 0 ? (
        <Alert variant="destructive">
          <RiErrorWarningLine />
          <AlertDescription>
            {plural(summary.invalid, "záznam má", "záznamy mají", "záznamů má")}{" "}
            neplatný čas (konec před začátkem nebo pauza mimo pracovní dobu).
            Jejich hodiny nejsou započítané. Opravte je v rozpisu po dnech.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="min-w-0 py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-card">
                  Zaměstnanec
                </TableHead>
                <TableHead className="text-right" title="Odpracované dny">
                  Dny
                </TableHead>
                <TableHead className="text-right" title="Odpracované hodiny">
                  Hodiny
                </TableHead>
                {NON_WORK_STATUSES.map((status) => (
                  <TableHead key={status} title={STATUS_LABEL[status]}>
                    {STATUS_SHORT[status]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ employee, totals }) => (
                <TableRow
                  key={employee.id}
                  className={cn(
                    "group hover:bg-accent/50",
                    !employee.active && "text-muted-foreground",
                  )}
                >
                  {/* Pinned, so it paints an opaque background and takes the
                      row's translucent hover as an overlay. */}
                  <TableCell className="sticky left-0 z-10 bg-card before:absolute before:inset-0 before:-z-10 before:transition-colors group-hover:before:bg-accent/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{employee.name}</span>
                      <ContractBadge contract={employee.contract} />
                    </div>
                  </TableCell>
                  <SummaryCells totals={totals} />
                </TableRow>
              ))}
            </TableBody>
            {rows.length < 2 ? null : (
              <TableFooter>
                <TableRow>
                  {/* Opaque like the other pinned cells, tinted like the footer. */}
                  <TableCell className="sticky left-0 z-10 bg-card font-semibold before:absolute before:inset-0 before:-z-10 before:bg-muted/50">
                    Celkem
                  </TableCell>
                  <SummaryCells totals={total} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">{HOURS_NOTE}</p>
    </div>
  );
}
