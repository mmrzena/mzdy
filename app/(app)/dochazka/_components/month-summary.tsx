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
  type Tally,
} from "@/lib/attendance/summary";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendance-store";

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

export function MonthSummaryTable({ month }: { month: string }) {
  const sheet = useAttendanceStore((s) => s.months[month]);
  const employees = useAttendanceStore((s) => s.employees);
  const summary = useMemo(
    () => (sheet ? summarizeMonth(sheet, employees) : null),
    [sheet, employees],
  );
  if (!summary) return null;

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
                <TableHead>Zaměstnanec</TableHead>
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
              {summary.rows.map(({ employee, totals }) => (
                <TableRow
                  key={employee.id}
                  className={cn(!employee.active && "text-muted-foreground")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{employee.name}</span>
                      <ContractBadge contract={employee.contract} />
                    </div>
                  </TableCell>
                  <SummaryCells totals={totals} />
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Celkem</TableCell>
                <SummaryCells totals={summary.total} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">{HOURS_NOTE}</p>
    </div>
  );
}
