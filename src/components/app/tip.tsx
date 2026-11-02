"use client";

import type * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A hover hint for a control whose icon alone doesn't say enough. The child
 * is the trigger (it must accept a ref and props, as every shadcn control
 * does); a null label renders the child alone.
 */
export function Tip({
  label,
  side,
  children,
}: {
  label: React.ReactNode | null;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  children: React.ReactElement;
}) {
  if (label === null) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
