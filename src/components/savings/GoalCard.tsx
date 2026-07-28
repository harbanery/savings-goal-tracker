"use client";

import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Card, Popconfirm, Progress, Space, Tag, Typography } from "antd";
import type { SavingsGoal } from "@/models/types";
import { formatIDR } from "@/utils/currency";
import { daysUntilDeadline } from "@/utils/dateUtils";

const { Text } = Typography;

interface Props {
  goal: SavingsGoal;
  onContribute: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
}

/** Kartu satu target tabungan: progres, nominal, deadline, aksi. */
export default function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: Props) {
  const isCompleted = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const daysLeft = daysUntilDeadline(goal.deadline);
  const overdue = daysLeft !== null && daysLeft < 0;

  return (
    <Card
      variant="borderless"
      className="shadow-sm"
      styles={{ body: { padding: 20 } }}
      style={{ height: "100%" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: goal.color,
              flexShrink: 0,
            }}
          />
          <Text
            strong
            className="truncate"
            style={{ fontSize: 16 }}
            title={goal.name}
          >
            {goal.name}
          </Text>
        </div>
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(goal)}
            aria-label="Edit target"
          />
          <Popconfirm
            title="Hapus target ini?"
            description="Semua setoran akan ikut terhapus."
            okText="Hapus"
            okButtonProps={{ danger: true }}
            cancelText="Batal"
            onConfirm={() => onDelete(goal.id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Hapus target"
            />
          </Popconfirm>
        </Space>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Progress
          type="circle"
          size={72}
          percent={goal.progress}
          strokeColor={goal.color}
          format={(percent) => (
            <span style={{ fontSize: 13, fontWeight: 600 }}>{percent}%</span>
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold" style={{ color: goal.color }}>
            {formatIDR(goal.currentAmount)}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            dari {formatIDR(goal.targetAmount)}
          </Text>
          <Progress
            percent={goal.progress}
            showInfo={false}
            size="small"
            strokeColor={goal.color}
            className="mt-1"
          />
          {!isCompleted && remaining > 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Sisa {formatIDR(remaining)}
            </Text>
          )}
        </div>
      </div>

      <div className="mt-3 flex min-h-[24px] flex-wrap items-center gap-1.5">
        {isCompleted && (
          <Tag color="success" icon={<CheckCircleFilled />}>
            Tercapai
          </Tag>
        )}
        {goal.deadline && (
          <Tag color={overdue ? "error" : daysLeft !== null && daysLeft <= 7 ? "warning" : "default"}>
            {overdue
              ? `Lewat ${Math.abs(daysLeft!)} hari`
              : daysLeft === 0
                ? "Jatuh tempo hari ini"
                : `${daysLeft} hari lagi`}
          </Tag>
        )}
      </div>

      <Button
        block
        type="primary"
        icon={<WalletOutlined />}
        onClick={() => onContribute(goal)}
        className="mt-4"
        style={
          isCompleted
            ? { backgroundColor: goal.color, borderColor: goal.color }
            : undefined
        }
      >
        {isCompleted ? "Tambah Setoran" : "Setor"}
      </Button>
    </Card>
  );
}
