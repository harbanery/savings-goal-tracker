"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";
import Footer from "@/features/web/components/layout/footer";
import HeaderLayout from "@/features/web/components/layout/header";
import SiderLayout from "@/features/web/components/layout/sider";
import ContentLayout from "@/features/web/components/layout/content";

/**
 * Shell aplikasi: Header sticky + Content + Footer, dengan navigasi
 * sebagai menu melayang (antd FloatButton.Group, kiri bawah) — lihat
 * features/web/components/layout/sider.tsx. Navigasi melayang tidak
 * mengambil lebar layout, sehingga konten memakai lebar penuh di semua
 * ukuran layar (tanpa Sider/Drawer terpisah).
 */
export default function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
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
        <HeaderLayout />
        <ContentLayout>{children}</ContentLayout>
        <Footer />
      </Layout>
      <SiderLayout />
    </Layout>
  );
}
