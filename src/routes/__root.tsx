import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { initSentry } from "../lib/sentry";

if (typeof window !== "undefined") {
  initSentry();
}

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, RefreshCw, Shield, Eye, ShieldAlert, LogOut, Clock, Activity, UserCheck, Layers } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isSimulating, getSimulationMode, getSimulationTargetUserId, exitSimulation, getCurrentUser } from "../lib/auth";
import { getUserCurrentActivityFn } from "../lib/api/simulation.functions";
import { Splash } from "../components/site/Splash";
import { OfflineIndicator } from "../components/site/OfflineIndicator";
import { Toaster } from "../components/ui/sonner";
import { ErrorBoundary } from "../components/site/ErrorBoundary";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md text-center rounded-3xl border border-border bg-card p-8 shadow-elevated">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
          <AlertTriangle className="size-8" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          عذراً، حدث خطأ أثناء تحميل الصفحة
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 font-display">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105 cursor-pointer"
          >
            <RotateCcw className="size-4" />
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition-all hover:bg-secondary hover:scale-105"
          >
            <Home className="size-4 text-primary" />
            الصفحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

import { usePWA } from "../hooks/usePWA";
import { ThemeProvider } from "../components/theme-provider";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Altiora" },
      {
        name: "description",
        content:
          "Altiora Learning Studio is a modern educational platform UI/UX designed for a premium learning experience.",
      },
      { name: "author", content: "Lovable" },
      { name: "theme-color", content: "#0B3A8F" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "Altiora" },
      {
        property: "og:description",
        content:
          "Altiora Learning Studio is a modern educational platform UI/UX designed for a premium learning experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Altiora" },
      {
        name: "twitter:description",
        content:
          "Altiora Learning Studio is a modern educational platform UI/UX designed for a premium learning experience.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "icon",
        type: "image/x-icon",
        href: "/favicon.ico",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
        <script
          id="theme-blocking-init"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var preset = localStorage.getItem('theme-preset') || 'luxury';
                  var schedule = localStorage.getItem('theme-auto-schedule') === 'true';
                  var dark = false;
                  if (schedule) {
                    var hour = new Date().getHours();
                    dark = !(hour >= 7 && hour < 18);
                  } else if (theme === 'dark') {
                    dark = true;
                  } else if (theme === 'light') {
                    dark = false;
                  } else {
                    dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  if (dark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  document.documentElement.setAttribute('data-preset', preset);
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { hasUpdate, updateApp, setWaitingWorker } = usePWA();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully:", reg.scope);

          // Check if there is already a waiting service worker
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
          }

          // Listen for new service worker installation updates
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Splash />
        <OfflineIndicator />
        <Toaster richColors position="top-center" />
        <SimulationBanner />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>

        {/* PWA Update Banner */}
        {hasUpdate && (
          <div
            className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 p-4 shadow-elevated backdrop-blur-xl md:left-auto md:right-4 md:w-96"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <RefreshCw className="size-5 animate-spin" />
              </div>
              <div className="text-start">
                <h4 className="font-display text-sm font-bold text-foreground">يتوفر تحديث جديد</h4>
                <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                  اضغط لتحديث التطبيق والحصول على أحدث المميزات.
                </p>
              </div>
            </div>
            <button
              onClick={updateApp}
              className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105 cursor-pointer"
            >
              تحديث الآن
            </button>
          </div>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function SimulationBanner() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [lastCheck, setLastCheck] = useState<string>("");

  const refreshActivity = async (id: string) => {
    try {
      const res = await getUserCurrentActivityFn({ data: { targetUserId: id } });
      setActivity(res);
      setLastCheck(new Date().toLocaleTimeString("ar-EG"));
    } catch (err) {
      console.error("Failed to check target user activity:", err);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      const isSim = isSimulating();
      setActive(isSim);
      if (isSim) {
        const currentMode = getSimulationMode();
        const currentId = getSimulationTargetUserId();
        const user = getCurrentUser();
        setMode(currentMode);
        setTargetUserId(currentId);
        setCurrentUser(user);
        
        if (currentId && !targetUserId) {
          refreshActivity(currentId);
        }
      } else {
        setMode(null);
        setTargetUserId(null);
        setCurrentUser(null);
        setActivity(null);
      }
    };

    check();
    const interval = setInterval(check, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [targetUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!active || !targetUserId) return;

    // Poll activity status every 15 seconds if active
    const activityInterval = setInterval(() => {
      refreshActivity(targetUserId);
    }, 15000);

    return () => {
      clearInterval(activityInterval);
    };
  }, [active, targetUserId]);

  // Adjust body padding dynamically so the banner doesn't cover top layout elements
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (active) {
      document.body.style.paddingTop = "52px";
    } else {
      document.body.style.paddingTop = "0px";
    }
    return () => {
      document.body.style.paddingTop = "0px";
    };
  }, [active]);

  if (!active || !currentUser) return null;

  // Banner styles based on mode
  let bannerBg = "bg-amber-950/95 text-amber-100 border-amber-800/40";
  let modeLabel = "محاكاة القراءة فقط";
  let modeIcon = <Eye className="size-4 text-amber-400" />;
  let modeColorClass = "text-amber-400";
  let buttonBg = "bg-amber-800 hover:bg-amber-700 text-white";

  if (mode === "INTERACTIVE_TEST") {
    bannerBg = "bg-blue-950/95 text-blue-100 border-blue-800/40";
    modeLabel = "الاختبار التفاعلي (مؤقت)";
    modeIcon = <Layers className="size-4 text-blue-400" />;
    modeColorClass = "text-blue-400";
    buttonBg = "bg-blue-800 hover:bg-blue-700 text-white";
  } else if (mode === "LIVE_CONTROL") {
    bannerBg = "bg-red-950/95 text-red-100 border-red-800/40";
    modeLabel = "التحكم المباشر نشط";
    modeIcon = <ShieldAlert className="size-4 text-red-400 animate-pulse" />;
    modeColorClass = "text-red-400";
    buttonBg = "bg-red-800 hover:bg-red-700 text-white";
  }

  // Activity Status Labels
  let statusBadge = "bg-neutral-800 text-neutral-300";
  let statusText = activity?.status || "جاري التحقق...";
  if (activity?.status === "Watching Video" || activity?.status === "Watching") {
    statusBadge = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
    statusText = "يشاهد فيديو الآن";
  } else if (activity?.status === "Taking Exam" || activity?.status === "Exam") {
    statusBadge = "bg-red-500/20 text-red-300 border border-red-500/30";
    statusText = "يؤدي اختباراً حالياً";
  } else if (activity?.status === "In Live Class" || activity?.status === "Live Class") {
    statusBadge = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    statusText = "في حصة مباشرة الآن";
  } else if (activity?.status === "Uploading Files" || activity?.status === "Uploading") {
    statusBadge = "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    statusText = "يرفع ملفات الآن";
  } else if (activity?.isOnline) {
    statusBadge = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    statusText = "متصل بالإنترنت";
  } else if (activity?.isOnline === false) {
    statusBadge = "bg-neutral-800 text-neutral-400 border border-neutral-700";
    statusText = "غير متصل";
  }

  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-[9999] border-b backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-4 shadow-lg transition-all duration-300 ${bannerBg}`}
      dir="rtl"
    >
      {/* Target User Info & Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10">
          {modeIcon}
        </div>
        <div className="flex flex-col text-start">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold font-display ${modeColorClass}`}>
              {modeLabel}
            </span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/80">
              {currentUser.role === "STUDENT" ? "طالب" : "معلم"}
            </span>
          </div>
          <span className="text-sm font-semibold mt-0.5">
            {currentUser.name} ({currentUser.email})
          </span>
        </div>
      </div>

      {/* Realtime User Awareness */}
      {activity && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/60">حالة المستخدم:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
              {statusText}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60">الصفحة الحالية:</span>
            <span className="font-semibold text-white/95">{activity.currentPage || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60">آخر نشاط:</span>
            <span className="font-mono text-white/95">
              {activity.lastActivity ? new Date(activity.lastActivity).toLocaleTimeString("ar-EG") : "-"}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => targetUserId && refreshActivity(targetUserId)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-white cursor-pointer"
          title="تحديث حالة المستخدم"
        >
          <RefreshCw className="size-4" />
        </button>
        <a
          href="/super-admin"
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-all text-xs font-bold text-white border border-white/10 flex items-center gap-1.5"
        >
          <Shield className="size-3.5" />
          لوحة التحكم الإدارية
        </a>
        <button
          onClick={exitSimulation}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${buttonBg}`}
        >
          <LogOut className="size-3.5" />
          إنهاء المحاكاة
        </button>
      </div>
    </div>
  );
}
