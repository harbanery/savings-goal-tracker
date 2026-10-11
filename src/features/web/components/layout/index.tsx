"use client";

import { Layout } from "antd";
import { useState, type ReactNode } from "react";
import Footer from "@/features/web/components/layout/footer";
import HeaderLayout from "@/features/web/components/layout/header";
import SiderLayout from "@/features/web/components/layout/sider";
import ContentLayout from "@/features/web/components/layout/content";

/**
 * Shell aplikasi (ala admin-portfolio): Sider collapsible kiri +
 * Header sticky + Content + Footer. Mobile: Sider menjadi Drawer.
 */
export default function BaseLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Layout hasSider style={{ minHeight: "100vh" }}>
      <SiderLayout
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <Layout
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
          minHeight: "inherit",
          justifyContent: "space-between",
          position: "relative",
          minWidth: 0,
        }}
      >
        <HeaderLayout onMobileMenuClick={() => setMobileOpen(true)} />
        <ContentLayout>{children}</ContentLayout>
        <Footer />
      </Layout>
    </Layout>
  );
}
