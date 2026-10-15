"use client";

import { Card, Skeleton } from "antd";

/** Varian fallback streaming per-section (A3 rekomendasi_feature.md). */
export type SectionSkeletonVariant =
  | "cards"
  | "stats"
  | "charts"
  | "table"
  | "list";

/** Kartu skeleton tunggal (bentuk kartu statistik/ringkasan). */
function SkeletonCard() {
  return (
    <Card size="small" className="shadow-sm!">
      <Skeleton active title={false} paragraph={{ rows: 2 }} />
    </Card>
  );
}

/** Blok skeleton selebar kartu (bentuk grafik/tabel/daftar). */
function SkeletonBlock({ rows }: { rows: number }) {
  return (
    <Card size="small" className="shadow-sm!">
      <Skeleton active title={false} paragraph={{ rows }} />
    </Card>
  );
}

/**
 * Fallback `<Suspense>` per-section: shell halaman (navbar/sider) langsung
 * dikirim, konten section di-stream dengan skeleton yang bentuknya mirip
 * konten akhir (kartu / grafik / tabel / daftar) — lebih granular daripada
 * Spin full-screen di loading.tsx. Tanpa teks agar tidak perlu locale.
 */
export default function SectionSkeleton({
  variant = "table",
}: Readonly<{ variant?: SectionSkeletonVariant }>) {
  switch (variant) {
    case "cards":
      return (
        <div className="mx-auto grid w-full max-w-350 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
    case "stats":
      return (
        <div className="mx-auto flex w-full max-w-350 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          {/* Bentuk line chart pengeluaran harian (±300px). */}
          <Card size="small" className="shadow-sm!">
            <Skeleton active title={false} paragraph={{ rows: 8 }} />
          </Card>
        </div>
      );
    case "charts":
      return (
        <div className="mx-auto flex w-full max-w-350 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SkeletonBlock rows={5} />
            </div>
            <div className="lg:col-span-7">
              <SkeletonBlock rows={7} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonBlock rows={6} />
            <SkeletonBlock rows={6} />
          </div>
        </div>
      );
    case "list":
      return (
        <div className="mx-auto w-full max-w-350">
          <SkeletonBlock rows={6} />
        </div>
      );
    case "table":
    default:
      return (
        <div className="mx-auto w-full max-w-350">
          <SkeletonBlock rows={9} />
        </div>
      );
  }
}
