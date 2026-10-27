import {
  AccountBookFilled,
  AccountBookOutlined,
  AppstoreFilled,
  AppstoreOutlined,
  DashboardFilled,
  DashboardOutlined,
  FileTextFilled,
  FileTextOutlined,
  MoneyCollectFilled,
  MoneyCollectOutlined,
  TrophyFilled,
  TrophyOutlined,
  WalletFilled,
  WalletOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

/**
 * Item menu aplikasi.
 *
 * Tiap item membawa DUA ikon: `icon` (outlined — keadaan default) dan
 * `iconFilled` (keadaan aktif/terpilih). Menu melayang memilih ikon
 * sesuai item yang sedang aktif (DROID.md: "iconnya filled kalau
 * selected, kalau default outlined").
 */
export interface MenuItem {
  key: string;
  link: string;
  /** Ikon outlined — dipakai saat item TIDAK aktif. */
  icon: ReactNode;
  /** Ikon filled — dipakai saat item AKTIF. */
  iconFilled: ReactNode;
  labelKey: string;
}

/** Menu samping aplikasi — struktur mengikuti generate_web.md.
 *  Keuangan terbagi: Keuangan/wadah (/finance), Kebutuhan/subkategori
 *  (/needs), Budget (/budget), Target (/target) — Budget & Target di luar
 *  /finance.
 *
 *  Catatan ikon: `TransactionOutlined` dan `AimOutlined` tidak punya
 *  varian `Filled` di @ant-design/icons, jadi diganti pasangan yang
 *  setara maknanya — transaksi memakai MoneyCollect (catatan dana
 *  masuk/keluar) dan target memakai Trophy (pencapaian target). */
export const menuConfig: MenuItem[] = [
  {
    key: "dashboard",
    link: "/",
    icon: <DashboardOutlined />,
    iconFilled: <DashboardFilled />,
    labelKey: "menu.dashboard",
  },
  {
    key: "transactions",
    link: "/transactions",
    icon: <MoneyCollectOutlined />,
    iconFilled: <MoneyCollectFilled />,
    labelKey: "menu.transactions",
  },
  {
    key: "finance",
    link: "/finance",
    icon: <WalletOutlined />,
    iconFilled: <WalletFilled />,
    labelKey: "menu.finance",
  },
  {
    key: "needs",
    link: "/needs",
    icon: <AppstoreOutlined />,
    iconFilled: <AppstoreFilled />,
    labelKey: "menu.needs",
  },
  {
    key: "budget",
    link: "/budget",
    icon: <AccountBookOutlined />,
    iconFilled: <AccountBookFilled />,
    labelKey: "menu.budget",
  },
  {
    key: "target",
    link: "/target",
    icon: <TrophyOutlined />,
    iconFilled: <TrophyFilled />,
    labelKey: "menu.target",
  },
  {
    key: "reports",
    link: "/reports",
    icon: <FileTextOutlined />,
    iconFilled: <FileTextFilled />,
    labelKey: "menu.reports",
  },
];
