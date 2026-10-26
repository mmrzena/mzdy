"use client";

import { RiMoonLine, RiSunLine } from "@remixicon/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Switches between light and dark. Until the user picks one, the app follows
 * the system setting; the choice is saved in localStorage ("mzdy:theme") by
 * next-themes. Both icons render and CSS shows the right one, so the server
 * render never has to guess the theme.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Přepnout světlý / tmavý režim"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <RiSunLine className="dark:hidden" />
          <RiMoonLine className="hidden dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span className="dark:hidden">Přepnout na tmavý režim</span>
        <span className="hidden dark:inline">Přepnout na světlý režim</span>
      </TooltipContent>
    </Tooltip>
  );
}
