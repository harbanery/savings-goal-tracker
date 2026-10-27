"use client";

import { MenuOutlined } from "@ant-design/icons";
import { FloatButton, Grid } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { menuConfig } from "@/features/web/utils/menu";

/**
 * Navigasi aplikasi sebagai menu melayang (antd FloatButton.Group) di
 * kiri bawah — menggantikan Sider/Drawer lama agar lebih ringkas
 * (konten memakai lebar penuh) dan interaktif: sekali klik, tombol
 * mengembang menampilkan seluruh menu, klik di luar menutup menu.
 *
 * Perilaku sesuai DROID.md:
 * - Ikon item AKTIF memakai varian *Filled*, sisanya *Outlined*
 *   (`menuConfig` menyimpan kedua variannya).
 * - Mobile: menu TETAP VERTIKAL (mengembang ke atas) dengan shadow
 *   gelap dari KIRI sehingga perhatian terfokus ke sider.
 * - Tablet & laptop: menu HORIZONTAL (mengembang ke kanan) dengan
 *   shadow gelap dari BAWAH sehingga perhatian terfokus ke sider.
 *
 * Catatan penempatan (aturan antd + Tailwind): grup bawaan antd
 * ber-posisi `fixed` kanan bawah, jadi pembungkus Tailwind yang
 * mengatur posisi kiri bawah dan grup dibuat `static!` — className
 * Tailwind pada komponen antd wajib memakai `!` (important). Shadow
 * memakai dua lapis gradien (mobile vs md+) agar arahnya pasti benar
 * tanpa bergantung pada nama utility gradien.
 */
export default function SiderLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [open, setOpen] = useState(false);

  /** Menu aktif: kecocokan path terpanjang menang (mis. /finance/<sub>). */
  const selectedKey = useMemo(() => {
    const match = [...menuConfig]
      .sort((a, b) => b.link.length - a.link.length)
      .find((m) => pathname === m.link || pathname.startsWith(m.link + "/"));
    return match?.key ?? "dashboard";
  }, [pathname]);

  return (
    <>
      {/* Shadow gelap dari KIRI (mobile) — memusatkan perhatian ke sider.
          z-[8] sengaja di bawah header (z-10) agar tidak menutupinya. */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 z-[8] h-80 w-20 transition-opacity duration-300 md:hidden"
        style={{
          background: "linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0))",
          opacity: open ? 1 : 0.7,
        }}
      />
      {/* Shadow gelap dari BAWAH (tablet & laptop) — arah gradien ke atas. */}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 z-[8] hidden h-24 w-full transition-opacity duration-300 md:block"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0))",
          opacity: open ? 1 : 0.7,
        }}
      />

      <div className="fixed bottom-12 left-6 z-50">
        <FloatButton.Group
          className="static!"
          // Mobile: mengembang ke atas (vertikal). Desktop: ke kanan
          // (horizontal) — antd memakai Flex horizontal untuk placement
          // kiri/kanan.
          placement={isMobile ? "top" : "right"}
          trigger="click"
          open={open}
          onOpenChange={setOpen}
          type="primary"
          icon={<MenuOutlined />}
          aria-label={t("menu.open")}
        >
          {menuConfig.map((m) => {
            const active = m.key === selectedKey;
            return (
              <FloatButton
                key={m.key}
                // Filled saat terpilih, Outlined saat tidak.
                icon={active ? m.iconFilled : m.icon}
                type={active ? "primary" : "default"}
                tooltip={t(m.labelKey)}
                aria-label={t(m.labelKey)}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  router.replace(m.link);
                  setOpen(false);
                }}
              />
            );
          })}
        </FloatButton.Group>
      </div>
    </>
  );
}
