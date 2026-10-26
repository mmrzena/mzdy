"use client";

import { RiCalendarCheckLine, RiTeamLine } from "@remixicon/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { BackupMenu } from "@/components/app/backup-menu";
import { SaveStatus } from "@/components/app/save-status";
import { DashboardLayout } from "@/components/layout";
import { useAttendanceStore } from "@/stores/attendance-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Load the saved data from this browser once, after the first render.
  useEffect(() => {
    void useAttendanceStore.persist.rehydrate();
  }, []);

  return (
    <DashboardLayout
      brand={
        <Link href="/dochazka" className="text-brand-navy dark:text-foreground">
          mzdy
        </Link>
      }
      topBarActions={
        <>
          <SaveStatus />
          <BackupMenu />
        </>
      }
      navGroups={[
        {
          items: [
            {
              href: "/dochazka",
              label: "Docházka",
              icon: <RiCalendarCheckLine />,
              active: pathname.startsWith("/dochazka"),
            },
            {
              href: "/zamestnanci",
              label: "Zaměstnanci",
              icon: <RiTeamLine />,
              active: pathname.startsWith("/zamestnanci"),
            },
          ],
        },
      ]}
    >
      {children}
    </DashboardLayout>
  );
}
