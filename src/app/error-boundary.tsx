import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("RhythNote render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-lg space-y-4 rounded-2xl border bg-card p-8 shadow-paper">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-semibold">页面出现异常</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                数据没有丢失。你可以刷新页面重试；如果问题持续出现，请把下面的错误信息反馈给开发者。
              </p>
            </div>
            <pre className="max-h-40 overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
