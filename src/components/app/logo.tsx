import { RiHeartPulseFill } from "@remixicon/react";

import { cn } from "@/lib/utils";

/**
 * The mzdy mark (heart pulse on brand red, same as app/icon.svg) plus the
 * wordmark. Inside a collapsed icon-rail sidebar only the mark shows.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-red text-white shadow-sm shadow-brand-red/30">
        <RiHeartPulseFill className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-brand-navy group-data-[collapsible=icon]:hidden dark:text-foreground">
        mzdy
      </span>
    </span>
  );
}
