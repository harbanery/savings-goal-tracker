"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Speed Insights (rekomendasi C1 — P2): memantau Core Web Vitals
 * pengguna nyata (LCP/INP/CLS). Sanitasi URL sama seperti Analytics —
 * buang query string & hash agar pengukuran tidak terfragmentasi dan
 * nilai sensitif (mis. `/login?redirect=...`) tidak pernah keluar browser.
 */
export default function CustomSpeedInsights() {
  return (
    <SpeedInsights
      beforeSend={(event) => ({
        ...event,
        url: event.url.split(/[?#]/)[0] || event.url,
      })}
    />
  );
}
