import { buildPageMetadata } from "@/utils/helpers";
import TransactionsSection from "./section/TransactionsSection";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata(
  "menu.transactions",
  "meta.descTransactions",
);

export default function TransactionsPage() {
  return <TransactionsSection />;
}
