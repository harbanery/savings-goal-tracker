"use client";

import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Select,
  Statistic,
  Typography,
} from "antd";
import {
  CheckOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  PayCircleOutlined,
  PieChartOutlined,
  RiseOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BudgetOverview, UserSettings } from "@/features/web/types";
import { useCycle } from "@/features/web/hooks/cycle";
import { getBudgetOverviewAction, updateSettingsAction } from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialOverview: BudgetOverview;
  settings: UserSettings;
}

interface BudgetFormValues {
  protectedSavings?: number;
  cycleStartDay?: number;
}

/**
 * Halaman Budget (menu Keuangan): atur tabungan yang dilindungi per
 * siklus + tanggal mulai siklus (dipindah dari Pengaturan).
 * Bisa dialokasikan = pemasukan - tabungan dilindungi; pengeluaran yang
 * menyentuh tabungan akan meminta konfirmasi terpaksa.
 */
export default function BudgetView({ initialOverview, settings }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<BudgetFormValues>();
  const [overview, setOverview] = useState(initialOverview);
  const [saving, setSaving] = useState(false);

  /** Siklus aktif global (dipilih lewat DatePicker month di navbar). */
  const { cycle } = useCycle();

  const refresh = useCallback(async () => {
    try {
      setOverview(await getBudgetOverviewAction(cycle));
    } catch {
      // biarkan state lama
    }
  }, [cycle]);

  const mounted = useRef(false);
  useEffect(() => {
    // Lewati fetch pertama (initialOverview sudah dari server).
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    refresh();
  }, [refresh]);

  async function handleSave(values: BudgetFormValues) {
    setSaving(true);
    try {
      await updateSettingsAction({
        protectedSavings: Number(values.protectedSavings ?? 0),
        cycleStartDay: Number(values.cycleStartDay ?? settings.cycleStartDay),
      });
      message.success(t("settings.saved"));
      // Refresh server component agar startDay baru tersalur ke
      // CycleProvider (batas tanggal siklus diturunkan ulang).
      router.refresh();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-350 flex-col gap-4">
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
              styles={{
                content: {
                  color: overview.overProtected ? "#faad14" : undefined,
                },
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
          initialValues={{
            protectedSavings: settings.protectedSavings,
            cycleStartDay: settings.cycleStartDay,
          }}
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
          <Form.Item
            name="cycleStartDay"
            label={t("settings.cycleStartDay")}
            extra={t("settings.cycleStartDayHint")}
            rules={[{ required: true }]}
          >
            <Select
              options={Array.from({ length: 28 }, (_, i) => ({
                value: i + 1,
                label: String(i + 1),
              }))}
              suffixIcon={<CalendarOutlined />}
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
