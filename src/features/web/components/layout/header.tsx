"use client";

import { LogoutOutlined, MenuOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Breadcrumb,
  Button,
  Dropdown,
  Grid,
  Layout,
  Space,
  theme,
  Typography,
} from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { useLocale } from "@/components/i18n/LocaleProvider";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import NotificationBell from "@/features/web/components/ui/NotificationBell";
import RealtimeClock from "@/features/web/components/ui/RealtimeClock";
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
        {!isMobile && <RealtimeClock />}
        <ThemeToggle />
        <LanguageToggle />
        <NotificationBell />
        <Dropdown menu={userMenu} placement="bottomRight">
          <Button
            type="text"
            shape="round"
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
