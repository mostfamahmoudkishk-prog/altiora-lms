import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center shadow-card"
          dir="rtl"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground">
            حدث خطأ أثناء تحميل هذا القسم
          </h3>
          <p className="mt-2 text-xs text-muted-foreground max-w-sm leading-relaxed">
            حدثت مشكلة أثناء عرض هذا الجزء من الصفحة. يمكنك محاولة إعادة التحميل أو الانتقال
            للرئيسية.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              إعادة المحاولة
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-secondary hover:scale-105"
            >
              <Home className="size-3.5 text-primary" />
              الصفحة الرئيسية
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
