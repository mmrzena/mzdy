"use client";

import { RiArchiveLine, RiDownloadLine, RiUploadLine } from "@remixicon/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { plural, toIsoDate } from "@/lib/attendance/calendar";
import {
  type AttendanceData,
  attendanceDataSchema,
} from "@/lib/attendance/model";
import { useAttendanceStore } from "@/stores/attendance-store";

const backupSchema = z.object({
  app: z.literal("mzdy"),
  version: z.literal(1),
  exportedAt: z.string().optional(),
  data: attendanceDataSchema,
});
type Backup = z.infer<typeof backupSchema>;

export function BackupMenu() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AttendanceData | null>(null);

  function download() {
    const { employees, months } = useAttendanceStore.getState();
    const backup: Backup = {
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
    link.download = `mzdy-zaloha-${toIsoDate(new Date())}.json`;
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
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Obnovit data ze zálohy?"
        description={`Všichni zaměstnanci a veškerá docházka v tomto prohlížeči budou nahrazeny obsahem zálohy (${plural(pending?.employees.length ?? 0, "zaměstnanec", "zaměstnanci", "zaměstnanců")}, ${plural(Object.keys(pending?.months ?? {}).length, "měsíc", "měsíce", "měsíců")}). Tuto akci nelze vrátit.`}
        actionLabel="Nahradit data"
        onConfirm={() => {
          if (pending) {
            useAttendanceStore.getState().replaceAll(pending);
            toast.success("Data byla obnovena ze zálohy.");
          }
          setPending(null);
        }}
      />
    </>
  );
}
