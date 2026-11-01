"use client";

import type * as React from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * A hover hint for a control, usually an icon-only button. The child is the
 * trigger (it must accept a ref and props, as every shadcn control does), so
 * wrap a menu trigger as `<Tip><DropdownMenuTrigger asChild><Button /></…>`.
 */
export function Tip({
  label,
  side,
  children,
}: {
  label: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
