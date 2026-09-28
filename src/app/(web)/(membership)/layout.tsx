import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserDefaults } from "@/services/user";
import BaseLayout from "@/features/web/components/layout";

export const dynamic = "force-dynamic";

/**
 * Layout area privat (wajib login): semua halaman di dalam grup ini
 * dilindungi — proxy.ts menangani redirect cepat, layout ini memvalidasi
 * sesi penuh di server dan menyiapkan data default user.
 */
export default async function MembershipLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  await ensureUserDefaults(user.id);

  return <BaseLayout>{children}</BaseLayout>;
}
