import { Spin } from "antd";

/** Loading UI root (ditampilkan saat segment route streaming). */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Spin size="large" />
    </div>
  );
}
