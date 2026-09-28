"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SessionUser } from "@/features/web/types";

/**
 * Store sesi client (pola tourism-village): fetch /api/web/auth/session
 * dengan cache TTL 60 detik + dedup in-flight, dibagikan lintas komponen.
 *
 * PENTING: getSnapshot() harus mengembalikan objek dengan identitas STABIL
 * (di-cache modul-level, dibuat ulang hanya saat store berubah via emit).
 * Membuat objek baru setiap panggilan membuat useSyncExternalStore mendeteksi
 * "perubahan" di setiap render → re-render tanpa henti →
 * "Maximum update depth exceeded".
 */

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
}

let cachedUser: SessionUser | null = null;
let cachedAt = 0;
let inflight: Promise<SessionUser | null> | null = null;
const listeners = new Set<() => void>();
const CACHE_TTL_MS = 60_000;

/** Snapshot server (stabil by construction — satu objek konstan). */
const SERVER_SNAPSHOT: SessionState = Object.freeze({
  user: null,
  loading: false,
}) as SessionState;

/** Snapshot client ter-cache; hanya dibuat ulang di emit(). */
let clientSnapshot: SessionState = { user: null, loading: false };

function rebuildSnapshot(): void {
  clientSnapshot = {
    user: cachedUser,
    loading: cachedAt === 0 && inflight !== null,
  };
}

function emit() {
  rebuildSnapshot();
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SessionState {
  return clientSnapshot;
}

function getServerSnapshot(): SessionState {
  return SERVER_SNAPSHOT;
}

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/web/auth/session", { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("session fetch failed");
  return (await res.json()) as SessionUser;
}

/** Muat ulang sesi (bypass cache). */
export async function refreshWebSession(): Promise<SessionUser | null> {
  if (inflight === null) {
    inflight = fetchSession()
      .then((user) => {
        cachedUser = user;
        cachedAt = Date.now();
        return user;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
        emit();
      });
    // Pindai ke mode loading segera (sebelum fetch selesai).
    emit();
  }
  return inflight;
}

/** Hapus cache sesi (setelah logout). */
export function clearWebSession(): void {
  cachedUser = null;
  cachedAt = 0;
  emit();
}

export function useWebSession(): SessionState & {
  refresh: () => Promise<SessionUser | null>;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Trigger fetch awal / refresh cache basi di dalam effect (bukan saat render)
  // agar tidak memanggil fungsi impure (Date.now) selama render.
  useEffect(() => {
    if (typeof window === "undefined" || inflight !== null) return;
    if (cachedAt === 0 || Date.now() - cachedAt > CACHE_TTL_MS) {
      void refreshWebSession();
    }
  }, []);

  return { ...state, refresh: refreshWebSession };
}
