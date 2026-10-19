import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={Compass}
        title="页面不存在"
        description="这个地址可能已经失效，回到日历继续今天的节律。"
        action={
          <Button asChild>
            <Link to="/">返回首页</Link>
          </Button>
        }
        className="w-full max-w-lg"
      />
    </div>
  );
}
