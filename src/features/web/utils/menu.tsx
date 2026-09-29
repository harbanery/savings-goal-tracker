import {
  AppstoreOutlined,
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  TransactionOutlined,
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
  { key: "categories", link: "/categories", icon: <AppstoreOutlined />, labelKey: "menu.categories" },
  { key: "reports", link: "/reports", icon: <FileTextOutlined />, labelKey: "menu.reports" },
  { key: "settings", link: "/settings", icon: <SettingOutlined />, labelKey: "menu.settings" },
];
