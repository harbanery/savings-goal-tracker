"use client";

import {
  AimOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Space,
  Tag,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { SavingsTarget } from "@/features/web/types";
import {
  addTargetFundsAction,
  createTargetAction,
  deleteTargetAction,
  getTargetsAction,
  updateTargetAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

interface Props {
  initialTargets: SavingsTarget[];
}

interface TargetFormValues {
  name: string;
  targetAmount: number;
  deadline?: Dayjs | null;
  note?: string;
}

interface FundsFormValues {
  amount: number;
}

/**
 * Tab Target (menu Keuangan): target tabungan user (mis. beli HP,
 * tabungan 1 tahun) — progres terkumpul + tambah dana manual.
 */
export default function TargetsView({ initialTargets }: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();

  const [targets, setTargets] = useState(initialTargets);
  const [reloadKey, setReloadKey] = useState(0);

  const [targetForm] = Form.useForm<TargetFormValues>();
  const [fundsForm] = Form.useForm<FundsFormValues>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const [fundsTarget, setFundsTarget] = useState<SavingsTarget | null>(null);
  const [fundsSaving, setFundsSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setTargets(await getTargetsAction());
    } catch {
      // biarkan state lama
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reloadKey > 0) void refresh();
  }, [reloadKey, refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSubmit(values: TargetFormValues) {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        targetAmount: Number(values.targetAmount),
        deadline: values.deadline ? values.deadline.toISOString() : null,
        note: values.note ?? "",
      };
      if (editing) {
        await updateTargetAction(editing.id, payload);
      } else {
        await createTargetAction(payload);
      }
      message.success(t("settings.saved"));
      setModalOpen(false);
      setEditing(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTargetAction(id);
      message.success(t("settings.saved"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    }
  }

  async function handleAddFunds(values: FundsFormValues) {
    if (!fundsTarget) return;
    setFundsSaving(true);
    try {
      await addTargetFundsAction(fundsTarget.id, Number(values.amount));
      message.success(t("settings.saved"));
      setFundsTarget(null);
      fundsForm.resetFields();
      setReloadKey((k) => k + 1);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t("settings.saveFailed"),
      );
    } finally {
      setFundsSaving(false);
    }
  }

  /** Persentase progress (cap 100). */
  function percentOf(target: SavingsTarget): number {
    if (target.targetAmount <= 0) return 0;
    return Math.min(
      100,
      Math.round((target.savedAmount / target.targetAmount) * 100),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text strong>{t("finance.targetsTitle")}</Text>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            targetForm.resetFields();
            setModalOpen(true);
          }}
        >
          {t("finance.addTarget")}
        </Button>
      </div>

      {targets.length === 0 ? (
        <Card variant="borderless" className="shadow-sm">
          <div className="flex items-center justify-center py-12">
            <Empty description={t("finance.targetsEmpty")} />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {targets.map((target) => {
            const percent = percentOf(target);
            const done = percent >= 100;
            return (
              <Card
                key={target.id}
                variant="borderless"
                className="shadow-sm h-full"
                title={
                  <span className="flex items-center gap-2">
                    <AimOutlined />
                    <Text strong ellipsis className="max-w-45">
                      {target.name}
                    </Text>
                  </span>
                }
                extra={
                  <Space size={0}>
                    <Button
                      type="text"
                      shape="circle"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditing(target);
                        targetForm.setFieldsValue({
                          name: target.name,
                          targetAmount: target.targetAmount,
                          deadline: target.deadline ? dayjs(target.deadline) : null,
                          note: target.note,
                        });
                        setModalOpen(true);
                      }}
                      aria-label={t("finance.editTarget")}
                    />
                    <Popconfirm
                      title={t("finance.deleteTargetConfirm")}
                      okText={t("common.delete")}
                      okButtonProps={{ danger: true }}
                      cancelText={t("common.cancel")}
                      onConfirm={() => void handleDelete(target.id)}
                    >
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={t("common.delete")}
                      />
                    </Popconfirm>
                  </Space>
                }
              >
                <div className="flex flex-col gap-3">
                  {target.deadline && (
                    <Tag>
                      {t("finance.targetDeadlineLabel")}:{" "}
                      {dayjs(target.deadline).format("DD MMM YYYY")}
                    </Tag>
                  )}
                  <div>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <Text strong>
                        {formatIDR(target.savedAmount, locale)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("finance.targetProgress", {
                          saved: formatIDR(target.savedAmount, locale),
                          target: formatIDR(target.targetAmount, locale),
                        })}
                      </Text>
                    </div>
                    <Progress
                      percent={percent}
                      status={done ? "success" : "active"}
                      strokeColor={done ? "#16a34a" : "#4f46e5"}
                    />
                  </div>
                  {target.note && (
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {target.note}
                    </Text>
                  )}
                  <div className="flex justify-end">
                    <Button
                      icon={<DollarOutlined />}
                      onClick={() => {
                        setFundsTarget(target);
                        fundsForm.resetFields();
                      }}
                    >
                      {t("finance.addTargetFunds")}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal tambah/edit target */}
      <Modal
        open={modalOpen}
        title={editing ? t("finance.editTarget") : t("finance.addTarget")}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        footer={null}
        destroyOnHidden
        centered
        width={{ xs: "92%", sm: 480 }}
      >
        <Form
          form={targetForm}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ targetAmount: 0 }}
        >
          <Form.Item
            name="name"
            label={t("finance.targetName")}
            rules={[{ required: true }]}
          >
            <Input maxLength={100} placeholder={t("finance.targetNameHint")} />
          </Form.Item>
          <Form.Item
            name="targetAmount"
            label={t("finance.targetAmount")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore={locale === "en" ? "IDR" : "Rp"}
              min={1}
              step={100000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
            />
          </Form.Item>
          <Form.Item
            name="deadline"
            label={t("finance.targetDeadline")}
            rules={[]}
          >
            <DatePicker
              className="w-full"
              format="DD MMM YYYY"
              placeholder={t("form.datePlaceholder")}
            />
          </Form.Item>
          <Form.Item name="note" label={t("finance.targetNote")}>
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              icon={<CloseOutlined />}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              icon={<CheckOutlined />}
            >
              {t("settings.save")}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal tambah dana */}
      <Modal
        open={fundsTarget !== null}
        title={t("finance.addFundsTitle")}
        onCancel={() => setFundsTarget(null)}
        footer={null}
        destroyOnHidden
        centered
        width={{ xs: "92%", sm: 420 }}
      >
        <Form form={fundsForm} layout="vertical" onFinish={handleAddFunds}>
          {fundsTarget && (
            <p className="mb-4 text-sm opacity-70">
              {fundsTarget.name} —{" "}
              {t("finance.targetProgress", {
                saved: formatIDR(fundsTarget.savedAmount, locale),
                target: formatIDR(fundsTarget.targetAmount, locale),
              })}
            </p>
          )}
          <Form.Item
            name="amount"
            label={t("finance.targetAmount")}
            rules={[{ required: true }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              addonBefore={locale === "en" ? "IDR" : "Rp"}
              min={1}
              step={50000}
              formatter={(v) =>
                v === undefined || v === null
                  ? ""
                  : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(v) => Number((v ?? "").replace(/\D/g, "") || 0)}
            />
          </Form.Item>
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={() => setFundsTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={fundsSaving}
              icon={<CheckOutlined />}
            >
              {t("settings.save")}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
