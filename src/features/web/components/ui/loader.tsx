"use client";

import { Spin } from "antd";

/** Loader full-section (dipakai saat guard sesi / fetch pertama). */
export default function LoaderPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spin size="large" />
    </div>
  );
}
