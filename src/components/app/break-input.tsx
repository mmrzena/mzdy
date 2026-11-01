"use client";

import { RiAddLine, RiCloseLine } from "@remixicon/react";

import { TimeInput } from "@/components/app/time-input";
import { Tip } from "@/components/app/tip";
import { Button } from "@/components/ui/button";
import { DEFAULT_BREAK } from "@/lib/attendance/model";

type BreakInputProps = {
  breakStart: string | null;
  breakEnd: string | null;
  onChange: (breakStart: string | null, breakEnd: string | null) => void;
  disabled?: boolean;
  /** Who / which day, for screen-reader labels. */
  label: string;
};

/**
 * The lunch break of a shift, or an explicit "Bez pauzy". Removing it clears
 * both times; adding it back starts from the default 12:00–12:30.
 */
export function BreakInput({
  breakStart,
  breakEnd,
  onChange,
  disabled,
  label,
}: BreakInputProps) {
  if (breakStart === null && breakEnd === null) {
    return (
      <div className="flex h-8 items-center gap-2">
        <span className="text-sm text-muted-foreground">Bez pauzy</span>
        <Tip label="Přidat obědovou pauzu 12:00–12:30 – nepočítá se do odpracovaných hodin">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            aria-label={`${label}: přidat obědovou pauzu`}
            onClick={() =>
              onChange(DEFAULT_BREAK.breakStart, DEFAULT_BREAK.breakEnd)
            }
          >
            <RiAddLine /> Přidat
          </Button>
        </Tip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <TimeInput
        value={breakStart}
        onChange={(value) => onChange(value, breakEnd)}
        disabled={disabled}
        aria-label={`${label} pauza od`}
      />
      <span className="text-muted-foreground">–</span>
      <TimeInput
        value={breakEnd}
        onChange={(value) => onChange(breakStart, value)}
        disabled={disabled}
        aria-label={`${label} pauza do`}
      />
      <Tip label="Zrušit obědovou pauzu – celá doba se počítá jako odpracovaná">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          aria-label={`${label}: zrušit obědovou pauzu`}
          onClick={() => onChange(null, null)}
        >
          <RiCloseLine />
        </Button>
      </Tip>
    </div>
  );
}
