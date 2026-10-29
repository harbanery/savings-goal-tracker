"use client";

import { Layout } from "antd";
import type { ReactNode } from "react";
import Footer from "@/features/web/components/layout/footer";
import HeaderLayout from "@/features/web/components/layout/header";
import SiderLayout from "@/features/web/components/layout/sider";
import ContentLayout from "@/features/web/components/layout/content";

/**
 * Shell aplikasi (DROID.md): Header + Footer MEMBENTANG PENUH, sementara
 * rail navigasi hanya berada di sisi kiri CONTENT.
 *
 * Susunan: kolom vertikal [Header] → baris [Content] → [Footer], dengan
 * rail navigasi di-render di dalam baris itu.
 *
 * Rail ber-posisi `fixed` (`inset-y-0 left-0`, lihat sider.tsx) sehingga
 * TINGGINYA PENUH setinggi viewport dan MENEMBUS header & footer — ia
 * berada DI BELAKANG keduanya. Header & footer diberi `z-index` lebih
 * tinggi dari rail, jadi keduanya "menimpa" rail: rail tampak hanya di
 * sisi kiri content. Karena rail keluar dari alur normal, baris ini diberi
 * padding kiri senilai lebar rail (w-14 mobile / w-16 dari breakpoint md)
 * agar content tidak tertutup. Saat dir-rail di-hover, panelnya melebar
 * MENUMPUK content sehingga lebar rail di luar hover tetap dan layout
 * tidak bergeser.
 */
export default function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <Layout
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header & Footer: satu baris penuh (tidak dibatasi lebar rail). */}
      <HeaderLayout />

      <Layout
        className="pl-14 md:pl-16"
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          position: "relative",
          alignItems: "stretch",
        }}
      >
        <SiderLayout />
        <ContentLayout>{children}</ContentLayout>
      </Layout>

      <Footer />
    </Layout>
  );
}
