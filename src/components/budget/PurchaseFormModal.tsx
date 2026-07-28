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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Edit Pembelian" : "Tambah Pembelian"}
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
        label="Nama Pembelian"
        rules={[
          { required: true, message: "Nama pembelian wajib diisi" },
          { whitespace: true, message: "Nama tidak boleh hanya spasi" },
        ]}
      >
        <Input
          placeholder="Contoh: Makan siang, Bensin, Spotify"
          maxLength={100}
        />
      </Form.Item>

      <Form.Item
        name="categoryId"
        label="Kategori / Wadah"
        rules={[{ required: true, message: "Kategori wajib dipilih" }]}
      >
        <Select placeholder="Pilih kategori">
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
              {c.label} ({c.description})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="amount"
        label="Jumlah Biaya"
        rules={[
          { required: true, message: "Jumlah wajib diisi" },
          {
            validator: (_, value) =>
              value && value > 0
                ? Promise.resolve()
                : Promise.reject(new Error("Jumlah harus lebih dari 0")),
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
        label={`Tanggal${cycleLabel ? ` (Siklus: ${cycleLabel})` : ""}`}
        rules={[{ required: true, message: "Tanggal wajib diisi" }]}
      >
        <DatePicker
          className="w-full"
          format="DD MMMM YYYY"
          placeholder="Pilih tanggal"
        />
      </Form.Item>

      <Form.Item name="note" label="Catatan (opsional)">
        <Input.TextArea
          rows={2}
          placeholder="Catatan tambahan..."
          maxLength={500}
        />
      </Form.Item>

      <div className="mt-2 flex justify-end gap-2">
        <Button onClick={onClosed}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEdit ? "Simpan Perubahan" : "Tambah Pembelian"}
        </Button>
      </div>
    </Form>
  );
}
