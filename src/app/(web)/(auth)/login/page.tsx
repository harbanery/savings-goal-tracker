import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { GOOGLE_IS_CONFIGURED } from "@/utils/config/variables";
import LoginSection from "./section/LoginSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return <LoginSection configured={GOOGLE_IS_CONFIGURED} />;
}
