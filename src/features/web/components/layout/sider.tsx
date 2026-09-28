"use client";

import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Button, Drawer, Grid, Layout, Menu, theme } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { menuConfig } from "@/features/web/utils/menu";

const { Sider } = Layout;

interface SiderProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/** Sider kiri collapsible (desktop) / Drawer (mobile) — ala admin-portfolio. */
export default function SiderLayout({ mobileOpen, onMobileClose }: SiderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [collapsed, setCollapsed] = useState(true);
  // Warna sider mengikuti tema antd (light/dark) via design token.
  const { token } = theme.useToken();

  const items = useMemo(
    () =>
      menuConfig.map((m) => ({
        key: m.key,
        icon: m.icon,
        label: t(m.labelKey),
      })),
    [t],
  );

  const selectedKey = useMemo(() => {
    const match = [...menuConfig]
      .sort((a, b) => b.link.length - a.link.length)
      .find((m) => pathname === m.link || pathname.startsWith(m.link + "/"));
    return match?.key ?? "dashboard";
  }, [pathname]);

  const content: ReactNode = (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={items}
      style={{ borderInlineEnd: "none" }}
      onClick={({ key }) => {
        const item = menuConfig.find((m) => m.key === key);
        if (item) {
          router.replace(item.link);
          onMobileClose();
        }
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={onMobileClose}
        styles={{ body: { padding: 0 } }}
        width={220}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Sider
      className="app-sider"
      width={200}
      collapsedWidth={64}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        alignSelf: "flex-start",
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
      }}
      trigger={
        <Button
          type="text"
          shape="circle"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        />
      }
    >
      {content}
    </Sider>
  );
}
