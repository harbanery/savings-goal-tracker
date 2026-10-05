"use client";

import { LogoutOutlined, MenuOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Breadcrumb,
  Button,
  DatePicker,
  Dropdown,
  Grid,
  Layout,
  Space,
  theme,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { useLocale } from "@/components/i18n/LocaleProvider";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import NotificationBell from "@/features/web/components/ui/NotificationBell";
import RealtimeClock from "@/features/web/components/ui/RealtimeClock";
import { useCycle } from "@/features/web/hooks/cycle";
import { getCycleInfo } from "@/features/web/utils/cycle";
import { clearWebSession, useWebSession } from "@/features/web/hooks/session";
import { menuConfig } from "@/features/web/utils/menu";

const { Header } = Layout;
const { Text } = Typography;

/** Header sticky: breadcrumb kiri; tema/bahasa/jam/menu user di kanan. */
export default function HeaderLayout({
  onMobileMenuClick,
}: {
  onMobileMenuClick: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const { user } = useWebSession();
  const { cycle, setCycle, startDay } = useCycle();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  // Warna header mengikuti tema antd (light/dark) via design token.
  const { token } = theme.useToken();

  const breadcrumbItems = useMemo(() => {
    const match = [...menuConfig]
      .sort((a, b) => b.link.length - a.link.length)
      .find((m) => pathname === m.link || pathname.startsWith(m.link + "/"));
    const items = [{ title: t("app.title") }];
    if (match && match.link !== "/") {
      items.push({ title: t(match.labelKey) });
    }
    return items;
  }, [pathname, t]);

  async function handleLogout() {
    await fetch("/api/web/auth/logout", { method: "POST" });
    clearWebSession();
    router.replace("/login");
  }

  const userMenu = {
    items: [
      { key: "logout", icon: <LogoutOutlined />, label: t("auth.logout") },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === "logout") void handleLogout();
    },
  };

  return (
    <Header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingBlock: 12,
        paddingInline: isMobile ? 16 : 24,
        height: "auto",
        lineHeight: "normal",
        backgroundColor: token.colorBgContainer,
        // antd Layout.Header meng-hardcode warna teks terang-mode; samakan
        // dengan token agar teks header ikut dark mode.
        color: token.colorText,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isMobile && (
          <Button
            type="text"
            shape="circle"
            icon={<MenuOutlined />}
            onClick={onMobileMenuClick}
            aria-label={t("menu.open")}
          />
        )}
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <Space size="middle" wrap={false}>
        {/* Kapsul siklus + jam realtime digabung satu unit (border round):
            [ jam (desktop) | DatePicker pemilih siklus bulanan ].
            Format "MMMM YYYY" + locale dayjs → "Oktober 2026" / "October 2026".
            DatePicker borderless — border & radius disediakan kapsul. */}
        <div
          className={`flex items-center rounded-full border border-zinc-200 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600 ${
            isMobile ? "pr-0.5" : "pl-1 pr-3"
          }`}
        >
          <DatePicker
            className="font-mono!"
            picker="month"
            size="small"
            allowClear={false}
            variant="borderless"
            format="MMMM YYYY"
            value={dayjs().year(cycle.year).month(cycle.monthIndex)}
            onChange={(date) => {
              if (date) {
                setCycle(getCycleInfo(date.year(), date.month(), startDay));
              }
            }}
            aria-label={t("app.cyclePicker")}
          />
          {!isMobile && (
            <>
              <span
                aria-hidden
                className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700"
              />
              <RealtimeClock />
            </>
          )}
        </div>
        <ThemeToggle />
        <LanguageToggle />
        <NotificationBell />
        <Dropdown menu={userMenu} placement="bottomRight">
          <Button
            type="text"
            shape={isMobile ? "circle" : "default"}
            className="flex items-center gap-2"
            icon={
              user?.avatar ? (
                <Avatar size={26} src={user.avatar} />
              ) : (
                <Avatar size={26} icon={<UserOutlined />} />
              )
            }
          >
            {user && !isMobile && (
              <Text ellipsis className="max-w-30">
                {user.name}
              </Text>
            )}
          </Button>
        </Dropdown>
      </Space>
    </Header>
  );
}
