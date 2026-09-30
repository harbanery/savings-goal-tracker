"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  RetweetOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Segmented,
  Select,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useSyncExternalStore, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  buildUnits,
  getParentCategoryId,
  getUnit,
} from "@/features/web/utils/categories";
import {
  parseSavingsProtectionError,
  parseWalletLimitError,
} from "@/features/web/utils/finance";
import type {
  BudgetCategory,
  Transaction,
  TransactionInput,
  TransactionType,
} from "@/features/web/types";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

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
  repeat?: "once" | "monthly";
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
  const { modal } = App.useApp();
  const isTouchDevice = useTouchDevice();
  const isEdit = editingTransaction !== null;

  const units = useMemo(() => buildUnits(categories), [categories]);

  const selectedType =
    Form.useWatch("type", form) ?? editingTransaction?.type ?? "EXPENSE";
  const selectedDate = Form.useWatch("date", form);
  const selectedRepeat = Form.useWatch("repeat", form) ?? "once";

  /** Pengulangan hanya untuk transaksi baru (bukan transfer). */
  const showRepeat = !isEdit && selectedType !== "TRANSFER";

  /** Unit awal: subcategoryId transaksi, atau kategori itu sendiri. */
  const initialUnitId = editingTransaction
    ? (editingTransaction.subcategoryId ?? editingTransaction.categoryId)
    : (units[0]?.id ?? "");

  async function handleFinish(values: FormValues, force = false): Promise<void> {
    setSaving(true);
    try {
      const unit = getUnit(categories, values.unitId);
      const categoryId = unit
        ? unit.categoryId
        : getParentCategoryId(categories, values.unitId ?? "");
      const subcategoryId =
        unit && unit.id !== unit.categoryId ? unit.id : null;

      const input: TransactionInput = {
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
      const recurring = values.repeat === "monthly";

      if (isEdit && editingTransaction) {
        await updateTransactionAction(editingTransaction.id, input, force);
      } else {
        await createTransactionAction(input, { force, recurring });
      }
      onSaved();
      onClosed();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : String(err);
      const protection = parseSavingsProtectionError(messageText);
      const walletLimit = parseWalletLimitError(messageText);
      if (protection && !force) {
        // Pengeluaran menyentuh tabungan dilindungi (Budget) — minta
        // konfirmasi "terpaksa" sebelum menyimpan.
        modal.confirm({
          title: t("form.protectionTitle"),
          content: t("form.protectionDesc", {
            projected: formatIDR(protection.projected, locale),
            limit: formatIDR(protection.limit, locale),
          }),
          okText: t("form.protectionConfirm"),
          okButtonProps: { danger: true },
          cancelText: t("common.cancel"),
          onOk: () => handleFinish(values, true),
        });
      } else if (walletLimit) {
        // Batas wadah (alokasi) terlampaui — TIDAK bisa dipaksa lewat;
        // user harus menaikkan batas wadah di halaman Keuangan.
        modal.error({
          title: t("form.walletLimitTitle"),
          content: t("form.walletLimitDesc", {
            wallet: walletLimit.walletName,
            projected: formatIDR(walletLimit.projected, locale),
            limit: formatIDR(walletLimit.limit, locale),
          }),
        });
      } else {
        console.error("[TransactionFormModal] gagal menyimpan:", err);
        if (!protection) {
          modal.error({
            title: t("error.title"),
            content: messageText,
          });
        }
      }
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

      {showRepeat && (
        <Form.Item name="repeat" label={t("form.repeatLabel")}>
          <Radio.Group
            options={[
              { value: "once", label: t("form.repeatOnce") },
              { value: "monthly", label: t("form.repeatMonthly") },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
      )}
      {showRepeat && selectedRepeat === "monthly" && (
        <Typography.Text type="secondary" className="block -mt-3 mb-4" style={{ fontSize: 12 }}>
          <RetweetOutlined className="mr-1" />
          {t("form.recurHint", {
            n: selectedDate?.date() ?? dayjs().date(),
          })}
        </Typography.Text>
      )}

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
