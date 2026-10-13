"use client";

import { GlobalOutlined } from "@ant-design/icons";
import { Button, Dropdown, type MenuProps } from "antd";
import { useLocale } from "./LocaleProvider";
import { LOCALES, LOCALE_LABELS } from "./translations";
import { trackEvent } from "@/components/ui/vercel/track";

export default function LanguageToggle() {
  const { setLocale, t } = useLocale();

  const items: MenuProps["items"] = LOCALES.map((l) => ({
    key: l,
    label: LOCALE_LABELS[l],
    onClick: () => {
      trackEvent("locale_changed", { locale: l });
      setLocale(l);
    },
  }));

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button
        shape="circle"
        icon={<GlobalOutlined />}
        type="default"
        aria-label={t("lang.toggleAria")}
      />
    </Dropdown>
  );
}
