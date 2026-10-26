"use client";

import {
  RiArrowLeftLine,
  RiErrorWarningLine,
  RiHome4Line,
} from "@remixicon/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-4">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <Link
          href="/"
          aria-label="mzdy – úvodní stránka"
          className="flex items-center gap-2 font-semibold"
        >
          <RiHome4Line className="size-5 text-primary" /> mzdy
        </Link>

        <Empty className="border-0 bg-transparent">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiErrorWarningLine />
            </EmptyMedia>
            <EmptyTitle>Něco se pokazilo</EmptyTitle>
            <EmptyDescription>
              Došlo k neočekávané chybě. Zkuste to znovu, nebo se vraťte na
              úvodní stránku.
              {error.digest ? (
                <span className="mt-2 block font-mono text-xs text-muted-foreground">
                  ID chyby: {error.digest}
                </span>
              ) : null}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex gap-2">
              <Button onClick={reset}>Zkusit znovu</Button>
              <Button asChild variant="outline">
                <Link href="/">
                  <RiArrowLeftLine /> Zpět na úvod
                </Link>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  );
}
