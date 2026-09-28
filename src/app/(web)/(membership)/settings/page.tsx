import type { Metadata } from "next";
import SettingsSection from "./section/SettingsSection";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import {
  getUserCategories,
  getUserSettings,
} from "@/services/transaction";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const [categories, settings] = await Promise.all([
    getUserCategories(user.id),
    getUserSettings(user.id),
  ]);

  return <SettingsSection initialSettings={settings} initialCategories={categories} />;
}
