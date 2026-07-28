import { Button, Result } from "antd";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Result
        status="404"
        title="404"
        subTitle="The page you are looking for does not exist."
        extra={
          <Button type="primary">
            <Link href="/">Back Home</Link>
          </Button>
        }
      />
    </div>
  );
}
