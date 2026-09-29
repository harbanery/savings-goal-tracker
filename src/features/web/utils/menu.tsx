import {
  AccountBookOutlined,
  AimOutlined,
  DashboardOutlined,
  FileTextOutlined,
  TransactionOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

/** Item menu aplikasi (ikon sebagai elemen React — tanpa loader dinamis). */
export interface MenuItem {
  key: string;
  link: string;
  icon: ReactNode;
  labelKey: string;
}

/** Menu samping aplikasi — struktur mengikuti generate_web.md. */
export const menuConfig: MenuItem[] = [
  { key: "dashboard", link: "/", icon: <DashboardOutlined />, labelKey: "menu.dashboard" },
  { key: "transactions", link: "/transactions", icon: <TransactionOutlined />, labelKey: "menu.transactions" },
  { key: "finance", link: "/finance", icon: <WalletOutlined />, labelKey: "menu.finance" },
  { key: "budget", link: "/finance/budget", icon: <AccountBookOutlined />, labelKey: "menu.budget" },
  { key: "target", link: "/finance/target", icon: <AimOutlined />, labelKey: "menu.target" },
  { key: "reports", link: "/reports", icon: <FileTextOutlined />, labelKey: "menu.reports" },
];
