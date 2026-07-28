"use client";

import { Button, Result } from "antd";

export default function RootError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Result
        status="error"
        title="Something went wrong"
        subTitle={error.message || "An unexpected error occurred."}
        extra={
          <Button type="primary" onClick={reset}>
            Try Again
          </Button>
        }
      />
    </div>
  );
}
