import type { Metadata } from "next";

import { currentMonthKey, isMonthKey } from "@/lib/attendance/calendar";
import { MonthScreen } from "./_components/month-screen";

export const metadata: Metadata = { title: "Docházka · mzdy" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ mesic?: string }>;
}) {
  const { mesic } = await searchParams;
  const month = mesic && isMonthKey(mesic) ? mesic : currentMonthKey();
  return <MonthScreen month={month} />;
}
