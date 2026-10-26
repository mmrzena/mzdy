import type { Metadata } from "next";

import { EmployeesScreen } from "./_components/employees-screen";

export const metadata: Metadata = { title: "Zaměstnanci · mzdy" };

export default function EmployeesPage() {
  return <EmployeesScreen />;
}
