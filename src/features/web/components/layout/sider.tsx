"use client";

import { Button, theme } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type CSSProperties } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { menuConfig } from "@/features/web/utils/menu";

/**
 * Navigasi utama aplikasi (DROID.md) — rail di sisi kiri CONTENT.
 *
 * - Bukan antd FloatButton dan bukan `Layout.Sider`/`Menu` antd: isinya
 *   kumpulan tombol bulat antd (`Button type="text"`). Pada tampilan biasa
 *   (tanpa hover) rail TANPA background/border — murni IKON tombol antd.
 * - Rail ber-posisi `fixed inset-y-0 left-0`: TINGGINYA PENUH setinggi
 *   viewport sehingga MENEMBUS (berada DI BELAKANG) header & footer, dan
 *   isinya `justify-center` sehingga kumpulan tombol berada di TENGAH
 *   secara vertikal.
 * - Header & footer (z-30) berada di atas rail (z-20) sehingga keduanya
 *   MENIMPA rail: rail tampak hanya di sisi kiri CONTENT.
 * - Saat rail di-HOVER: panel melebar, label teks + background panel +
 *   shadow muncul, menumpuk content — lebar rail di luar hover tetap
 *   sehingga layout tidak bergeser.
 * - Karena rail `fixed` keluar dari alur normal, kolom content diberi
 *   padding kiri senilai lebar rail (lihat layout/index.tsx).
 *
 * Ikon mengikuti state: item AKTIF memakai varian *Filled* + aksen primary,
 * item lain *Outlined* (`menuConfig` menyimpan kedua variannya).
 */
export default function SiderLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  // Warna permukaan mengikuti tema antd (light/dark) via design token.
  const { token } = theme.useToken();

  /** Menu aktif: kecocokan path terpanjang menang (mis. /finance/<sub>). */
  const selectedKey = useMemo(() => {
    const match = [...menuConfig]
      .sort((a, b) => b.link.length - a.link.length)
      .find((m) => pathname === m.link || pathname.startsWith(m.link + "/"));
    return match?.key ?? "dashboard";
  }, [pathname]);

  return (
    <nav
      aria-label={t("menu.navigation")}
      // `fixed inset-y-0 left-0` → tinggi PENUH viewport, menembus (di
      // belakang) header & footer. `justify-center` menempatkan kumpulan
      // tombol di TENGAH secara vertikal. `z-20` menempatkan panel di atas
      // content, sedangkan header & footer (z-30) di atas rail sehingga
      // keduanya "menimpa" rail (lihat layout/index.tsx).
      // Di luar hover: tanpa background/border → hanya ikon tombol antd.
      // Saat hover: melebar, background panel + shadow muncul (`hover:w-52`
      // / `md:hover:w-56`), label teks ditampilkan lewat `group/rail`.
      className="group/rail fixed inset-y-0 left-0 z-20 flex w-14 flex-col justify-center gap-1 overflow-hidden px-2 transition-[width,background-color,box-shadow] duration-200 ease-out hover:w-52 hover:bg-[var(--rail-bg)] hover:shadow-xl md:w-16 md:hover:w-56"
      style={{ "--rail-bg": token.colorBgContainer } as CSSProperties}
    >
      {menuConfig.map((m) => {
        const active = m.key === selectedKey;
        return (
          <Button
            key={m.key}
            type="text"
            onClick={() => router.replace(m.link)}
            aria-label={t(m.labelKey)}
            aria-current={active ? "page" : undefined}
            title={t(m.labelKey)}
            className="flex! h-10! w-full! shrink-0! items-center! justify-start! gap-3! rounded-xl! px-3!"
            style={{
              color: active ? token.colorPrimary : token.colorTextSecondary,
              background: active ? token.colorPrimaryBg : undefined,
            }}
          >
            {/* Ikon: filled saat aktif, outlined saat tidak. */}
            <span className="flex size-4 shrink-0 items-center justify-center text-base leading-none">
              {active ? m.iconFilled : m.icon}
            </span>
            {/* Label: hanya tampil saat rail mengembang (rail di-hover),
                tetapi ruangnya selalu ada agar ikon tidak bergeser. */}
            <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
              {t(m.labelKey)}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}
