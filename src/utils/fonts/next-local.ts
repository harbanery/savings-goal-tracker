import localFont from "next/font/local";

/**
 * Neue Haas Display — font display lokal.
 *
 * Hanya varian yang benar-benar dipakai UI yang dimuat (audit A4:
 * tidak ada pemakaian italic/Black/Thin/XThin — payload font dipangkas).
 * Tambahkan kembali varian lain di sini bila nanti dipakai di UI.
 */
export const neueHaasDisplay = localFont({
  src: [
    {
      path: "../../assets/fonts/NeueHaasDisplayLight.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayRoman.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayMediu.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-neue-haas-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
