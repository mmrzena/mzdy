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

import { PageHeader } from "@/components/layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { CONTRACT_LABEL, type Employee } from "@/lib/attendance/model";
import { cn } from "@/lib/utils";
import {
  isEmployeeUsed,
  useAttendanceStore,
  useStoreHydrated,
} from "@/stores/attendance-store";
import { EmployeeDialog } from "./employee-dialog";
import { weekSummary } from "./week-summary";

export function EmployeesScreen() {
  const hydrated = useStoreHydrated();
  const employees = useAttendanceStore((s) => s.employees);
  const { moveEmployee, setEmployeeActive, deleteEmployee } =
    useAttendanceStore.getState();

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
          <Table>
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
                  className={cn(!employee.active && "text-muted-foreground")}
                >
                  <TableCell>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Posunout ${employee.name} nahoru`}
                        disabled={index === 0}
                        onClick={() => moveEmployee(employee.id, -1)}
                      >
                        <RiArrowUpLine />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Posunout ${employee.name} dolů`}
                        disabled={index === employees.length - 1}
                        onClick={() => moveEmployee(employee.id, 1)}
                      >
                        <RiArrowDownLine />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        employee.contract === "HPP" ? "secondary" : "outline"
                      }
                      title={CONTRACT_LABEL[employee.contract].long}
                    >
                      {CONTRACT_LABEL[employee.contract].short}
                    </Badge>
                  </TableCell>
                  <TableCell>{weekSummary(employee.week)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={employee.active}
                      aria-label={`${employee.name} je aktivní`}
                      onCheckedChange={(active) =>
                        setEmployeeActive(employee.id, active)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Akce pro ${employee.name}`}
                        >
                          <RiMore2Line />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(employee)}>
                          <RiPencilLine /> Upravit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => requestDelete(employee)}
                        >
                          <RiDeleteBinLine /> Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Zaměstnanec zatím nemá žádnou docházku, takže se nic dalšího
              neztratí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteEmployee(deleting.id);
                setDeleting(null);
              }}
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
