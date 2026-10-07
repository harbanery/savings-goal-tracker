import "@/assets/global/index.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/ui/theme/ThemeProvider";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import InstallPrompt from "@/features/web/components/ui/InstallPrompt";
import NotificationTest from "@/features/web/components/ui/dev/NotificationTest";
import { VercelCompatibleComponents } from "@/components/ui/vercel";
import { geistMono, geistSans } from "@/utils/fonts/next-google";
import {
  BASE_URL,
  META_APP,
  META_DESCRIPTION,
  META_TITLE,
  THEME_COOKIE,
} from "@/utils/config/variables";
import { neueHaasDisplay } from "@/utils/fonts/next-local";

export const metadata: Metadata = {
  // Title template: halaman cukup set string title ("Budget") dan otomatis
  // menjadi "Budget | Savings Goal Tracker"; tanpa title pakai default.
  title: {
    default: META_TITLE,
    template: `%s | ${META_APP}`,
  },
  applicationName: META_APP,
  ...(META_DESCRIPTION && { description: META_DESCRIPTION }),
  metadataBase: new URL(BASE_URL),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: META_APP,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    title: META_TITLE,
    ...(META_DESCRIPTION && { description: META_DESCRIPTION }),
    type: "website",
    siteName: META_APP,
    countryName: "Indonesia",
    locale: "id-ID",
    url: `/`,
    images: [
      {
        url: `images/opengraph-image.png`,
        alt: META_TITLE,
        type: "image/png",
        width: 1200,
        height: 630,
      },
    ],
  },
  creator: "Raihan Yusuf",
  authors: [
    { name: "Raihan Yusuf", url: "https://www.linkedin.com/in/raihan-yusuf" },
  ],
  icons: [
    {
      rel: "icon",
      type: "image/x-icon",
      url: `/favicon.ico`,
      sizes: "any",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      url: `/ios/180.png`,
      sizes: "180x180",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      url: `/ios/120.png`,
      sizes: "120x120",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      url: `/ios/152.png`,
      sizes: "152x152",
    },
    {
      rel: "apple-touch-icon",
      type: "image/png",
      url: `/ios/1024.png`,
      sizes: "1024x1024",
    },
    {
      rel: "shortcut icon",
      type: "image/x-icon",
      url: `/favicon.ico`,
    },
  ],
};

/**
 * Viewport config. `themeColor` wajib didefinisikan di sini (bukan di metadata)
 * agar warna chrome browser mengikuti tema terang/gelap aplikasi.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Tema dari cookie agar SSR antd menghasilkan style tema yang benar
  // (dark mode tidak flash putih). localStorage tidak bisa dibaca server.
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(THEME_COOKIE)?.value;
  const initialMode = cookieTheme === "dark" ? "dark" : "light";

  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${neueHaasDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Set class `dark` sebelum hidrasi agar tidak ada flash tema terang
            (FOUC) bagi pengguna dark mode. Harus sinkron dengan STORAGE_KEY
            dan logika preferensi sistem di ThemeProvider. Cookie `sgt_theme`
            ikut ditulis agar SSR berikutnya memakai tema yang sama. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("savings-goal-tracker:theme");var d=s==="dark"||((s!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark");r.style.colorScheme="dark";}else{r.style.colorScheme="light";}document.cookie="sgt_theme="+(d?"dark":"light")+"; path=/; max-age=31536000; samesite=lax";}catch(e){}})();`,
          }}
        />
        <AntdRegistry>
          <LocaleProvider>
            <ThemeProvider initialMode={initialMode}>
              {children}
              <InstallPrompt />
              <NotificationTest />
            </ThemeProvider>
          </LocaleProvider>
        </AntdRegistry>
        <VercelCompatibleComponents.Analytics />
      </body>
    </html>
  );
}
