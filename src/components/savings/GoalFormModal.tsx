"use client";

import {
  Button,
  ColorPicker,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { createGoalAction, updateGoalAction } from "@/server/actions";
import { DEFAULT_GOAL_COLOR, GOAL_COLORS } from "@/models/goalPresets";
import type { SavingsGoal } from "@/models/types";

interface Props {
  open: boolean;
  editingGoal: SavingsGoal | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormValues {
  name?: string;
  targetAmount?: number;
  deadline?: dayjs.Dayjs | null;
}

/** Modal tambah/edit target tabungan. */
export default function GoalFormModal({
  open,
  editingGoal,
  onClose,
  onSaved,
}: Props) {
  const isEdit = editingGoal !== null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Edit Target" : "Tambah Target Baru"}
      width={{ xs: "92%", sm: 520 }}
      destroyOnHidden
      footer={null}
    >
      {/* `key` + destroyOnHidden memastikan state & form reset setiap kali dibuka. */}
      <GoalForm
        key={editingGoal?.id ?? "create"}
        editingGoal={editingGoal}
        onClosed={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

interface FormProps {
  editingGoal: SavingsGoal | null;
  onClosed: () => void;
  onSaved: () => void;
}

function GoalForm({ editingGoal, onClosed, onSaved }: FormProps) {
  const [form] = Form.useForm<FormValues>();
  const [color, setColor] = useState<string>(
    editingGoal?.color ?? DEFAULT_GOAL_COLOR,
  );
  const [saving, setSaving] = useState(false);
  const isEdit = editingGoal !== null;

  async function handleFinish(values: FormValues) {
    setSaving(true);
    try {
      const deadlineISO = values.deadline
        ? values.deadline.startOf("day").toISOString()
        : null;
      const input = {
        name: (values.name ?? "").trim(),
        targetAmount: Number(values.targetAmount ?? 0),
        deadline: deadlineISO,
        color,
      };
      if (isEdit && editingGoal) {
        await updateGoalAction(editingGoal.id, input);
      } else {
        await createGoalAction(input);
      }
      onSaved();
      onClosed();
    } catch (err) {
      console.error("[GoalFormModal] gagal menyimpan:", err);
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
        name: editingGoal?.name ?? "",
        targetAmount: editingGoal?.targetAmount,
        deadline: editingGoal?.deadline ? dayjs(editingGoal.deadline) : null,
      }}
    >
      <Form.Item
        name="name"
        label="Nama Target"
        rules={[
          { required: true, message: "Nama target wajib diisi" },
          { whitespace: true, message: "Nama tidak boleh hanya spasi" },
        ]}
      >
        <Input
          placeholder="Contoh: Dana Darurat, Liburan, Haji"
          maxLength={100}
        />
      </Form.Item>

      <Form.Item
        name="targetAmount"
        label="Nominal Target"
        rules={[
          { required: true, message: "Nominal target wajib diisi" },
          {
            validator: (_, value) =>
              value && value > 0
                ? Promise.resolve()
                : Promise.reject(new Error("Nominal harus lebih dari 0")),
          },
        ]}
      >
        <InputNumber<number>
          className="w-full"
          addonBefore="Rp"
          min={1000}
          step={50000}
          placeholder="1.000.000"
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          }
          parser={(value) => Number((value ?? "").replace(/\D/g, "") || 0)}
        />
      </Form.Item>

      <Form.Item name="deadline" label="Tenggat Waktu (opsional)">
        <DatePicker
          className="w-full"
          format="DD MMMM YYYY"
          placeholder="Pilih tanggal"
        />
      </Form.Item>

      <Form.Item label="Warna Aksen">
        <ColorPicker
          value={color}
          onChange={(c) => setColor(c.toHexString())}
          showText
          format="hex"
          presets={[{ label: "Pilihan Warna", colors: GOAL_COLORS }]}
        />
      </Form.Item>

      <div className="mt-2 flex justify-end gap-2">
        <Button onClick={onClosed}>Batal</Button>
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEdit ? "Simpan Perubahan" : "Tambah Target"}
        </Button>
      </div>
    </Form>
  );
}
