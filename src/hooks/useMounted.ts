"use client";

import { useSyncExternalStore } from "react";

/*
 * Guard hydration global (blueprint: src/hooks/useMounted.ts).
 *
 * Deteksi client-side via useSyncExternalStore agar tidak ada hydration
 * mismatch: server snapshot selalu `false`, client snapshot selalu `true`.
 * Komponen yang membaca API browser (window, localStorage, matchMedia)
 * cukup meng-guard nilainya dengan `mounted` — tidak perlu lagi menduplikasi
 * pola subscribe kosong di tiap komponen.
 */

const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/** `true` hanya setelah hidrasi client selesai (SSR selalu `false`). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}
