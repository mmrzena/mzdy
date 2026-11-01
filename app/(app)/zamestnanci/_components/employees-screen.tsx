"use client";

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBinLine,
  RiMore2Line,
  RiPencilLine,
  RiUserAddLine,
  RiUserLine,
} from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { ContractBadge } from "@/components/app/contract-badge";
import { Tip } from "@/components/app/tip";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Employee } from "@/lib/attendance/model";
import { cn } from "@/lib/utils";
import {
  isEmployeeUsed,
  useAttendanceStore,
  useStoreHydrated,
} from "@/stores/attendance-store";
import { EmployeeDialog } from "./employee-dialog";
import { weekSummary } from "./week-summary";

type RowActions = {
  employees: Employee[];
  index: number;
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
};

function MoveButtons({ employees, index, employee }: RowActions) {
  const { moveEmployee } = useAttendanceStore.getState();
  return (
    <div className="flex">
      <Tip label="Posunout nahoru – pořadí platí i v docházce">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Posunout ${employee.name} nahoru`}
          disabled={index === 0}
          onClick={() => moveEmployee(employee.id, -1)}
        >
          <RiArrowUpLine />
        </Button>
      </Tip>
      <Tip label="Posunout dolů – pořadí platí i v docházce">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Posunout ${employee.name} dolů`}
          disabled={index === employees.length - 1}
          onClick={() => moveEmployee(employee.id, 1)}
        >
          <RiArrowDownLine />
        </Button>
      </Tip>
    </div>
  );
}

function ActiveSwitch({ employee }: { employee: Employee }) {
  const { setEmployeeActive } = useAttendanceStore.getState();
  return (
    <Switch
      checked={employee.active}
      aria-label={`${employee.name} je aktivní`}
      onCheckedChange={(active) => setEmployeeActive(employee.id, active)}
    />
  );
}

function ActionsMenu({ employee, onEdit, onDelete }: RowActions) {
  return (
    <DropdownMenu>
      <Tip label="Upravit nebo smazat">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Akce pro ${employee.name}`}
          >
            <RiMore2Line />
          </Button>
        </DropdownMenuTrigger>
      </Tip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(employee)}>
          <RiPencilLine /> Upravit
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDelete(employee)}
        >
          <RiDeleteBinLine /> Smazat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One employee as a card, for phones where the table would not fit. */
function EmployeeCard(props: RowActions) {
  const { employee } = props;
  return (
    <li
      className={cn(
        "grid gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
        !employee.active && "text-muted-foreground",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{employee.name}</span>
            <ContractBadge contract={employee.contract} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {weekSummary(employee.week)}
          </p>
        </div>
        <ActionsMenu {...props} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <MoveButtons {...props} />
        <div className="flex items-center gap-2 text-sm">
          <span aria-hidden="true">Aktivní</span>
          <ActiveSwitch employee={employee} />
        </div>
      </div>
    </li>
  );
}

export function EmployeesScreen() {
  const hydrated = useStoreHydrated();
  const employees = useAttendanceStore((s) => s.employees);
  const { deleteEmployee } = useAttendanceStore.getState();

  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  function requestDelete(employee: Employee) {
    if (isEmployeeUsed(useAttendanceStore.getState(), employee.id)) {
      toast.info(`${employee.name} už má zapsanou docházku.`, {
        description:
          "Aby zůstala historie, zaměstnance místo smazání vypněte přepínačem Aktivní.",
      });
      return;
    }
    setDeleting(employee);
  }

  return (
    <>
      <PageHeader
        title="Zaměstnanci"
        description="Seznam zaměstnanců a jejich obvyklý týdenní rozvrh. Podle rozvrhu se předvyplňuje docházka. Pořadí odpovídá pořadí v docházce."
        actions={
          <Button onClick={() => setEditing("new")}>
            <RiUserAddLine /> Přidat zaměstnance
          </Button>
        }
      />

      {!hydrated ? (
        <Skeleton className="h-64 w-full" />
      ) : employees.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiUserLine />
            </EmptyMedia>
            <EmptyTitle>Zatím žádní zaměstnanci</EmptyTitle>
            <EmptyDescription>
              Přidejte zaměstnance, jejich typ úvazku a obvyklou pracovní dobu.
              Stačí to udělat jednou, každý měsíc se pak docházka předvyplní.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setEditing("new")}>
              <RiUserAddLine /> Přidat zaměstnance
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="py-0">
          <ul className="divide-y md:hidden">
            {employees.map((employee, index) => (
              <EmployeeCard
                key={employee.id}
                employees={employees}
                index={index}
                employee={employee}
                onEdit={setEditing}
                onDelete={requestDelete}
              />
            ))}
          </ul>
          <Table className="max-md:hidden">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">
                  <span className="sr-only">Pořadí</span>
                </TableHead>
                <TableHead>Jméno</TableHead>
                <TableHead>Úvazek</TableHead>
                <TableHead>Obvyklé dny</TableHead>
                <TableHead>Aktivní</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Akce</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee, index) => (
                <TableRow
                  key={employee.id}
                  className={cn(
                    "hover:bg-accent/50",
                    !employee.active && "text-muted-foreground",
                  )}
                >
                  <TableCell>
                    <MoveButtons
                      employees={employees}
                      index={index}
                      employee={employee}
                      onEdit={setEditing}
                      onDelete={requestDelete}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>
                    <ContractBadge contract={employee.contract} />
                  </TableCell>
                  <TableCell>{weekSummary(employee.week)}</TableCell>
                  <TableCell>
                    <ActiveSwitch employee={employee} />
                  </TableCell>
                  <TableCell>
                    <ActionsMenu
                      employees={employees}
                      index={index}
                      employee={employee}
                      onEdit={setEditing}
                      onDelete={requestDelete}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <EmployeeDialog
        employee={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Smazat ${deleting?.name}?`}
        description="Zaměstnanec zatím nemá žádnou docházku, takže se nic dalšího neztratí."
        actionLabel="Smazat"
        destructive
        onConfirm={() => {
          if (deleting) deleteEmployee(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
