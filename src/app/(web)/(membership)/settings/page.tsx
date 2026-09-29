import type { Metadata } from "next";
import SettingsSection from "./section/SettingsSection";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import { getUserSettings } from "@/services/transaction";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  await ensureUserDefaults(user.id);

  const settings = await getUserSettings(user.id);

  return <SettingsSection initialSettings={settings} />;
}
