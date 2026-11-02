"use client";

import { RiFilter3Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { plural } from "@/lib/attendance/calendar";
import type { Employee } from "@/lib/attendance/model";
import { cn } from "@/lib/utils";

/** Which employees to show: null for everyone, else a non-empty set of ids. */
export type EmployeeSelection = ReadonlySet<string> | null;

/**
 * Pick one or more employees to show (and compare); nobody picked means
 * everyone. The button reads the names when they fit, else a count.
 */
export function EmployeeFilter({
  employees,
  selected,
  onChange,
}: {
  employees: Employee[];
  selected: EmployeeSelection;
  onChange: (selected: EmployeeSelection) => void;
}) {
  const picked = selected ? employees.filter((e) => selected.has(e.id)) : [];
  let label = "Všichni zaměstnanci";
  if (picked.length > 0 && picked.length <= 2) {
    label = picked.map((e) => e.name).join(", ");
  } else if (picked.length > 2) {
    label = plural(picked.length, "zaměstnanec", "zaměstnanci", "zaměstnanců");
  }

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected ?? []);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next.size > 0 ? next : null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("max-w-72", selected && "border-primary font-medium")}
        >
          <RiFilter3Line />
          <span className="truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem disabled={!selected} onSelect={() => onChange(null)}>
          Zobrazit všechny
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* The team can be twenty-odd people: the list scrolls on its own
            under the reset, which stays in view. */}
        <div className="max-h-72 overflow-y-auto">
          {employees.map((e) => (
            <DropdownMenuCheckboxItem
              key={e.id}
              checked={selected?.has(e.id) ?? false}
              onCheckedChange={(checked) => toggle(e.id, checked === true)}
              // Keep the menu open so several people can be ticked in one go.
              onSelect={(event) => event.preventDefault()}
            >
              {e.name}
              {e.active ? "" : " (neaktivní)"}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
