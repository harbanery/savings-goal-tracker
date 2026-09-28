"use client";

import { Button, Result } from "antd";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";

export default function NotFound() {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Result
        status="404"
        title="404"
        subTitle={t("notfound.desc")}
        extra={
          <Button type="primary" onClick={() => router.push("/")}>
            {t("notfound.back")}
          </Button>
        }
      />
    </div>
  );
}
