import localFont from "next/font/local";

// ** NEUE HAAS DISPLAY FONT FAMILY **

export const neueHaasDisplay = localFont({
  src: [
    {
      path: "../../assets/fonts/NeueHaasDisplayRoman.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayLight.ttf",
      weight: "300",
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
    {
      path: "../../assets/fonts/NeueHaasDisplayBlack.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayRomanItalic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayLightItalic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayMediumItalic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayBoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../assets/fonts/NeueHaasDisplayBlackItalic.ttf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-neue-haas-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const neueHaasDisplayThin = localFont({
  src: "../../assets/fonts/NeueHaasDisplayThin.ttf",
  weight: "100",
  style: "normal",
  variable: "--font-neue-haas-thin",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const neueHaasDisplayXThin = localFont({
  src: "../../assets/fonts/NeueHaasDisplayXThin.ttf",
  weight: "200",
  style: "normal",
  variable: "--font-neue-haas-xthin",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

// ** TEMPTING FONT FAMILY **

export const tempting = localFont({
  src: [
    {
      path: "../../assets/fonts/Tempting.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-tempting",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
