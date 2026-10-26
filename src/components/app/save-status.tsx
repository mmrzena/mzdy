"use client";

import { RiCheckLine, RiErrorWarningLine } from "@remixicon/react";

import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSaveStatus } from "@/stores/attendance-store";

const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Real save state of the browser storage: "Ukládání…" while a write is
 * pending, "Uloženo" for a moment after it lands (then fades out), and a
 * persistent error if the browser refused the write.
 */
export function SaveStatus() {
  const { state, savedAt } = useSaveStatus();
  // Idle always follows "saved", so it keeps that look while fading out.
  const shown = state === "idle" ? "saved" : state;
  const lastSaved = savedAt
    ? `Naposledy uloženo v ${timeFormat.format(savedAt)}. `
    : "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-1.5 text-xs transition-opacity duration-500",
            state === "idle" && "pointer-events-none opacity-0",
            shown === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {shown === "saving" ? <Spinner className="size-3.5" /> : null}
          {shown === "saved" ? (
            <RiCheckLine
              key={savedAt}
              className="size-4 text-success duration-300 animate-in fade-in zoom-in-50"
            />
          ) : null}
          {shown === "error" ? <RiErrorWarningLine className="size-4" /> : null}
          <span className={cn(shown !== "error" && "hidden sm:inline")}>
            {shown === "saving" ? "Ukládání…" : null}
            {shown === "saved" ? "Uloženo" : null}
            {shown === "error" ? "Nepodařilo se uložit" : null}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        {shown === "error"
          ? "Prohlížeč odmítl data uložit (plné nebo zablokované úložiště). Stáhněte si zálohu, aby se změny neztratily. Další změna zkusí uložit znovu."
          : `${lastSaved}Změny se ukládají do tohoto prohlížeče. Pro přenos na jiný počítač nebo jako pojistku si stáhněte zálohu.`}
      </TooltipContent>
    </Tooltip>
  );
}
