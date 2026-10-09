import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
 * Content Security Policy global (P1).
 *
 * Pendekatan TANPA nonce sesuai guide CSP Next.js: nonce memaksa semua
 * halaman menjadi dynamic rendering (static optimization & CDN cache
 * mati), tidak sepadan untuk PWA ini. Konsekuensinya script/style tetap
 * perlu 'unsafe-inline':
 * - script 'unsafe-inline': runtime inline Next.js + script anti-FOUC tema.
 * - style  'unsafe-inline': style-in-JS antd (AntdRegistry) menyuntik <style>.
 * - 'unsafe-eval' hanya di development (React memakai eval untuk stack trace).
 * - va.vercel-scripts.com: beacon Vercel Analytics (script + endpoint event).
 * - blob:/data: pada img & worker: chart.js (gambar eksport) dan SW helper.
 */
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self' https://va.vercel-scripts.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .join("; ")
  .trim();

/** Header keamanan global (berlaku untuk semua route). */
const securityHeaders = [
  // Mencegah clickjacking — fallback legacy untuk browser tanpa dukungan
  // CSP frame-ancestors (yang sudah menset 'none' di atas).
  { key: "X-Frame-Options", value: "DENY" },
  // Paksa HTTPS untuk semua request berikutnya (termasuk subdomain).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Nonaktifkan API perangkat yang tidak dipakai aplikasi. Notifications
  // sengaja TIDAK dibatasi karena app memakai Web Push (NotificationBell).
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: cspHeader },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        // Header global dasar untuk keamanan.
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Service worker HARUS disajikan sebagai JavaScript dan tidak di-cache
        // agar pembaruan SW langsung diambil browser di production.
        // Blok ini sengaja setelah blok global: key yang sama menimpa,
        // sehingga SW mendapat CSP khusus yang lebih ketat.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        // File statis PWA boleh di-cache lama (immutable, nama berubah saat update).
        source: "/manifest.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

export default nextConfig;
