"use client";

import {
  AimOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  WalletOutlined,
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
  Radio,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useCycle } from "@/features/web/hooks/cycle";
import type { BudgetCategory, SavingsTarget } from "@/features/web/types";
import TransactionFormModal from "@/features/transactions/components/ui/TransactionFormModal";
import {
  createTargetAction,
  deleteTargetAction,
  getTargetsAction,
  updateTargetAction,
} from "@/utils/server/actions";
import { formatIDR } from "@/utils/helpers";

const { Text } = Typography;

/** Opsi urut/tampil kartu target (rekomendasi D6). */
type TargetSort = "default" | "deadline" | "progress" | "almost";

/** Ambang "hampir tercapai" untuk opsi urut `almost` (progres ≥ 70%). */
const ALMOST_THRESHOLD = 70;

/** Rata-rata panjang bulan (hari) untuk estimasi sisihan per bulan. */
const DAYS_PER_MONTH = 30.44;

interface Props {
  initialTargets: SavingsTarget[];
  categories: BudgetCategory[];
}

interface TargetFormValues {
  name: string;
  targetAmount: number;
  /** Cakupan wadah sumber dana: semua wadah atau wadah tertentu. */
  scope: "all" | "custom";
  categoryIds?: string[];
  deadline?: Dayjs | null;
  note?: string;
}

/** Estimasi sisihan per bulan menjelang deadline (rekomendasi D6). */
interface DeadlineEstimate {
  /** Sisa hari sampai deadline (0 = hari ini). */
  daysLeft: number;
  /** Sisa bulan (minimal 1) — dasar pembagian dana. */
  months: number;
  /** Sisa dana ÷ sisa bulan, dibulatkan ke atas. */
  perMonth: number;
  /** true bila deadline sudah terlewat. */
  overdue: boolean;
}

/** Persentase progress (cap 100; dana minus dianggap 0). */
function percentOf(target: SavingsTarget): number {
  if (target.targetAmount <= 0) return 0;
  return Math.min(
    100,
    Math.round((Math.max(0, target.saved) / target.targetAmount) * 100),
  );
}

/**
 * D6: estimasi "sisihkan Rp X/bulan" = (target − terkumpul) ÷ sisa
 * bulan sampai deadline — murni kalkulasi client; null bila tanpa
 * deadline atau sudah tercapai.
 */
function estimateOf(target: SavingsTarget): DeadlineEstimate | null {
  if (!target.deadline || target.saved >= target.targetAmount) return null;
  const daysLeft = dayjs(target.deadline)
    .startOf("day")
    .diff(dayjs().startOf("day"), "day");
  const remaining = target.targetAmount - Math.max(0, target.saved);
  const months = Math.max(
    1,
    Math.ceil(Math.max(0, daysLeft) / DAYS_PER_MONTH),
  );
  return {
    daysLeft,
    months,
    perMonth: Math.ceil(remaining / months),
    overdue: daysLeft < 0,
  };
}

/**
 * Tab Target (menu Keuangan): target tabungan user (mis. beli HP,
 * tabungan 1 tahun). Dana terkumpul TIDAK lagi ditambah manual —
 * dihitung otomatis dari tabungan bersih seluruh siklus pada wadah
 * terpilih (semua wadah atau wadah tertentu).
 */
