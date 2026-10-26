"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { RiTimeLine } from "@remixicon/react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
  shiftIssue,
  TIME_PATTERN,
  type WeekTemplate,
} from "@/lib/attendance/model";
import { useAttendanceStore } from "@/stores/attendance-store";

const time = z.string().regex(TIME_PATTERN);
const dayFormSchema = z
  .object({
    works: z.boolean(),
    start: time,
    end: time,
    breakStart: time.nullable(),
    breakEnd: time.nullable(),
  })
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

const DEFAULT_DAY = {
  start: "08:00",
  end: "16:00",
  breakStart: "12:00",
  breakEnd: "12:30",
};

function toFormWeek(week: WeekTemplate): FormValues["week"] {
  return week.map((shift, i) => ({
    works: shift !== null,
    ...(shift ?? CLINIC_WEEK[i] ?? DEFAULT_DAY),
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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults(employee),
  });

  useEffect(() => {
    if (open) form.reset(defaults(employee));
  }, [open, employee, form]);

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
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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
                                onChange={(v) => field.onChange(v)}
                                disabled={!works}
                                invalid={works && Boolean(error)}
                                aria-label={`${dayName} ${key === "start" ? "od" : "do"}`}
                              />
                            )}
                          />
                        ))}
                        <div className="col-span-3 flex items-center gap-1 sm:col-span-1">
                          <Controller
                            control={form.control}
                            name={`week.${i}.breakStart`}
                            render={({ field }) => (
                              <TimeInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={!works}
                                aria-label={`${dayName} pauza od`}
                              />
                            )}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Controller
                            control={form.control}
                            name={`week.${i}.breakEnd`}
                            render={({ field }) => (
                              <TimeInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={!works}
                                aria-label={`${dayName} pauza do`}
                              />
                            )}
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
                Pauzu nechte prázdnou, pokud ji daný den nemá. Dohody (DPP, DPČ)
                bez pravidelných dnů nechte bez rozvrhu a do docházky je
                přidávejte ručně.
              </p>
            </fieldset>
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button type="submit" form="employee-form">
            {employee ? "Uložit změny" : "Přidat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
