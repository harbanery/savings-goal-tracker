"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Sanitasi URL sebelum event terkirim (rekomendasi C1 — P2):
 * buang query string & hash agar nilai sensitif tidak pernah keluar dari
 * browser dan pageview tidak terfragmentasi — mis. `/login?redirect=/finance`
 * dan `/login?googleError=state` keduanya tercatat sebagai `/login`.
 */
export default function CustomAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => ({
        ...event,
        url: event.url.split(/[?#]/)[0] || event.url,
      })}
    />
  );
}
