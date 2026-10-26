"use client";

import { RiAddLine, RiCloseLine } from "@remixicon/react";

import { TimeInput } from "@/components/app/time-input";
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
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        title="Bez pauzy"
        aria-label={`${label}: bez obědové pauzy`}
        onClick={() => onChange(null, null)}
      >
        <RiCloseLine />
      </Button>
    </div>
  );
}
