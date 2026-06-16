import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  User,
  BookOpen,
  Brain,
  Users,
  BarChart3,
  DollarSign,
  Star,
  Bell,
  HelpCircle,
  Menu,
  LogOut,
  Settings,
  MessageSquare,
  ChevronLeft,
  Ticket,
  AlertTriangle,
} from "lucide-react";
import { MogenixFooter } from "@/components/site/MogenixFooter";
import logo from "@/assets/altiora-logo-transparent.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { clearAuth, getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/teacher")({
  component: TeacherLayoutWrapper,
});

export type TeacherNavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

export const teacherNavItems: TeacherNavItem[] = [
  { to: "/teacher", label: "الرئيسية", icon: Home, exact: true },
  { to: "/teacher/courses", label: "دوراتي", icon: BookOpen },
  { to: "/teacher/courses?content=true", label: "المحتوى التعليمي", icon: BookOpen },
  { to: "/teacher/question-bank", label: "بنك الاختبارات", icon: Brain },
  { to: "/teacher/coupons", label: "أكواد الخصم والالتحاق", icon: Ticket },
  { to: "/teacher/students", label: "الطلاب", icon: Users },
  { to: "/teacher/statistics", label: "الإحصائيات", icon: BarChart3 },
  { to: "/teacher/revenue", label: "الأرباح", icon: DollarSign },
  { to: "/teacher/ratings", label: "التقييمات", icon: Star },
  { to: "/teacher/notifications", label: "الإعلانات والإشعارات", icon: Bell },
  { to: "/teacher/profile", label: "الملف الشخصي", icon: User },
  { to: "/teacher/settings", label: "الإعدادات", icon: Settings },
];

function TeacherSidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card custom-scrollbar">
      {/* Logo header */}
      <div className="flex items-center justify-center border-b border-border px-4 py-5">
        <Link to="/" onClick={onNavigate} className="flex items-center">
          <img src={logo} alt="Altiora" className="h-16 w-auto object-contain" />
          <span className="ms-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            المدرس
          </span>
        </Link>
      </div>

      {/* Items */}
      <nav className="flex-1 px-3 py-4">
        {teacherNavItems.map((item, i) => {
          const isActive = (() => {
            const [basePath, searchStr] = item.to.split("?");
            if (item.exact) {
              return location.pathname === basePath;
            }
            const pathMatches = location.pathname.startsWith(basePath);
            if (!pathMatches) return false;

            if (searchStr) {
              const param = searchStr.split("=")[0];
              const val = searchStr.split("=")[1];
              return String((location.search as any)[param]) === val;
            } else {
              if (location.pathname === "/teacher/courses" && (location.search as any).content) {
                return false;
              }
              return true;
            }
          })();
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 + i * 0.025, duration: 0.25 }}
            >
              <Link
                to={item.to}
                onClick={onNavigate}
                className={`relative mb-1 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-secondary text-primary"
                    : "text-foreground/80 hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-teacher"
                    className="absolute inset-y-2 end-0 w-1 rounded-full bg-primary"
                  />
                )}
                <span>{item.label}</span>
                <Icon className={`size-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={() => {
            clearAuth();
            toast.success("تم تسجيل الخروج");
            navigate({ to: "/login" });
          }}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all"
        >
          <span>تسجيل الخروج</span>
          <LogOut className="size-5" />
        </button>
        <div className="mt-2">
          <MogenixFooter />
        </div>
        <div className="text-center text-[10px] text-muted-foreground">
          © 2026 جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}

function TeacherLayoutWrapper() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً.");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "TEACHER" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      toast.error("غير مصرح لك بالوصول إلى لوحة المدرس.");
      navigate({ to: "/app" });
      return;
    }

    const fingerprint = localStorage.getItem("device_fingerprint_id") || "default";

    const checkSession = async () => {
      try {
        const { verifySessionFn } = await import("@/lib/api/auth.functions");
        const res = await verifySessionFn({
          data: {
            email: user.email,
            sessionId: user.sessionId || "",
            deviceFingerprint: fingerprint,
          },
        });

        if (!res.valid) {
          const { clearAuth } = await import("@/lib/auth");
          clearAuth();
          toast.error("تم إنهاء الجلسة أو تسجيل الخروج عن بعد. يرجى تسجيل الدخول مجدداً.");
          navigate({ to: "/login" });
          return false;
        }
        return true;
      } catch (err) {
        return true;
      }
    };

    checkSession().then((isValid) => {
      if (isValid) {
        setReady(true);
      }
    });

    const interval = setInterval(() => {
      checkSession();
    }, 120000);

    return () => clearInterval(interval);
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        جارٍ التحقق من الجلسة والأمان…
      </div>
    );
  }

  const user = getCurrentUser();

  const handleLogout = () => {
    clearAuth();
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-border lg:block">
        <TeacherSidebarBody pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 w-full max-w-[360px] sm:max-w-[400px] border-l border-border shadow-elevated lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <TeacherSidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="lg:mr-72">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
          <div className="flex flex-1 items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-secondary lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="size-6" />
            </button>
            <div className="text-sm text-muted-foreground">
              لوحة التحكم للمعلم / <span className="font-bold text-foreground">{user?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/teacher/notifications"
              aria-label="الإشعارات"
              className="relative flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Bell className="size-5" />
              <span className="absolute end-2 top-2 size-2 rounded-full bg-accent" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="الحساب"
                  className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[state=open]:bg-secondary data-[state=open]:text-foreground"
                >
                  <User className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-2xl border border-border bg-card p-2 shadow-elevated"
              >
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/teacher/profile" })}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-secondary"
                >
                  <span>الملف الشخصي</span>
                  <User className="size-4 text-primary" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/teacher/settings" })}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-secondary"
                >
                  <span>إعدادات الحساب</span>
                  <Settings className="size-4 text-primary" />
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border" />
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <span>تسجيل الخروج</span>
                  <LogOut className="size-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          {!isOnline ? (
            <div
              className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-elevated my-12"
              dir="rtl"
            >
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
                <AlertTriangle className="size-8" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                لوحة التحكم غير متوفرة دون اتصال
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                إدارة المحاضرات، بنك الأسئلة، ومراجعة الواجبات والامتحانات تتطلب اتصالاً نشطاً
                بالإنترنت لمزامنة بيانات الطلاب وحمايتها.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105 cursor-pointer"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
