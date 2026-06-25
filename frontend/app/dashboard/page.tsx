import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "My Library",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
