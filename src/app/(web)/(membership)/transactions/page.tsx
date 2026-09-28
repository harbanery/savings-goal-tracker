import type { Metadata } from "next";
import TransactionsSection from "./section/TransactionsSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return <TransactionsSection />;
}
