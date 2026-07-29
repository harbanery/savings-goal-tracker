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
import { useState } from "react";
import { createPurchaseAction, updatePurchaseAction } from "@/server/actions";
import { CATEGORIES } from "@/models/categories";
import type { Purchase } from "@/models/types";
import { useLocale } from "@/components/locale/LocaleProvider";
import { pickText } from "@/components/locale/useTranslatedData";

interface Props {
  open: boolean;
  editingPurchase: Purchase | null;
  cycleLabel: string;
  onClose: () => void;
  onSaved: () => void;
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
      />
    </Modal>
  );
}

interface FormProps {
  editingPurchase: Purchase | null;
  cycleLabel: string;
  onClosed: () => void;
  onSaved: () => void;
}

function PurchaseForm({
  editingPurchase,
  cycleLabel,
  onClosed,
  onSaved,
}: FormProps) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const isEdit = editingPurchase !== null;
  const { t, locale } = useLocale();

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
      if (isEdit && editingPurchase) {
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
        categoryId: editingPurchase?.categoryId ?? CATEGORIES[0]?.id,
        amount: editingPurchase?.amount,
        note: editingPurchase?.note ?? "",
        date: editingPurchase
          ? dayjs(editingPurchase.date)
          : dayjs(),
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
        <Input
          placeholder={t("form.namePlaceholder")}
          maxLength={100}
        />
      </Form.Item>

      <Form.Item
        name="categoryId"
        label={t("form.category")}
        rules={[{ required: true, message: t("form.categoryRequired") }]}
      >
        <Select placeholder={t("form.categoryPlaceholder")}>
          {CATEGORIES.map((c) => (
            <Select.Option key={c.id} value={c.id}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: c.color,
                  marginRight: 8,
                }}
              />
              {pickText(c.label, locale)} ({pickText(c.description, locale)})
            </Select.Option>
          ))}
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
          addonBefore="Rp"
          min={1}
          step={10000}
          placeholder="50.000"
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          }
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
