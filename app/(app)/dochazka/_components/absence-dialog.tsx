"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatShortDate, monthDays } from "@/lib/attendance/calendar";
import {
  ABSENCE_STATUSES,
  type Employee,
  STATUS_LABEL,
  type Status,
} from "@/lib/attendance/model";
import { useAttendanceStore } from "@/stores/attendance-store";

/** Mark one person's vacation / sickness over a date range in one go. */
export function AbsenceDialog({
  month,
  employees,
  open,
  onOpenChange,
}: {
  month: string;
  employees: Employee[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const days = monthDays(month);
  const first = days[0].date;
  const last = days[days.length - 1].date;

  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<Status>("dovolena");
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(first);

  useEffect(() => {
    if (open) {
      setEmployeeId("");
      setStatus("dovolena");
      setFrom(first);
      setTo(first);
    }
  }, [open, first]);

  const valid = employeeId !== "" && from <= to && from >= first && to <= last;

  function apply() {
    if (!valid) return;
    useAttendanceStore
      .getState()
      .applyStatusRange(month, employeeId, from, to, status);
    const name = employees.find((e) => e.id === employeeId)?.name;
    toast.success(
      `${name}: ${STATUS_LABEL[status].toLowerCase()} ${formatShortDate(from)}–${formatShortDate(to)} zapsána.`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zadat nepřítomnost</DialogTitle>
          <DialogDescription>
            Nastaví stav na všechny dny v rozsahu, kdy zaměstnanec pracuje.
            Víkendy mimo jeho rozvrh a svátky zůstanou beze změny.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="absence-employee">Zaměstnanec</Label>
            <NativeSelect
              id="absence-employee"
              value={employeeId}
              className="w-full"
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <NativeSelectOption value="">Vyberte…</NativeSelectOption>
              {employees.map((e) => (
                <NativeSelectOption key={e.id} value={e.id}>
                  {e.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="absence-status">Důvod</Label>
            <NativeSelect
              id="absence-status"
              value={status}
              className="w-full"
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {ABSENCE_STATUSES.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {STATUS_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="absence-from">Od</Label>
              <Input
                id="absence-from"
                type="date"
                min={first}
                max={last}
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (e.target.value > to) setTo(e.target.value);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="absence-to">Do</Label>
              <Input
                id="absence-to"
                type="date"
                min={from}
                max={last}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button disabled={!valid} onClick={apply}>
            Zapsat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
