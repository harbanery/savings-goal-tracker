"use client";

import { Button, Result } from "antd";
import { useLocale } from "@/components/i18n/LocaleProvider";

export default function RootError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Result
        status="error"
        title={t("error.title")}
        subTitle={error.message || t("error.fallback")}
        extra={
          <Button type="primary" onClick={reset}>
            {t("error.retry")}
          </Button>
        }
      />
    </div>
  );
}
