"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TimeInputProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  /** A required time ignores being cleared; an optional one becomes null. */
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label": string;
  className?: string;
};

export function TimeInput({
  value,
  onChange,
  required = false,
  disabled,
  invalid,
  className,
  ...props
}: TimeInputProps) {
  return (
    <Input
      type="time"
      step={300}
      value={value ?? ""}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      aria-label={props["aria-label"]}
      className={cn("h-8 w-[6.5rem] px-2 tabular-nums", className)}
      onChange={(event) => {
        const next = event.target.value;
        if (next) onChange(next);
        else if (!required) onChange(null);
      }}
    />
  );
}
