"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Col, Empty, Row, Space, Typography } from "antd";
import { useCallback, useMemo, useState } from "react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import {
  deleteGoalAction,
  getGoalsAction,
} from "@/server/actions";
import { computeSavingsStats } from "@/helpers/stats";
import type { SavingsGoal } from "@/models/types";
import ContributionModal from "./ContributionModal";
import GoalCard from "./GoalCard";
import GoalFormModal from "./GoalFormModal";
import RealtimeClock from "./RealtimeClock";
import SavingsTrendChart from "./SavingsTrendChart";
import StatsCards from "./StatsCards";

const { Title, Paragraph } = Typography;

interface Props {
  /** Initial goals untuk render pertama (dari Server Component). */
  initialGoals: SavingsGoal[];
}

/**
 * Dashboard utama (Client Component).
 * Mengelola state daftar goal + sinkron dengan server via actions.
 */
export default function SavingsDashboard({ initialGoals }: Props) {
  const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [contributionGoalId, setContributionGoalId] = useState<string | null>(
    null,
  );

  const stats = useMemo(() => computeSavingsStats(goals), [goals]);

  const editingGoal = useMemo(
    () =>
      editingGoalId
        ? (goals.find((g) => g.id === editingGoalId) ?? null)
        : null,
    [goals, editingGoalId],
  );

  const contributionGoal = useMemo(
    () =>
      contributionGoalId
        ? (goals.find((g) => g.id === contributionGoalId) ?? null)
        : null,
    [goals, contributionGoalId],
  );

  /** Refetch daftar goal dari server. */
  const refreshGoals = useCallback(async () => {
    try {
      const fresh = await getGoalsAction();
      setGoals(fresh);
    } catch (err) {
      console.error("[SavingsDashboard] gagal memuat goals:", err);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      // Optimistic: hapus dari state lokal dulu.
      setGoals((prev) => prev.filter((g) => g.id !== id));
      try {
        await deleteGoalAction(id);
      } catch (err) {
        console.error("[SavingsDashboard] gagal menghapus goal:", err);
        // Revert dengan data terbaru dari server.
        await refreshGoals();
      }
    },
    [refreshGoals],
  );

  const handleOpenCreate = useCallback(() => {
    setEditingGoalId(null);
    setFormOpen(true);
  }, []);

  const handleOpenEdit = useCallback((goal: SavingsGoal) => {
    setEditingGoalId(goal.id);
    setFormOpen(true);
  }, []);

  const handleOpenContribute = useCallback((goal: SavingsGoal) => {
    setContributionGoalId(goal.id);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingGoalId(null);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Title
              level={2}
              style={{ marginBottom: 4 }}
              className="text-xl! sm:text-2xl! md:text-3xl!"
            >
              Savings Goal Tracker
            </Title>
            <Paragraph
              type="secondary"
              style={{ marginBottom: 0 }}
              className="text-sm sm:text-base"
            >
              Pantau target tabungan Anda. Tambah target, catat setoran, dan
              lihat progres menuju tujuan keuangan Anda.
            </Paragraph>
          </div>
          <div className="flex flex-col items-end gap-3">
            <RealtimeClock />
            <Space wrap>
              <ThemeToggle />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
              >
                Tambah Target
              </Button>
            </Space>
          </div>
        </div>

        <StatsCards stats={stats} />

        {/* Daftar target */}
        {goals.length === 0 ? (
          <Card variant="borderless" className="shadow-sm">
            <Empty description="Belum ada target tabungan">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
              >
                Buat Target Pertama
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {goals.map((goal) => (
              <Col key={goal.id} xs={24} sm={12} lg={8} xl={6}>
                <GoalCard
                  goal={goal}
                  onContribute={handleOpenContribute}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        )}

        {/* Grafik tren tabungan */}
        <div className="mt-6">
          <SavingsTrendChart goals={goals} />
        </div>

        {/* Modals */}
        <GoalFormModal
          open={formOpen}
          editingGoal={editingGoal}
          onClose={closeForm}
          onSaved={refreshGoals}
        />
        <ContributionModal
          open={contributionGoalId !== null}
          goal={contributionGoal}
          onClose={() => setContributionGoalId(null)}
          onMutated={refreshGoals}
        />
      </div>
    </div>
  );
}
