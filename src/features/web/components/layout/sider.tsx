"use client";

import { theme } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { menuConfig } from "@/features/web/utils/menu";

/**
 * Navigasi utama aplikasi (DROID.md): kembali menjadi SIDER di sebelah kiri
 * konten — bukan lagi antd FloatButton, dan bukan `Layout.Sider`/`Menu` antd.
 *
 * Bentuknya adalah kumpulan tombol bulat (rounded button) berisi ikon:
 * - Rail menyempit (ikon saja) saat tidak disentuh, dan MENGEMBANG saat
 *   di-hover sehingga teks label tiap menu muncul + shadow tampil
 *   (`hover:shadow-xl`) — persis permintaan DROID.md "jika dihover akan
 *   memunculkan teks dan shadow".
 * - Rail ber-posisi `fixed` di kiri sehingga tidak menggeser layout; konten
 *   diberi padding kiri senilai lebar rail (lihat layout/index.tsx) dan rail
 *   mengembang MENUMPUK konten saat hover (z-40, di atas header z-10).
 * - Perangkat sentuh tidak punya hover: rail tetap ikon saja (tetap bisa
 *   dipakai karena tiap tombol membawa `aria-label`).
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
      className="group/rail fixed inset-y-0 left-0 z-40 flex w-14 flex-col justify-center gap-1 overflow-hidden border-r px-2 transition-[width,box-shadow] duration-200 ease-out hover:w-52 hover:shadow-xl md:w-16 md:hover:w-56"
      style={{
        background: token.colorBgContainer,
        borderColor: token.colorBorderSecondary,
      }}
    >
      {menuConfig.map((m) => {
        const active = m.key === selectedKey;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => router.replace(m.link)}
            aria-label={t(m.labelKey)}
            aria-current={active ? "page" : undefined}
            title={t(m.labelKey)}
            className="flex h-10 w-full shrink-0 items-center gap-3 rounded-xl px-2 text-left outline-none transition-colors duration-150 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-white/10"
            style={{
              background: active ? token.colorPrimaryBg : undefined,
              color: active ? token.colorPrimary : token.colorTextSecondary,
            }}
          >
            <span className="flex size-6 shrink-0 items-center justify-center text-[17px] leading-none">
              {active ? m.iconFilled : m.icon}
            </span>
            {/* Label hanya tampil saat rail mengembang (hover pada rail).
                `overflow-hidden` pada rail memotong teks saat menyempit. */}
            <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
              {t(m.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
