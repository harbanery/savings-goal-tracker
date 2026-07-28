export const META_TITLE: string =
  process.env.TITLE_WEB ?? "Savings Goal Tracker";
export const META_APP: string = process.env.APP_WEB ?? "Savings Goal Tracker";
export const META_DESCRIPTION: string | undefined =
  process.env.DESCRIPTION_WEB ??
  "Pantau target tabungan dan progres menabung Anda.";

export const BASE_URL: string =
  process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

export const DATABASE_URL: string = process.env.DATABASE_URL ?? "";

export const NODE_ENV: string = process.env.NODE_ENV || "development";

/** Saldo awal setiap siklus bulanan (top-up tanggal 25). */
export const SAVINGS_INITIAL: number = Number(
  process.env.SAVINGS_INITIAL ?? "6000000",
);

/** Tanggal mulai siklus (tanggal 25 tiap bulan). */
export const CYCLE_START_DAY: number = 25;
