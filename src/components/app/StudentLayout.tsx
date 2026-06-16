import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  User,
  BookMarked,
  PlaySquare,
  Users,
  Award,
  ClipboardCheck,
  Wallet,
  Info,
  FileText,
  ListChecks,
  HelpCircle,
  Menu,
  Bell,
  Search,
  ExternalLink,
  LogOut,
  Bookmark,
  FileDown,
  Activity,
  Download,
  AlertTriangle,
} from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { useEffect } from "react";
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
import { clearAuth } from "@/lib/auth";
import { getStudentMessagesFn } from "@/lib/api/db.functions";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

export const navItems: NavItem[] = [
  { to: "/app", label: "الصفحة الرئيسية", icon: Home, exact: true },
  { to: "/app/notifications", label: "الرسائل والإشعارات", icon: Bell },
  { to: "/app/profile", label: "الملف الشخصي", icon: User },
  { to: "/app/my-courses", label: "دوراتي", icon: BookMarked },
  { to: "/app/courses", label: "الدورات التعليمية", icon: PlaySquare },
  { to: "/app/instructors", label: "المعلمين", icon: Users },
  { to: "/app/homework", label: "نتائج واجباتي", icon: Award },
  { to: "/app/exams", label: "نتائج امتحاناتي", icon: ClipboardCheck },
  { to: "/app/notes", label: "ملاحظاتي المسجلة", icon: Bookmark },
  { to: "/app/downloads", label: "الملفات المحملة", icon: FileDown },
  { to: "/app/timeline", label: "سجل أنشطتي", icon: Activity },
  { to: "/app/wallet", label: "المحفظة الإلكترونية", icon: Wallet },
  { to: "/app/about", label: "عن التطبيق", icon: Info },
  { to: "/app/privacy", label: "سياسة الخصوصية", icon: FileText },
  { to: "/app/terms", label: "شروط الاستخدام", icon: ListChecks },
  { to: "/app/support", label: "الدعم الفني", icon: HelpCircle },
];

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { isInstallable, installApp } = usePWA();
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card custom-scrollbar">
      {/* Logo header */}
      <div className="flex items-center justify-center border-b border-border px-4 py-5">
        <Link to="/" onClick={onNavigate} className="flex items-center">
          <img src={logo} alt="Altiora" className="h-16 w-auto object-contain" />
        </Link>
      </div>

      {/* Items */}
      <nav className="flex-1 px-3 py-4">
        {navItems.map((item, i) => {
          const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
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
                    layoutId="sidebar-active"
                    className="absolute inset-y-2 end-0 w-1 rounded-full bg-primary"
                  />
                )}
                <span>{item.label}</span>
                <Icon className={`size-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              </Link>
            </motion.div>
          );
        })}
        {isInstallable && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 + navItems.length * 0.025, duration: 0.25 }}
          >
            <button
              onClick={() => {
                if (onNavigate) onNavigate();
                installApp();
              }}
              className="relative mb-2 flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-primary bg-primary/10 transition-all hover:bg-primary/20 cursor-pointer"
            >
              <span>تحميل التطبيق / Install App</span>
              <Download className="size-5 animate-pulse" />
            </button>
          </motion.div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center justify-center gap-3">
          <a
            href="#"
            aria-label="WhatsApp"
            className="flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24z" />
            </svg>
          </a>
          <a
            href="#"
            aria-label="Facebook"
            className="flex size-9 items-center justify-center rounded-full bg-[#1877F2] text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
              <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073c0 6.027 4.388 11.024 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.014 1.792-4.678 4.533-4.678 1.312 0 2.686.235 2.686.235v2.967h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.097 24 18.1 24 12.073z" />
            </svg>
          </a>
        </div>
        <div className="flex items-center justify-center gap-2">
          <a
            href="#"
            className="flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-background"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08z" />
            </svg>
            App Store
          </a>
          <a
            href="#"
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-primary"
          >
            <ExternalLink className="size-3" /> Google Play
          </a>
        </div>
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

export function StudentLayout({ children, title }: { children?: ReactNode; title?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => {
        setIsOnline(false);
        toast.error("لقد فقدت الاتصال بالشبكة.");
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = () => {
      getStudentMessagesFn()
        .then((res: any) => {
          if (Array.isArray(res)) {
            const count = res.filter((m: any) => !m.isRead && !m.isArchived).length;
            setUnreadCount(count);
          }
        })
        .catch(console.warn);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const isRestrictedOfflinePath =
    !isOnline &&
    (pathname.includes("/exams") ||
      pathname.includes("/wallet") ||
      pathname.includes("/downloads"));

  const handleLogout = () => {
    clearAuth();
    try {
      sessionStorage.clear();
    } catch {
      /* no-op */
    }
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/login" });
  };

  // Dropdown nav must use the in-app /app/support so the dashboard shell stays mounted

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Desktop sidebar (right in RTL) */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-border lg:block">
        <SidebarBody pathname={pathname} />
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
              <SidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area (offset for desktop sidebar) */}
      <div className="lg:mr-72">
        {/* Top bar — search/title on the RIGHT (start in RTL), icons on the LEFT (end in RTL) */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6">
          {/* RIGHT side in RTL: search + title */}
          <div className="flex flex-1 items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-secondary lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu className="size-6" />
            </button>
            <div className="hidden md:block">
              <div className="relative">
                <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="البحث في الدورات"
                  className="h-10 w-72 rounded-xl border border-border bg-card pe-10 ps-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
            {title && <h1 className="text-base font-bold text-foreground md:text-lg">{title}</h1>}
          </div>

          {/* LEFT side in RTL: notifications + profile dropdown */}
          <div className="flex items-center gap-2">
            <Link
              to="/app/notifications"
              aria-label="الإشعارات"
              className="relative flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 left-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground shadow animate-pulse">
                  {unreadCount}
                </span>
              )}
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
                  onSelect={() => navigate({ to: "/app/profile" })}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-secondary"
                >
                  <span>الملف الشخصي</span>
                  <User className="size-4 text-primary" />
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-border" />
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/app/support" })}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-secondary"
                >
                  <span>الدعم الفني</span>
                  <HelpCircle className="size-4 text-primary" />
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
          {isRestrictedOfflinePath ? (
            <div
              className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-elevated my-12"
              dir="rtl"
            >
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
                <AlertTriangle className="size-8" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                هذه الصفحة غير متوفرة دون اتصال
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                الامتحانات والمحفظة الإلكترونية تتطلب اتصالاً نشطاً بالإنترنت لضمان مزامنة درجاتك
                ومدفوعاتك وحمايتها.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105 cursor-pointer"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          ) : (
            (children ?? <Outlet />)
          )}
        </main>
      </div>
    </div>
  );
}
