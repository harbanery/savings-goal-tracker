"use client";

import {
  AccountBookOutlined,
  AimOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Tabs } from "antd";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type {
  BudgetCategory,
  BudgetOverview,
  SavingsTarget,
  UserSettings,
} from "@/features/web/types";
import BudgetView from "./BudgetView";
import TargetsView from "./TargetsView";
import WalletsView from "./WalletsView";

interface Props {
  initialCategories: BudgetCategory[];
  settings: UserSettings;
  initialOverview: BudgetOverview;
  initialTargets: SavingsTarget[];
}

/**
 * Halaman Keuangan: tiga tab — Dompet (wadah bank/e-wallet + subkategori),
 * Budget (proteksi tabungan per siklus), dan Target (target tabungan user).
 */
export default function FinanceView({
  initialCategories,
  settings,
  initialOverview,
  initialTargets,
}: Props) {
  const { t } = useLocale();

  return (
    <div className="mx-auto w-full max-w-350">
      <Tabs
        defaultActiveKey="wallets"
        items={[
          {
            key: "wallets",
            label: t("finance.tabWallets"),
            icon: <WalletOutlined />,
            children: <WalletsView initialCategories={initialCategories} />,
          },
          {
            key: "budget",
            label: t("finance.tabBudget"),
            icon: <AccountBookOutlined />,
            children: (
              <BudgetView initialOverview={initialOverview} settings={settings} />
            ),
          },
          {
            key: "targets",
            label: t("finance.tabTargets"),
            icon: <AimOutlined />,
            children: <TargetsView initialTargets={initialTargets} />,
          },
        ]}
      />
    </div>
  );
}
