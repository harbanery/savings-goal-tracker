import { Layout } from "antd";
import type { ReactNode } from "react";

const { Content } = Layout;

/** Wrapper konten halaman (padding 16px, flex column). */
export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <Content
      style={{
        padding: 16,
        background: "none",
        display: "flex",
        flexGrow: 1,
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      {children}
    </Content>
  );
}
