"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
} from "antd";
import dayjs from "dayjs";
import { useSyncExternalStore, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  buildUnits,
  getParentCategoryId,
  getUnit,
} from "@/features/web/utils/categories";
import type {
  BudgetCategory,
  Transaction,
  TransactionType,
} from "@/features/web/types";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/utils/server/actions";

const TOUCH_QUERY = "(pointer: coarse)";

/**
 * Deteksi perangkat sentuh untuk menonaktifkan keyboard virtual pada
 * DatePicker (aman SSR via useSyncExternalStore).
 */
function subscribeTouch(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(TOUCH_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getTouchSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(TOUCH_QUERY).matches;
}

function getTouchServerSnapshot(): boolean {
  return false;
}

function useTouchDevice(): boolean {
  return useSyncExternalStore(
    subscribeTouch,
    getTouchSnapshot,
    getTouchServerSnapshot,
  );
}

interface Props {
  open: boolean;
  editingTransaction: Transaction | null;
  categories: BudgetCategory[];
  cycleLabel: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  type?: TransactionType;
  name?: string;
  unitId?: string;
  amount?: number;
  note?: string;
  date?: dayjs.Dayjs;
  toCategoryId?: string;
}

const TYPE_OPTIONS = [
  { value: "EXPENSE", icon: <ArrowUpOutlined /> },
  { value: "INCOME", icon: <ArrowDownOutlined /> },
  { value: "TRANSFER", icon: <SwapOutlined /> },
];

/** Modal tambah/edit transaksi (pengeluaran / pemasukan / transfer). */
export default function TransactionFormModal({
  open,
  editingTransaction,
  categories,
  cycleLabel,
  onClose,
  onSaved,
}: Props) {
  const isEdit = editingTransaction !== null;
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? t("form.editTitle") : t("form.addTitle")}
      width={{ xs: "92%", sm: 520 }}
      centered
      destroyOnHidden
      footer={null}
    >
      <TransactionForm
        key={editingTransaction?.id ?? "create"}
        editingTransaction={editingTransaction}
        categories={categories}
        cycleLabel={cycleLabel}
        onClosed={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

interface FormProps {
  editingTransaction: Transaction | null;
  categories: BudgetCategory[];
  cycleLabel: string;
  onClosed: () => void;
  onSaved: () => void;
}

function TransactionForm({
  editingTransaction,
  categories,
  cycleLabel,
  onClosed,
  onSaved,
}: FormProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const { t, locale } = useLocale();
  const isTouchDevice = useTouchDevice();
  const isEdit = editingTransaction !== null;

  const units = useMemo(() => buildUnits(categories), [categories]);

  const selectedType =
    Form.useWatch("type", form) ?? editingTransaction?.type ?? "EXPENSE";

  /** Unit awal: subcategoryId transaksi, atau kategori itu sendiri. */
  const initialUnitId = editingTransaction
    ? (editingTransaction.subcategoryId ?? editingTransaction.categoryId)
    : (units[0]?.id ?? "");

  async function handleFinish(values: FormValues) {
    setSaving(true);
    try {
      const unit = getUnit(categories, values.unitId);
      const categoryId = unit
        ? unit.categoryId
        : getParentCategoryId(categories, values.unitId ?? "");
      const subcategoryId =
        unit && unit.id !== unit.categoryId ? unit.id : null;

      const input = {
        type: values.type ?? "EXPENSE",
        name: (values.name ?? "").trim(),
        amount: Number(values.amount ?? 0),
        note: (values.note ?? "").trim(),
        date: (values.date ?? dayjs()).toISOString(),
        categoryId,
        subcategoryId,
        toCategoryId:
          values.type === "TRANSFER" ? values.toCategoryId ?? "" : null,
      };

      if (isEdit && editingTransaction) {
        await updateTransactionAction(editingTransaction.id, input);
      } else {
        await createTransactionAction(input);
      }
      onSaved();
      onClosed();
    } catch (err) {
      console.error("[TransactionFormModal] gagal menyimpan:", err);
    } finally {
      setSaving(false);
    }
  }

  const sourceLabel =
    selectedType === "INCOME"
      ? t("form.toUnit")
      : selectedType === "TRANSFER"
        ? t("form.fromUnit")
        : t("form.subcategory");

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      requiredMark={false}
      className="mt-2"
      initialValues={{
        type: editingTransaction?.type ?? "EXPENSE",
        name: editingTransaction?.name ?? "",
        unitId: initialUnitId,
        amount: editingTransaction?.amount,
        note: editingTransaction?.note ?? "",
        date: editingTransaction ? dayjs(editingTransaction.date) : dayjs(),
        toCategoryId: editingTransaction?.toCategoryId ?? undefined,
      }}
    >
      <Form.Item name="type" className="mb-4">
        <Segmented
          block
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
        label={sourceLabel}
        rules={[{ required: true, message: t("form.subcategoryRequired") }]}
      >
        <Select
          placeholder={t("form.subcategoryPlaceholder")}
          showSearch
          optionFilterProp="label"
          options={categories.map((c) => ({
            label: (
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
            ),
            title: c.name,
            options: (c.subcategories.length > 0
              ? c.subcategories.map((s) => ({
                  value: s.id,
                  label: `${s.name} · ${c.name}`,
                }))
              : [
                  {
                    value: c.id,
                    label: c.name,
                  },
                ]
            ) as { value: string; label: string }[],
          }))}
        />
      </Form.Item>

      {selectedType === "TRANSFER" && (
        <Form.Item
          name="toCategoryId"
          label={t("form.toCategory")}
          rules={[{ required: true, message: t("form.toCategoryRequired") }]}
        >
          <Select
            placeholder={t("form.toCategoryPlaceholder")}
            showSearch
            optionFilterProp="label"
            options={categories.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />
        </Form.Item>
      )}

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
          className="w-full"
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
        name="date"
        label={
          cycleLabel
            ? t("form.dateWithCycle", { label: cycleLabel })
            : t("form.date")
        }
        rules={[{ required: true, message: t("form.dateRequired") }]}
      >
        <DatePicker
          className="w-full"
          inputReadOnly={isTouchDevice}
          format="DD MMMM YYYY"
          placeholder={t("form.datePlaceholder")}
        />
      </Form.Item>

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
          {isEdit ? t("form.saveChanges") : t("form.addTitle")}
        </Button>
      </div>
    </Form>
  );
}
