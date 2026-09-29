"use client";

import { CheckOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Select,
  Typography,
} from "antd";
import { useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { UserSettings } from "@/features/web/types";
import { updateSettingsAction } from "@/utils/server/actions";

const { Text } = Typography;

interface Props {
  initialSettings: UserSettings;
}

/**
 * Halaman pengaturan: siklus & saldo awal. Manajemen wadah/subkategori
 * dipindah ke halaman Kategori.
 */
export default function SettingsSection({ initialSettings }: Props) {
  const { t } = useLocale();
  const { message } = App.useApp();

  const [savingSettings, setSavingSettings] = useState(false);

  const [settingsForm] = Form.useForm<{
    cycleStartDay: number;
    savingsInitial: number;
  }>();

  async function handleSaveSettings(values: {
    cycleStartDay: number;
    savingsInitial: number;
  }) {
    setSavingSettings(true);
    try {
      await updateSettingsAction({
        cycleStartDay: values.cycleStartDay,
        savingsInitial: values.savingsInitial,
      });
      message.success(t("settings.saved"));
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Pengaturan siklus & saldo */}
      <Card
        variant="borderless"
        className="shadow-sm"
        style={{ marginBottom: 16 }}
        title={<Text strong>{t("settings.financeTitle")}</Text>}
      >
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSaveSettings}
          initialValues={{
            cycleStartDay: initialSettings.cycleStartDay,
            savingsInitial: initialSettings.savingsInitial,
          }}
          className="max-w-md"
        >
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
            />
          </Form.Item>
          <Form.Item
            name="savingsInitial"
            label={t("settings.savingsInitial")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore="Rp"
              min={0}
              step={100000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
            />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={savingSettings}
            icon={<CheckOutlined />}
          >
            {t("settings.save")}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
