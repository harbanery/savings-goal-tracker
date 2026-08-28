"use client";

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
} from "antd";
import dayjs from "dayjs";
import { useSyncExternalStore, useState } from "react";
import { createPurchaseAction, updatePurchaseAction } from "@/server/actions";
import {
  CATEGORIES,
  getUnit,
  getUnitFullLabel,
  getUnitsOfCategory,
  UNITS,
} from "@/models/categories";
import type { Purchase, PurchaseInput } from "@/models/types";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";

const TOUCH_QUERY = "(pointer: coarse)";

/**
 * Berlangganan ke media query pointer agar mengetahui apakah perangkat
 * menggunakan input sentuh (mobile/tablet). Dipakai untuk menonaktifkan
 * keyboard virtual pada DatePicker. Menggunakan useSyncExternalStore agar
 * aman terhadap SSR dan tidak memicu setState di dalam effect.
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
  editingPurchase: Purchase | null;
  cycleLabel: string;
  onClose: () => void;
  onSaved: () => void;
  /**
   * Handler CRUD in-memory untuk mode mockup publik (tanpa DB).
   * Jika diberikan, server action tidak dipanggil.
   */
  demoHandlers?: {
    create: (input: PurchaseInput) => void;
    update: (id: string, input: PurchaseInput) => void;
  };
}

interface FormValues {
  name?: string;
  categoryId?: string;
  amount?: number;
  note?: string;
  date?: dayjs.Dayjs;
}

/** Modal tambah/edit pembelian. */
export default function PurchaseFormModal({
  open,
  editingPurchase,
  cycleLabel,
  onClose,
  onSaved,
  demoHandlers,
}: Props) {
  const isEdit = editingPurchase !== null;
  const { t } = useLocale();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? t("form.editTitle") : t("form.addTitle")}
      width={{ xs: "92%", sm: 520 }}
      destroyOnHidden
      footer={null}
    >
      <PurchaseForm
        key={editingPurchase?.id ?? "create"}
        editingPurchase={editingPurchase}
        cycleLabel={cycleLabel}
        onClosed={onClose}
        onSaved={onSaved}
        demoHandlers={demoHandlers}
      />
    </Modal>
  );
}

interface FormProps {
  editingPurchase: Purchase | null;
  cycleLabel: string;
  onClosed: () => void;
  onSaved: () => void;
  demoHandlers?: {
    create: (input: PurchaseInput) => void;
    update: (id: string, input: PurchaseInput) => void;
  };
}

function PurchaseForm({
  editingPurchase,
  cycleLabel,
  onClosed,
  onSaved,
  demoHandlers,
}: FormProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const isEdit = editingPurchase !== null;
  const { t, locale } = useLocale();
  // Pada perangkat sentuh (mobile/tablet), buat input tanggal read-only agar
  // keyboard virtual tidak muncul; pemilihan tanggal tetap via kalender popup.
  const isTouchDevice = useTouchDevice();

  async function handleFinish(values: FormValues) {
    setSaving(true);
    try {
      const input = {
        name: (values.name ?? "").trim(),
        categoryId: values.categoryId ?? "",
        amount: Number(values.amount ?? 0),
        note: (values.note ?? "").trim(),
        date: (values.date ?? dayjs()).toISOString(),
      };
      if (demoHandlers) {
        // Mode mockup publik: simpan ke memori client tanpa server action.
        if (isEdit && editingPurchase) {
          demoHandlers.update(editingPurchase.id, input);
        } else {
          demoHandlers.create(input);
        }
      } else if (isEdit && editingPurchase) {
        await updatePurchaseAction(editingPurchase.id, input);
      } else {
        await createPurchaseAction(input);
      }
      onSaved();
      onClosed();
    } catch (err) {
      console.error("[PurchaseFormModal] gagal menyimpan:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      requiredMark={false}
      className="mt-2"
      initialValues={{
        name: editingPurchase?.name ?? "",
        // Resolve ID lama ke subkategori/unit yang valid (legacy-aware).
        categoryId: getUnit(editingPurchase?.categoryId ?? "")?.id
          ?? UNITS[0]?.id,
        amount: editingPurchase?.amount,
        note: editingPurchase?.note ?? "",
        date: editingPurchase ? dayjs(editingPurchase.date) : dayjs(),
      }}
    >
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
        name="categoryId"
        label={t("form.subcategory")}
        rules={[{ required: true, message: t("form.subcategoryRequired") }]}
      >
        <Select
          placeholder={t("form.subcategoryPlaceholder")}
          showSearch
          optionFilterProp="children"
        >
          {CATEGORIES.map((c) => {
            const units = getUnitsOfCategory(c.id);
            return (
              <Select.OptGroup
                key={c.id}
                label={
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
                    {pickText(c.label, locale)}
                  </span>
                }
              >
                {units.map((u) => (
                  <Select.Option key={u.id} value={u.id}>
                    {getUnitFullLabel(u.id, locale)}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            );
          })}
        </Select>
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
          type="number"
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
