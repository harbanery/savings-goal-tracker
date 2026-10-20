"use client";

import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Typography,
} from "antd";
import { useMemo, useState, type ComponentProps } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { buildUnits, getUnit } from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  RecurringRule,
} from "@/features/web/types";
import {
  createRecurringRuleAction,
  updateRecurringRuleAction,
} from "@/utils/server/actions";
import { trackEvent } from "@/components/ui/vercel/track";

interface Props {
  open: boolean;
  editingRule: RecurringRule | null;
  categories: BudgetCategory[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  type?: "EXPENSE" | "INCOME";
  name?: string;
  unitId?: string;
  amount?: number;
  dayOfMonth?: number;
  note?: string;
}

const TYPE_OPTIONS = [
  { value: "EXPENSE" as const, icon: <ArrowUpOutlined /> },
  { value: "INCOME" as const, icon: <ArrowDownOutlined /> },
];

/**
 * Modal tambah/edit aturan berulang (rekomendasi D2): sebelumnya aturan
 * hanya bisa lahir lewat opsi "Setiap Bulan" di form transaksi — kini
 * bisa dibuat/diedit langsung dari tab Berulang.
 */
export default function RecurringFormModal({
  open,
  editingRule,
  categories,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const isEdit = editingRule !== null;
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? t("form.recurringEditTitle") : t("form.recurringAddTitle")}
      width={{ xs: "92%", sm: 520 }}
      centered
      destroyOnHidden
      footer={null}
    >
      <RecurringForm
        key={editingRule?.id ?? "create"}
        editingRule={editingRule}
        categories={categories}
        onClosed={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

interface FormProps {
  editingRule: RecurringRule | null;
  categories: BudgetCategory[];
  onClosed: () => void;
  onSaved: () => void;
}

function RecurringForm({
  editingRule,
  categories,
  onClosed,
  onSaved,
}: FormProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const { t, locale } = useLocale();
  const { modal } = App.useApp();
  const isEdit = editingRule !== null;

  const units = useMemo(() => buildUnits(categories), [categories]);

  /** Unit awal: subkategori aturan (hanya pengeluaran), atau wadahnya. */
  const initialUnitId = editingRule
    ? editingRule.type === "EXPENSE"
      ? (editingRule.subcategoryId ?? editingRule.categoryId)
      : editingRule.categoryId
    : (units[0]?.id ?? "");

  const selectedType =
    Form.useWatch("type", form) ?? editingRule?.type ?? "EXPENSE";

  const selectedDay = Form.useWatch("dayOfMonth", form);

  /** Opsi unit sama dengan form transaksi: pengeluaran memakai
   *  subkategori (grup per wadah), pemasukan cukup level wadah. */
  const unitOptions = useMemo<
    NonNullable<ComponentProps<typeof Select>["options"]>
  >(() => {
    if (selectedType === "EXPENSE") {
      return categories.flatMap(
        (c): NonNullable<ComponentProps<typeof Select>["options"]> => {
          const wadahLabel = (
            <span className="flex items-center gap-1.5">
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.color,
                }}
              />
              {c.name}
            </span>
          );
          if (c.subcategories.length > 0) {
            return [
              {
                label: wadahLabel,
                title: c.name,
                options: c.subcategories.map((s) => ({
                  value: s.id,
                  label: `${s.name} · ${c.name}`,
                })),
              },
            ];
          }
          return [{ value: c.id, label: wadahLabel, title: c.name }];
        },
      );
    }
    return categories.map((c) => ({ value: c.id, label: c.name }));
  }, [categories, selectedType]);

  async function handleFinish(values: FormValues): Promise<void> {
    setSaving(true);
    try {
      const unit = getUnit(categories, values.unitId);
      const categoryId = unit
        ? unit.categoryId
        : (values.unitId ?? "");
      const subcategoryId =
        values.type === "EXPENSE" && unit && unit.id !== unit.categoryId
          ? unit.id
          : null;

      const input = {
        type: values.type ?? "EXPENSE",
        name: (values.name ?? "").trim(),
        amount: Number(values.amount ?? 0),
        dayOfMonth: Number(values.dayOfMonth ?? 1),
        categoryId,
        subcategoryId,
        note: (values.note ?? "").trim(),
      };

      if (isEdit && editingRule) {
        await updateRecurringRuleAction(editingRule.id, input);
        trackEvent("recurring_updated");
      } else {
        await createRecurringRuleAction(input);
        // Nominal sengaja tidak dikirim (privasi) — hanya jenisnya.
        trackEvent("recurring_created", {
          type: input.type.toLowerCase(),
        });
      }
      onSaved();
      onClosed();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      console.error("[RecurringFormModal] gagal menyimpan aturan:", err);
      modal.error({
        title: t("error.title"),
        content: messageText,
      });
    } finally {
      setSaving(false);
    }
  }

  const unitLabel =
    selectedType === "INCOME" ? t("form.toUnit") : t("form.subcategory");

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      requiredMark={false}
      className="mt-2!"
      initialValues={{
        type: editingRule?.type ?? "EXPENSE",
        name: editingRule?.name ?? "",
        unitId: initialUnitId,
        amount: editingRule?.amount,
        dayOfMonth: editingRule?.dayOfMonth ?? 1,
        note: editingRule?.note ?? "",
      }}
    >
      <Form.Item name="type" className="mb-4!">
        <Segmented
          block
          // Jenis tidak bisa diubah saat edit — konsisten dengan form
          // transaksi (DROID.md).
          disabled={isEdit}
          onChange={(value) => {
            // Pemasukan tidak memakai subkategori — naikkan unit
            // terpilih ke wadah induknya bila perlu.
            if (value !== "EXPENSE") {
              const unit = getUnit(categories, form.getFieldValue("unitId"));
              if (unit && unit.id !== unit.categoryId) {
                form.setFieldValue("unitId", unit.categoryId);
              }
            }
          }}
          options={TYPE_OPTIONS.map((o) => ({
            value: o.value,
            label: (
              <span className="flex items-center justify-center gap-1.5">
                {o.icon}
                {t(`form.type${o.value.charAt(0)}${o.value.slice(1).toLowerCase()}`)}
              </span>
            ),
          }))}
        />
      </Form.Item>

      <Form.Item
        name="name"
        label={t("form.name")}
        rules={[
          { required: true, message: t("form.nameRequired") },
          { whitespace: true, message: t("form.nameWhitespace") },
        ]}
      >
        <Input placeholder={t("form.namePlaceholder")} maxLength={100} />
      </Form.Item>

      <Form.Item
        name="unitId"
        label={unitLabel}
        rules={[{ required: true, message: t("form.subcategoryRequired") }]}
      >
        <Select
          placeholder={t("form.subcategoryPlaceholder")}
          showSearch
          optionFilterProp="label"
          options={unitOptions}
        />
      </Form.Item>

      <Form.Item
        name="amount"
        label={t("form.amount")}
        rules={[
          { required: true, message: t("form.amountRequired") },
          {
            validator: (_, value) =>
              value && value > 0
                ? Promise.resolve()
                : Promise.reject(new Error(t("form.amountPositive"))),
          },
        ]}
      >
        <InputNumber<number>
          className="w-full!"
          style={{ width: "100%" }}
          addonBefore={locale === "en" ? "IDR" : "Rp"}
          min={1}
          step={10000}
          placeholder={locale === "en" ? "50,000" : "50.000"}
          formatter={(value) => {
            if (value === undefined || value === null) return "";
            const sep = locale === "en" ? "," : ".";
            return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
          }}
          parser={(value) => Number((value ?? "").replace(/\D/g, "") || 0)}
        />
      </Form.Item>

      <Form.Item
        name="dayOfMonth"
        label={t("form.dayOfMonth")}
        rules={[
          { required: true, message: t("form.dayOfMonthRequired") },
          {
            validator: (_, value) =>
              Number.isInteger(value) && value >= 1 && value <= 31
                ? Promise.resolve()
                : Promise.reject(new Error(t("form.dayOfMonthRange"))),
          },
        ]}
      >
        <InputNumber<number>
          className="w-full!"
          style={{ width: "100%" }}
          min={1}
          max={31}
          step={1}
          precision={0}
          placeholder="25"
        />
      </Form.Item>

      <Typography.Text
        type="secondary"
        className="block! -mt-3! mb-4!"
        style={{ fontSize: 12 }}
      >
        {t("form.dayOfMonthHint", {
          n: selectedDay && selectedDay >= 1 && selectedDay <= 31 ? selectedDay : 1,
        })}
      </Typography.Text>

      <Form.Item name="note" label={t("form.note")}>
        <Input.TextArea
          rows={2}
          placeholder={t("form.notePlaceholder")}
          maxLength={500}
        />
      </Form.Item>

      <div className="mt-2 flex justify-end gap-2">
        <Button onClick={onClosed}>{t("common.cancel")}</Button>
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEdit ? t("form.saveChanges") : t("common.save")}
        </Button>
      </div>
    </Form>
  );
}
