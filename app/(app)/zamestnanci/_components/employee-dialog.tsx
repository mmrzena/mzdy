"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RiTimeLine } from "@remixicon/react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BreakInput } from "@/components/app/break-input";
import { TimeInput } from "@/components/app/time-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WEEKDAY_NAMES } from "@/lib/attendance/calendar";
import {
  CLINIC_WEEK,
  CONTRACT_LABEL,
  CONTRACT_TYPES,
  contractSchema,
  EMPTY_WEEK,
  type Employee,
  fallbackShift,
  shiftIssue,
  shiftSchema,
  type WeekTemplate,
} from "@/lib/attendance/model";
import { useAttendanceStore } from "@/stores/attendance-store";

const dayFormSchema = shiftSchema
  .extend({ works: z.boolean() })
  .superRefine((day, ctx) => {
    const issue = day.works ? shiftIssue(day) : null;
    if (issue) ctx.addIssue({ code: "custom", message: issue, path: ["end"] });
  });

const formSchema = z.object({
  name: z.string().trim().min(1, "Vyplňte jméno."),
  contract: contractSchema,
  week: z.array(dayFormSchema).length(7),
});
type FormValues = z.infer<typeof formSchema>;

function toFormWeek(week: WeekTemplate): FormValues["week"] {
  return week.map((shift, i) => ({
    works: shift !== null,
    ...(shift ?? fallbackShift(i)),
  }));
}

function fromFormWeek(week: FormValues["week"]): WeekTemplate {
  return week.map(({ works, ...shift }) => (works ? shift : null));
}

function defaults(employee: Employee | null): FormValues {
  return {
    name: employee?.name ?? "",
    contract: employee?.contract ?? "HPP",
    week: toFormWeek(employee?.week ?? CLINIC_WEEK),
  };
}

export function EmployeeDialog({
  employee,
  open,
  onOpenChange,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <EmployeeForm employee={employee} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Mounted fresh on every open (dialog content unmounts on close), so it starts
 * from the employee's current values. The employee is captured on mount so the
 * title doesn't flip while the dialog animates closed.
 */
function EmployeeForm({
  employee: employeeProp,
  onDone,
}: {
  employee: Employee | null;
  onDone: () => void;
}) {
  const [employee] = useState(employeeProp);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults(employee),
  });

  const week = useWatch({ control: form.control, name: "week" });

  function submit(values: FormValues) {
    const input = {
      name: values.name.trim(),
      contract: values.contract,
      active: employee?.active ?? true,
      week: fromFormWeek(values.week),
    };
    const store = useAttendanceStore.getState();
    if (employee) {
      store.updateEmployee(employee.id, input);
      toast.success(`Změny u ${input.name} jsou uložené.`);
    } else {
      store.addEmployee(input);
      toast.success(`${input.name} byl(a) přidán(a).`);
    }
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {employee ? "Upravit zaměstnance" : "Nový zaměstnanec"}
        </DialogTitle>
        <DialogDescription>
          Obvyklý rozvrh se použije při předvyplnění docházky. Výjimky pak
          upravíte přímo v docházce.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          id="employee-form"
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-5"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jméno včetně titulu</FormLabel>
                  <FormControl>
                    <Input placeholder="MUDr. Jan Novák" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contract"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Úvazek</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTRACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {CONTRACT_LABEL[type].short} –{" "}
                          {CONTRACT_LABEL[type].long}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <fieldset className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-sm font-medium">
                Obvyklý týdenní rozvrh
              </legend>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    form.setValue("week", toFormWeek(CLINIC_WEEK), {
                      shouldDirty: true,
                    })
                  }
                >
                  <RiTimeLine /> Ordinační doba Po–Pá
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    form.setValue("week", toFormWeek(EMPTY_WEEK), {
                      shouldDirty: true,
                    })
                  }
                >
                  Bez rozvrhu
                </Button>
              </div>
            </div>

            <div className="grid gap-1 rounded-lg border p-2">
              <div className="hidden grid-cols-[7.5rem_repeat(2,6.5rem)_auto] gap-2 px-1 text-xs text-muted-foreground sm:grid">
                <span>Den</span>
                <span>Od</span>
                <span>Do</span>
                <span>Obědová pauza</span>
              </div>
              {WEEKDAY_NAMES.map((dayName, i) => {
                const works = week?.[i]?.works ?? false;
                const error = form.formState.errors.week?.[i];
                return (
                  <div key={dayName} className="grid gap-1">
                    <div className="grid grid-cols-[7.5rem_repeat(2,6.5rem)] items-center gap-2 px-1 sm:grid-cols-[7.5rem_repeat(2,6.5rem)_auto]">
                      <Controller
                        control={form.control}
                        name={`week.${i}.works`}
                        render={({ field }) => (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`week-day-${i}`}
                              checked={field.value}
                              onCheckedChange={(v) =>
                                field.onChange(v === true)
                              }
                            />
                            <Label
                              htmlFor={`week-day-${i}`}
                              className="font-normal capitalize"
                            >
                              {dayName}
                            </Label>
                          </div>
                        )}
                      />
                      {(["start", "end"] as const).map((key) => (
                        <Controller
                          key={key}
                          control={form.control}
                          name={`week.${i}.${key}`}
                          render={({ field }) => (
                            <TimeInput
                              required
                              value={field.value}
                              onChange={field.onChange}
                              disabled={!works}
                              invalid={works && Boolean(error)}
                              aria-label={`${dayName} ${key === "start" ? "od" : "do"}`}
                            />
                          )}
                        />
                      ))}
                      <div className="col-span-3 sm:col-span-1">
                        <BreakInput
                          breakStart={week?.[i]?.breakStart ?? null}
                          breakEnd={week?.[i]?.breakEnd ?? null}
                          onChange={(breakStart, breakEnd) => {
                            const opts = { shouldDirty: true };
                            form.setValue(
                              `week.${i}.breakStart`,
                              breakStart,
                              opts,
                            );
                            form.setValue(`week.${i}.breakEnd`, breakEnd, opts);
                          }}
                          disabled={!works}
                          label={dayName}
                        />
                      </div>
                    </div>
                    {works && error?.end?.message ? (
                      <p className="px-1 text-xs text-destructive">
                        {error.end.message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Den bez obědové pauzy nastavíte křížkem u pauzy. Dohody (DPP, DPČ)
              bez pravidelných dnů nechte bez rozvrhu a do docházky je
              přidávejte ručně.
            </p>
          </fieldset>
        </form>
      </Form>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Zrušit
        </Button>
        <Button type="submit" form="employee-form">
          {employee ? "Uložit změny" : "Přidat"}
        </Button>
      </DialogFooter>
    </>
  );
}
