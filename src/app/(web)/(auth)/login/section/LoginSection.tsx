"use client";

import { App, Typography } from "antd";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import GoogleButton from "@/components/ui/button/google";
import { useLocale } from "@/components/i18n/LocaleProvider";

const ERROR_KEYS: Record<string, string> = {
  state: "auth.errorState",
  exchange: "auth.errorExchange",
  unverified: "auth.errorUnverified",
  google: "auth.errorGoogle",
  default: "auth.errorDefault",
};

function LoginSectionInner({ configured }: { configured: boolean }) {
  const { t } = useLocale();
  const { message } = App.useApp();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("googleError");
    if (error) message.error(t(ERROR_KEYS[error] ?? ERROR_KEYS.default));
  }, [searchParams, message, t]);

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="text-5xl" role="img" aria-label="Piggy bank">
            🐷
          </span>
          <Typography.Title level={3} style={{ marginBottom: 0 }}>
            {t("app.title")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("auth.loginSubtitle")}
          </Typography.Paragraph>
        </div>

        <div className="rounded-2xl border border-[rgba(128,128,128,0.2)] bg-[var(--background)] p-6 shadow-sm">
          <GoogleButton
            enabled={configured}
            redirectTo={searchParams.get("redirect") ?? "/"}
          />
          <Typography.Paragraph
            type="secondary"
            style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}
          >
            {t("auth.loginHint")}
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  );
}

export default function LoginSection({
  configured,
}: {
  configured: boolean;
}) {
  return (
    <Suspense fallback={null}>
      <LoginSectionInner configured={configured} />
    </Suspense>
  );
}
