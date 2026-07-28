"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import {
  addContributionAction,
  deleteContributionAction,
} from "@/server/actions";
import type { SavingsGoal } from "@/models/types";
import { formatIDR } from "@/utils/currency";

const { Text, Title } = Typography;

interface Props {
  open: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
  onMutated: () => void;
}

/** Modal detail goal: ringkasan, form setoran, dan riwayat setoran. */
export default function ContributionModal({
  open,
  goal,
  onClose,
  onMutated,
}: Props) {
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!goal || !amount || amount <= 0) return;
    setSaving(true);
    try {
      await addContributionAction(goal.id, amount, note);
      setAmount(null);
      setNote("");
      onMutated();
    } catch (err) {
      console.error("[ContributionModal] gagal menambah setoran:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteContributionAction(id);
      onMutated();
    } catch (err) {
      console.error("[ContributionModal] gagal menghapus setoran:", err);
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        goal ? (
          <Space>
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: goal.color,
              }}
            />
            <span>{goal.name}</span>
          </Space>
        ) : (
          "Setoran"
        )
      }
      width={{ xs: "92%", sm: 540, md: 620 }}
      footer={[
        <Button key="close" onClick={onClose}>
          Tutup
        </Button>,
      ]}
    >
      {goal && (
        <div className="space-y-4">
          {/* Ringkasan */}
          <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
            <div className="flex items-end justify-between">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Terkumpul
                </Text>
                <div
                  className="text-2xl font-bold"
                  style={{ color: goal.color }}
                >
                  {formatIDR(goal.currentAmount)}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  dari {formatIDR(goal.targetAmount)} ({goal.progress}%)
                </Text>
              </div>
              <Title level={4} style={{ marginBottom: 0 }}>
                {goal.progress}%
              </Title>
            </div>
          </div>

          {/* Form setoran */}
          <div>
            <Text strong>Tambah Setoran</Text>
            <Space.Compact className="mt-2 w-full">
              <InputNumber
                className="w-full"
                addonBefore="Rp"
                min={1000}
                step={50000}
                placeholder="Nominal"
                value={amount}
                onChange={(v) => setAmount(v ?? null)}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                }
                parser={(value) =>
                  Number((value ?? "").replace(/\D/g, "") || 0)
                }
                disabled={saving}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                loading={saving}
                onClick={handleAdd}
                disabled={!amount || amount <= 0}
              >
                Setor
              </Button>
            </Space.Compact>
            <Input
              className="mt-2"
              placeholder="Catatan (opsional)"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          <Divider style={{ margin: "8px 0" }} />

          {/* Riwayat setoran */}
          <div>
            <Text strong>Riwayat Setoran</Text>
            {goal.contributions.length === 0 ? (
              <div className="mt-4">
                <Empty description="Belum ada setoran" />
              </div>
            ) : (
              <List
                className="mt-2"
                size="small"
                dataSource={goal.contributions}
                renderItem={(c) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        key="del"
                        title="Hapus setoran ini?"
                        okText="Hapus"
                        okButtonProps={{ danger: true }}
                        cancelText="Batal"
                        onConfirm={() => handleDelete(c.id)}
                      >
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label="Hapus setoran"
                        />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          + {formatIDR(c.amount)}
                        </span>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(c.date).format("DD MMMM YYYY, HH:mm")}
                          </Text>
                          {c.note && (
                            <Text style={{ fontSize: 12 }}>{c.note}</Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
