import type { Metadata } from "next";
import ReportsSection from "./section/ReportsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reports",
};

export default function ReportsPage() {
  return <ReportsSection />;
}
