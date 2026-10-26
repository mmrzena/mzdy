"use client";

import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarCheckLine,
  RiDeleteBin6Line,
  RiFilePdf2Line,
  RiMore2Line,
  RiRefreshLine,
  RiSuitcaseLine,
  RiTimeLine,
  RiUserAddLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addMonths,
  countWorkdays,
  formatMonth,
  monthDays,
  plural,
  weekAgoInMonth,
} from "@/lib/attendance/calendar";
import { downloadAttendancePdf } from "@/lib/attendance/pdf";
import {
  useAttendanceStore,
  useStoreHydrated,
} from "@/stores/attendance-store";
import { AbsenceDialog } from "./absence-dialog";
import { DayCard } from "./day-card";
import { MonthSummaryTable } from "./month-summary";

type ConfirmKind = "refill" | "clear";

const CONFIRM: Record<
  ConfirmKind,
  { title: string; description: string; actionLabel: string }
> = {
  refill: {
    title: "Předvyplnit měsíc znovu?",
    description:
      "Všechny ruční úpravy v tomto měsíci, včetně dovolených, se přepíšou podle aktuálních rozvrhů zaměstnanců. Tuto akci nelze vrátit.",
    actionLabel: "Přepsat",
  },
  clear: {
    title: "Smazat docházku za celý měsíc?",
    description:
      "Všechny záznamy za tento měsíc se odstraní. Zaměstnanci zůstanou. Tuto akci nelze vrátit.",
    actionLabel: "Smazat",
  },
};

export function MonthScreen({ month }: { month: string }) {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const employees = useAttendanceStore((s) => s.employees);
  const started = useAttendanceStore((s) => month in s.months);
  const { prefillMonth, startEmptyMonth, clearMonth } =
    useAttendanceStore.getState();

  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    const { months, employees: all } = useAttendanceStore.getState();
    const sheet = months[month];
    if (!sheet) return;
    setExporting(true);
    try {
      await downloadAttendancePdf(month, sheet, all);
    } catch (error) {
      toast.error("PDF se nepodařilo vytvořit.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  const days = useMemo(() => monthDays(month), [month]);
  const workdays = countWorkdays(days);
  const holidays = days.filter((d) => d.holiday && !d.isWeekend).length;
  const activeCount = employees.filter((e) => e.active).length;

  const goTo = (delta: number) =>
    router.replace(`/dochazka?mesic=${addMonths(month, delta)}`, {
      scroll: false,
    });

  const monthNav = (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Předchozí měsíc"
        onClick={() => goTo(-1)}
      >
        <RiArrowLeftSLine />
      </Button>
      <span className="min-w-36 text-center font-semibold capitalize">
        {formatMonth(month)}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Další měsíc"
        onClick={() => goTo(1)}
      >
        <RiArrowRightSLine />
      </Button>
    </div>
  );

  let body: React.ReactNode;
  if (!hydrated) {
    body = (
      <div className="grid gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  } else if (employees.length === 0) {
    body = (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiUserAddLine />
          </EmptyMedia>
          <EmptyTitle>Nejdřív přidejte zaměstnance</EmptyTitle>
          <EmptyDescription>
            Docházka se předvyplňuje podle obvyklého rozvrhu každého
            zaměstnance.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/zamestnanci">Přejít na zaměstnance</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  } else if (!started) {
    body = (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiCalendarCheckLine />
          </EmptyMedia>
          <EmptyTitle>
            Docházka za <span className="capitalize">{formatMonth(month)}</span>{" "}
            zatím není
          </EmptyTitle>
          <EmptyDescription>
            Předvyplníme všechny dny podle rozvrhů {activeCount} aktivních
            zaměstnanců a doplníme státní svátky. Pak už jen upravíte výjimky.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                prefillMonth(month);
                toast.success("Měsíc je předvyplněný.");
              }}
            >
              <RiRefreshLine /> Předvyplnit podle rozvrhů
            </Button>
            <Button variant="outline" onClick={() => startEmptyMonth(month)}>
              Začít prázdný
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    );
  } else {
    body = (
      <Tabs defaultValue="dny" className="min-w-0 gap-4">
        <TabsList>
          <TabsTrigger value="dny">
            <RiCalendarCheckLine /> Rozpis po dnech
          </TabsTrigger>
          <TabsTrigger value="souhrn">
            <RiTimeLine /> Souhrn hodin
          </TabsTrigger>
        </TabsList>
        {/* Kept mounted so switching to the summary keeps scroll position and
            doesn't rebuild ~300 rows; the summary itself stays lazy. */}
        <TabsContent
          value="dny"
          forceMount
          className="grid min-w-0 gap-3 data-[state=inactive]:hidden"
        >
          {days.map((day) => (
            <DayCard
              key={day.date}
              month={month}
              day={day}
              employees={employees}
              weekAgo={weekAgoInMonth(day, days)}
            />
          ))}
        </TabsContent>
        <TabsContent value="souhrn" className="min-w-0">
          <MonthSummaryTable month={month} />
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <>
      <PageHeader
        title="Docházka"
        description={`${plural(workdays, "pracovní den", "pracovní dny", "pracovních dnů")}${holidays ? `, ${plural(holidays, "svátek", "svátky", "svátků")} ve všední den` : ""}.`}
        actions={
          <>
            {monthNav}
            {hydrated && started ? (
              <div className="flex items-center gap-2">
                <Button onClick={exportPdf} disabled={exporting}>
                  {exporting ? <Spinner /> : <RiFilePdf2Line />} Stáhnout PDF
                </Button>
                <Button variant="outline" onClick={() => setAbsenceOpen(true)}>
                  <RiSuitcaseLine /> Zadat nepřítomnost
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Další akce s měsícem"
                    >
                      <RiMore2Line />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setConfirm("refill")}>
                      <RiRefreshLine /> Předvyplnit znovu podle rozvrhů
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setConfirm("clear")}
                    >
                      <RiDeleteBin6Line /> Smazat docházku za měsíc
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </>
        }
      />

      {body}

      <AbsenceDialog
        month={month}
        days={days}
        employees={employees}
        open={absenceOpen}
        onOpenChange={setAbsenceOpen}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm ? CONFIRM[confirm].title : ""}
        description={confirm ? CONFIRM[confirm].description : ""}
        actionLabel={confirm ? CONFIRM[confirm].actionLabel : ""}
        destructive
        onConfirm={() => {
          if (confirm === "refill") prefillMonth(month);
          if (confirm === "clear") clearMonth(month);
          setConfirm(null);
        }}
      />
    </>
  );
}
