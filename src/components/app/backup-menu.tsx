"use client";

import { RiArchiveLine, RiDownloadLine, RiUploadLine } from "@remixicon/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type AttendanceData,
  attendanceDataSchema,
} from "@/lib/attendance/model";
import { useAttendanceStore } from "@/stores/attendance-store";

const backupSchema = z.object({
  app: z.literal("mzdy"),
  version: z.literal(1),
  data: attendanceDataSchema,
});

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BackupMenu() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AttendanceData | null>(null);

  function download() {
    const { employees, months } = useAttendanceStore.getState();
    const backup = {
      app: "mzdy",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { employees, months },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mzdy-zaloha-${todayIso()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function readFile(file: File) {
    try {
      const parsed = backupSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        toast.error("Soubor není platná záloha mzdy.");
        return;
      }
      setPending(parsed.data.data);
    } catch {
      toast.error("Soubor se nepodařilo přečíst.");
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <RiArchiveLine /> Záloha
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={download}>
            <RiDownloadLine /> Stáhnout zálohu
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <RiUploadLine /> Obnovit ze zálohy…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void readFile(file);
        }}
      />
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obnovit data ze zálohy?</AlertDialogTitle>
            <AlertDialogDescription>
              Všichni zaměstnanci a veškerá docházka v tomto prohlížeči budou
              nahrazeny obsahem zálohy ({pending?.employees.length ?? 0}{" "}
              zaměstnanců, {Object.keys(pending?.months ?? {}).length} měsíců).
              Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) {
                  useAttendanceStore.getState().replaceAll(pending);
                  toast.success("Data byla obnovena ze zálohy.");
                }
                setPending(null);
              }}
            >
              Nahradit data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