export default function TargetsView({
  initialTargets,
  categories,
}: Props) {
  const { t, locale } = useLocale();
  const { message } = App.useApp();

  const [targets, setTargets] = useState(initialTargets);
  const [reloadKey, setReloadKey] = useState(0);
  /** D6: urut/tampil kartu target. */
  const [sortMode, setSortMode] = useState<TargetSort>("default");
  /** D6: aksi cepat "Catat setoran" — form INCOME ke wadah scope target. */
  const [depositTarget, setDepositTarget] = useState<SavingsTarget | null>(
    null,
  );

  /** Siklus aktif global — batas tanggal form transaksi setoran. */
  const { cycle } = useCycle();

  const [targetForm] = Form.useForm<TargetFormValues>();
  const scope = Form.useWatch("scope", targetForm) ?? "all";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsTarget | null>(null);
  const [saving, setSaving] = useState(false);

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
        categoryIds: values.scope === "custom" ? values.categoryIds ?? [] : [],
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

  /** D6: kartu target sesuai urut/tampil aktif. */
  const visibleTargets = useMemo(() => {
    switch (sortMode) {
      case "deadline":
        // Deadline terdekat duluan; tanpa deadline tetap di belakang.
        return [...targets].sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        });
      case "progress":
        return [...targets].sort(
          (a, b) => percentOf(b) - percentOf(a),
        );
      case "almost":
        // Filter "hampir capai": belum selesai & progres ≥ ambang.
        return targets
          .filter((t) => {
            const p = percentOf(t);
            return p >= ALMOST_THRESHOLD && p < 100;
          })
          .sort((a, b) => percentOf(b) - percentOf(a));
      default:
        return targets;
    }
  }, [targets, sortMode]);

  /** Label cakupan wadah sumber dana target. */
  function renderScope(target: SavingsTarget) {
    if (target.categoryIds.length === 0) {
      return <Tag style={{ margin: 0 }}>{t("finance.targetScopeAll")}</Tag>;
    }
    const names = target.categoryIds
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return (
      <Tooltip title={names.join(", ")}>
        <Tag style={{ margin: 0 }}>
          <span className="flex items-center gap-1">
            <WalletOutlined />
            {t("finance.targetScopeCount", { n: names.length })}
          </span>
        </Tag>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <Text strong>{t("finance.targetsTitle")}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("finance.targetAutoHint")}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* D6: urut/tampil kartu target (relevan saat > 1 target). */}
          {targets.length > 1 && (
            <Select<TargetSort>
              className="min-w-40!"
              value={sortMode}
              onChange={setSortMode}
              aria-label={t("finance.targetSortAria")}
              options={[
                { value: "default", label: t("finance.targetSortDefault") },
                { value: "deadline", label: t("finance.targetSortDeadline") },
                { value: "progress", label: t("finance.targetSortProgress") },
                { value: "almost", label: t("finance.targetSortAlmost") },
              ]}
            />
          )}
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
      </div>

      {targets.length === 0 ? (
        <Card variant="borderless" className="shadow-sm!">
          <div className="flex items-center justify-center py-12">
            <Empty description={t("finance.targetsEmpty")} />
          </div>
        </Card>
      ) : visibleTargets.length === 0 ? (
        // D6: filter "hampir tercapai" tanpa hasil.
        <Card variant="borderless" className="shadow-sm!">
          <div className="flex items-center justify-center py-12">
            <Empty description={t("finance.targetNoAlmost")} />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTargets.map((target) => {
            const percent = percentOf(target);
            const done = percent >= 100;
            const estimate = estimateOf(target);
            return (
              <Card
                key={target.id}
                variant="borderless"
                className="shadow-sm! h-full!"
                title={
                  <span className="flex items-center gap-2">
                    <AimOutlined />
                    <Text strong ellipsis className="max-w-45!">
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
                          scope: target.categoryIds.length > 0 ? "custom" : "all",
                          categoryIds: target.categoryIds,
                          deadline: target.deadline
                            ? dayjs(target.deadline)
                            : null,
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
                  <div className="flex flex-wrap items-center gap-2">
                    {renderScope(target)}
                    {target.deadline && (
                      <DeadlineTag deadline={target.deadline} />
                    )}
                  </div>
                  <div>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <Text strong>{formatIDR(target.saved, locale)}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("finance.targetProgress", {
                          saved: formatIDR(target.saved, locale),
                          target: formatIDR(target.targetAmount, locale),
                        })}
                      </Text>
                    </div>
                    <Progress
                      percent={percent}
                      status={done ? "success" : "active"}
                      strokeColor={done ? "#16a34a" : "#4f46e5"}
                    />
                    {/* D6: estimasi sisihan per bulan sampai deadline. */}
                    {estimate && !estimate.overdue && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                        className="mt-1! block!"
                      >
                        {t("finance.targetMonthlyEstimate", {
                          amount: formatIDR(estimate.perMonth, locale),
                        })}{" "}
                        · {t("finance.targetMonthsLeft", { n: estimate.months })}
                      </Text>
                    )}
                    {estimate?.overdue && (
                      <Text
                        type="danger"
                        style={{ fontSize: 12 }}
                        className="mt-1! block!"
                      >
                        {t("finance.targetOverdue")}
                      </Text>
                    )}
                  </div>
                  {target.note && (
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {target.note}
                    </Text>
                  )}
                  {/* D6: aksi cepat "Catat setoran" — form INCOME ke wadah
                      scope target (semua wadah bila scope kosong). */}
                  {!done && (
                    <div className="border-t border-zinc-100 pt-1 dark:border-zinc-700/60">
                      <Button
                        size="small"
                        block
                        icon={<PlusCircleOutlined />}
                        onClick={() => setDepositTarget(target)}
                        aria-label={t("finance.targetRecordDepositAria", {
                          name: target.name,
                        })}
                      >
                        {t("finance.targetRecordDeposit")}
                      </Button>
                    </div>
                  )}
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
          initialValues={{ targetAmount: 0, scope: "all" }}
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
            name="scope"
            label={t("finance.targetScope")}
            extra={t("finance.targetScopeHint")}
            rules={[{ required: true }]}
          >
            <Radio.Group
              options={[
                { value: "all", label: t("finance.targetScopeAll") },
                { value: "custom", label: t("finance.targetScopeCustom") },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>
          {scope === "custom" && (
            <Form.Item
              name="categoryIds"
              label={t("categories.wadahTitle")}
              rules={[
                { required: true, message: t("form.toCategoryRequired") },
              ]}
            >
              <Select
                mode="multiple"
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
            name="deadline"
            label={t("finance.targetDeadline")}
            rules={[]}
          >
            <DatePicker
              className="w-full!"
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

      {/* D6: aksi cepat "Catat setoran" — form INCOME dengan wadah scope
          target terisi (wadah pertama scope; scope semua wadah → user
          pilih sendiri). Simpan memicu reload target (dana terkumpul
          berubah). */}
      <TransactionFormModal
        open={depositTarget !== null}
        editingTransaction={null}
        categories={categories}
        cycle={cycle}
        defaultType="INCOME"
        defaultUnitId={depositTarget?.categoryIds[0]}
        onClose={() => setDepositTarget(null)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

/**
 * Tag batas waktu target (D6): tanggal + status urgensi — merah bila
 * terlewat, oranye bila ≤ 7 hari lagi (sinkron cron H-7).
 */
function DeadlineTag({ deadline }: { deadline: string }) {
  const { t } = useLocale();
  const date = dayjs(deadline);
  const daysLeft = date.startOf("day").diff(dayjs().startOf("day"), "day");
  const overdue = daysLeft < 0;
  const urgent = daysLeft >= 0 && daysLeft <= 7;
  return (
    <Tag
      color={overdue ? "red" : urgent ? "orange" : undefined}
      style={{ margin: 0 }}
    >
      {t("finance.targetDeadlineLabel")}: {date.format("DD MMM YYYY")}
      {overdue && ` · ${t("finance.targetOverdueTag")}`}
      {daysLeft === 0 && ` · ${t("finance.targetDueToday")}`}
      {urgent &&
        daysLeft > 0 &&
        ` · ${t("finance.targetDaysLeftTag", { n: daysLeft })}`}
    </Tag>
  );
}
