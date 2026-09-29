"use client";

import { Alert, App, Button, Card, Col, Form, InputNumber, Row, Statistic, Typography } from "antd";
import {
  CheckOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  PayCircleOutlined,
  PieChartOutlined,
  RiseOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BudgetOverview, UserSettings } from "@/features/web/types";
import { getCurrentCycle } from "@/features/web/utils/cycle";
import {
  getBudgetOverviewAction,
  updateSettingsAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialOverview: BudgetOverview;
  settings: UserSettings;
}

interface BudgetFormValues {
  protectedSavings?: number;
}

/**
 * Tab Budget (menu Keuangan): atur tabungan yang dilindungi per siklus.
 * Bisa dialokasikan = saldo awal + pemasukan - tabungan dilindungi;
 * pengeluaran yang menyentuh tabungan akan meminta konfirmasi terpaksa.
 */
export default function BudgetView({ initialOverview, settings }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const [form] = Form.useForm<BudgetFormValues>();
  const [overview, setOverview] = useState(initialOverview);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const cycle = getCurrentCycle(settings.cycleStartDay);
      setOverview(await getBudgetOverviewAction(cycle));
    } catch {
      // biarkan state lama
    }
  }, [settings.cycleStartDay]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSave(values: BudgetFormValues) {
    setSaving(true);
    try {
      await updateSettingsAction({
        protectedSavings: Number(values.protectedSavings ?? 0),
      });
      message.success(t("settings.saved"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {overview.overProtected && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          title={t("finance.budgetOverTitle")}
          description={t("finance.budgetOverDesc", {
            spent: formatIDR(overview.totalSpent, locale),
            limit: formatIDR(overview.allocatable, locale),
          })}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} xl={6}>
          <Card variant="borderless" className="shadow-sm h-full" size="small">
            <Statistic
              title={t("finance.budgetIncome")}
              value={formatIDR(overview.totalIncome, locale)}
              prefix={<PayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={6}>
          <Card variant="borderless" className="shadow-sm h-full" size="small">
            <Statistic
              title={t("finance.budgetProtected")}
              value={formatIDR(overview.protectedSavings, locale)}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={6}>
          <Card variant="borderless" className="shadow-sm h-full" size="small">
            <Statistic
              title={t("finance.budgetAllocatable")}
              value={formatIDR(overview.allocatable, locale)}
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={8} xl={6}>
          <Card variant="borderless" className="shadow-sm h-full" size="small">
            <Statistic
              title={t("finance.budgetSpent")}
              value={formatIDR(overview.totalSpent, locale)}
              prefix={<RiseOutlined />}
              valueStyle={{
                color: overview.overProtected ? "#faad14" : undefined,
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        variant="borderless"
        className="shadow-sm"
        title={<Text strong>{t("finance.budgetSettingTitle")}</Text>}
      >
        <p className="mb-4 text-sm opacity-70">
          {t("finance.budgetSettingHint")}
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{ protectedSavings: settings.protectedSavings }}
          className="max-w-md"
        >
          <Form.Item
            name="protectedSavings"
            label={t("finance.budgetProtected")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore={locale === "en" ? "IDR" : "Rp"}
              min={0}
              step={100000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
              prefix={<WalletOutlined />}
            />
          </Form.Item>
          <div className="flex justify-end">
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<CheckOutlined />}
            >
              {t("settings.save")}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
