import "@/assets/global/index.css";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Footer from "@/components/footer";
import { VercelCompatibleComponents } from "@/components/vercel";
import { geistMono, geistSans } from "@/utils/fonts/next-google";
import {
  BASE_URL,
  META_APP,
  META_DESCRIPTION,
  META_TITLE,
} from "@/config/variables";
import { neueHaasDisplay } from "@/utils/fonts/next-local";

export const metadata: Metadata = {
  title: META_TITLE,
  applicationName: META_APP,
  ...(META_DESCRIPTION && { description: META_DESCRIPTION }),
  metadataBase: new URL(BASE_URL),
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    title: META_TITLE,
    ...(META_DESCRIPTION && { description: META_DESCRIPTION }),
    type: "profile",
    siteName: META_APP,
    countryName: "Indonesia",
    locale: "en-US",
    alternateLocale: "id-ID",
    url: `/`,
    images: [
      {
        url: `images/opengraph-image.png`,
        alt: META_APP,
        type: "image/png",
      },
    ],
  },
  // twitter: {
  //   card: "summary_large_image",
  //   site: "@CommuterLine",
  //   creator: "@CommuterLine",
  //   creatorId: "341987176",
  //   title: META_TITLE,
  //   ...(META_DESCRIPTION && { description: META_DESCRIPTION }),
  //   images: [
  //     {
  //       url: `images/twitter-image.png`,
  //       alt: META_APP,
  //       type: "image/png",
  //     },
  //   ],
  // },
  creator: "Raihan Yusuf",
  authors: [{ name: "Raihan Yusuf" }],
  icons: [
    {
      rel: "icon",
      type: "image/x-icon",
      url: `/favicon.ico`,
      sizes: "any",
    },
    {
      rel: "apple-touch-icon",
      type: "image/x-icon",
      url: `/favicon.ico`,
    },
    {
      rel: "shortcut icon",
      type: "image/x-icon",
      url: `/favicon.ico`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${neueHaasDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <ThemeProvider>
            {children}
            <Footer />
          </ThemeProvider>
        </AntdRegistry>
        <VercelCompatibleComponents.Analytics />
      </body>
    </html>
  );
}
