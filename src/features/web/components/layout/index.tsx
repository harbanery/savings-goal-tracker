"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";
import Footer from "@/features/web/components/layout/footer";
import HeaderLayout from "@/features/web/components/layout/header";
import SiderLayout from "@/features/web/components/layout/sider";
import ContentLayout from "@/features/web/components/layout/content";

/**
 * Shell aplikasi: Sider navigasi (rail tombol bulat, kiri) + Header sticky
 * + Content + Footer — lihat features/web/components/layout/sider.tsx.
 *
 * Rail navigasi ber-posisi `fixed`, jadi kolom konten diberi padding kiri
 * senilai lebar rail (w-14 mobile, w-16 dari breakpoint md) agar tidak
 * tertimpa. Saat rail di-hover ia mengembang MENUMPUK konten (z-40), bukan
 * menggeser layout — permintaan DROID.md.
 */
export default function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout
        className="pl-14 md:pl-16"
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
