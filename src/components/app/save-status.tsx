"use client";

import { RiCheckLine } from "@remixicon/react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStoreHydrated } from "@/stores/attendance-store";

/** Every change is saved to this browser as it happens; this says so. */
export function SaveStatus() {
  const hydrated = useStoreHydrated();
  if (!hydrated) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <RiCheckLine className="size-4 text-success" />
          Ukládá se automaticky
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        Každá změna se hned uloží do tohoto prohlížeče. Pro přenos na jiný
        počítač nebo jako pojistku si stáhněte zálohu.
      </TooltipContent>
    </Tooltip>
  );
}
