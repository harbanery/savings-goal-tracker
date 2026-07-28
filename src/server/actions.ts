"use server";

import { revalidatePath } from "next/cache";
import {
  addContribution as addContributionService,
  createGoal as createGoalService,
  deleteContribution as deleteContributionService,
  deleteGoal as deleteGoalService,
  getAllGoals,
  updateGoal as updateGoalService,
} from "@/services/savingsService";
import { toSavingsGoals } from "@/helpers/goalTransformer";
import type { SavingsGoal } from "@/models/types";

/**
 * Server Actions untuk mutasi data Savings Goal Tracker.
 * Setiap aksi memanggil revalidatePath agar UI re-render dengan data terbaru.
 */

function isCuid(id: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(id);
}

function validateAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  if (amount > 1e12) {
    throw new Error("Amount terlalu besar (maks 1 triliun).");
  }
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, 100);
}

function sanitizeNote(note: string): string {
  return note.trim().slice(0, 500);
}

function sanitizeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6366f1";
}

function parseDeadline(deadline: string | null): Date | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Fetch semua goal (dipanggil dari Server Component). */
export async function getGoalsAction(): Promise<SavingsGoal[]> {
  const records = await getAllGoals();
  return toSavingsGoals(records);
}

export interface GoalMutationInput {
  name: string;
  targetAmount: number;
  deadline: string | null;
  color: string;
}

export async function createGoalAction(
  input: GoalMutationInput,
): Promise<void> {
  const name = sanitizeName(input.name);
  if (!name) throw new Error("Nama target wajib diisi.");
  validateAmount(input.targetAmount);
  await createGoalService({
    name,
    targetAmount: Math.round(input.targetAmount),
    deadline: parseDeadline(input.deadline),
    color: sanitizeColor(input.color),
  });
  revalidatePath("/");
}

export async function updateGoalAction(
  id: string,
  input: GoalMutationInput,
): Promise<void> {
  if (!isCuid(id)) throw new Error(`Invalid goal id: ${id}`);
  const name = sanitizeName(input.name);
  if (!name) throw new Error("Nama target wajib diisi.");
  validateAmount(input.targetAmount);
  await updateGoalService(id, {
    name,
    targetAmount: Math.round(input.targetAmount),
    deadline: parseDeadline(input.deadline),
    color: sanitizeColor(input.color),
  });
  revalidatePath("/");
}

export async function deleteGoalAction(id: string): Promise<void> {
  if (!isCuid(id)) throw new Error(`Invalid goal id: ${id}`);
  await deleteGoalService(id);
  revalidatePath("/");
}

export async function addContributionAction(
  goalId: string,
  amount: number,
  note: string,
): Promise<void> {
  if (!isCuid(goalId)) throw new Error(`Invalid goal id: ${goalId}`);
  validateAmount(amount);
  await addContributionService({
    goalId,
    amount: Math.round(amount),
    note: sanitizeNote(note),
  });
  revalidatePath("/");
}

export async function deleteContributionAction(id: string): Promise<void> {
  if (!isCuid(id)) throw new Error(`Invalid contribution id: ${id}`);
  await deleteContributionService(id);
  revalidatePath("/");
}
