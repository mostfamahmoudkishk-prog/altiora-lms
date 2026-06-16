import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Key,
  AlertTriangle,
  Cpu,
  Terminal,
  RefreshCcw,
  Eye,
  Lock,
  Activity,
  Play,
  Star,
  Settings,
  Bell,
  Menu,
  LogOut,
  FileText,
  BarChart3,
  Database,
  User,
  Award,
  GraduationCap,
  Search,
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
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle, ThemeManager } from "@/components/theme-toggle";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminLayoutWrapper,
});

export type SuperAdminNavItem = {
  to: string;
  search?: Record<string, unknown>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

export const superAdminNavItems: SuperAdminNavItem[] = [
  { to: "/super-admin", label: "لوحة التحكم", icon: BarChart3, exact: true },
  { to: "/super-admin/operations", label: "مركز العمليات", icon: Cpu },
  { to: "/super-admin/analytics", label: "الإحصائيات العامة", icon: BarChart3 },
  { to: "/super-admin/branding", label: "الهوية التجارية", icon: Award },
  { to: "/super-admin/reputation", label: "إدارة التقييمات", icon: Star },
  { to: "/super-admin/teachers", label: "إدارة المدرسين", icon: Users },
  { to: "/super-admin/students", label: "إدارة الطلاب", icon: GraduationCap },
  { to: "/super-admin/admins", label: "إدارة الأدمنز", icon: Shield },
  { to: "/super-admin/admins", search: { tab: "rbac" }, label: "RBAC", icon: Key },
  { to: "/super-admin/security", label: "الأمان", icon: Lock },
  { to: "/super-admin/security", search: { tab: "sessions" }, label: "الجلسات والأجهزة", icon: Activity },
  { to: "/super-admin/audit-logs", label: "Audit Logs", icon: Terminal },
  { to: "/super-admin/audit-logs", search: { tab: "limits" }, label: "Rate Limits", icon: ShieldTriangle },
  { to: "/super-admin/simulation-logs", label: "سجلات المحاكاة", icon: Terminal },
  { to: "/super-admin/users", label: "المستخدمون", icon: Users },
  { to: "/super-admin/courses", label: "الدورات", icon: BookOpen },
  { to: "/super-admin/payments", label: "المدفوعات", icon: CreditCard },
  { to: "/super-admin/notifications", label: "الإشعارات", icon: Bell },
  { to: "/super-admin/reports", label: "التقارير", icon: FileText },
  { to: "/super-admin/ai", label: "Altiora AI", icon: Cpu },
  { to: "/super-admin/settings", label: "إعدادات الموقع", icon: Settings },
  { to: "/super-admin/backup", label: "Backup & Restore", icon: Database },
];

function SuperAdminSidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentSearch = routerState.location.search as any;
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-card border-l border-border/60 custom-scrollbar text-end">
      {/* Logo header */}
      <div className="flex items-center justify-center border-b border-border/60 px-4 py-6 bg-secondary/20">
        <Link to="/" onClick={onNavigate} className="flex flex-col items-center gap-1">
          <img src={logo} alt="Altiora" className={`h-12 w-auto object-contain transition-all ${resolvedTheme === "dark" ? "brightness-200" : ""}`} />
          <span className="rounded-full bg-accent/10 border border-accent/30 px-3 py-0.5 text-[9px] font-black text-accent tracking-wider">
            MOGENIX SUPER ADMIN
          </span>
        </Link>
      </div>

      {/* Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {superAdminNavItems.map((item, i) => {
          const isPathMatching = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const isSearchMatching = item.search?.tab === currentSearch?.tab;
          const isActive = isPathMatching && isSearchMatching;
          const Icon = item.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.01 + i * 0.01, duration: 0.2 }}
            >
              <Link
                to={item.to}
                search={item.search}
                onClick={onNavigate}
                className={`relative flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-accent/10 to-transparent border-r-2 border-accent text-accent shadow-[0_0_15px_rgba(245,158,11,0.02)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{item.label}</span>
                <Icon className={`size-4.5 ${isActive ? "text-accent" : "text-muted-foreground"}`} />
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-4 bg-secondary/20">
        <button
          onClick={() => {
            clearAuth();
            toast.success("تم تسجيل الخروج");
            navigate({ to: "/login" });
          }}
          className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/15 cursor-pointer"
        >
          <span>تسجيل الخروج</span>
          <LogOut className="size-4" />
        </button>
        <div className="mt-2">
          <MogenixFooter />
        </div>
        <div className="mt-2 text-center text-[8px] text-zinc-600 font-mono">
          Altiora Core Engine v2.1.0
        </div>
      </div>
    </div>
  );
}

function SuperAdminLayoutWrapper() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Global search Command Palette state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = [
    { type: "مدرس", name: "أ. محمد عبد الله", route: "/super-admin/teachers" },
    { type: "مدرس", name: "أ. أحمد خالد", route: "/super-admin/teachers" },
    { type: "طالب", name: "خالد سعيد", route: "/super-admin/students" },
    { type: "طالب", name: "سارة أحمد", route: "/super-admin/students" },
    { type: "دورة", name: "الرياضيات التطبيقية والبحثية", route: "/super-admin/courses" },
    { type: "دورة", name: "الفيزياء الحديثة المتقدمة", route: "/super-admin/courses" },
    { type: "فاتورة", name: "INV-2026-0045", route: "/super-admin/payments" },
    { type: "فاتورة", name: "INV-2026-0089", route: "/super-admin/payments" },
  ];

  const filteredSearchResults = (query: string) => {
    if (!query) return [];
    return searchResults.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.type.toLowerCase().includes(query.toLowerCase()),
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      toast.error("يجب تسجيل الدخول كمدير عام أولاً.");
      navigate({ to: "/login" });
      return;
    }
    if (user.role !== "SUPER_ADMIN") {
      setAuthorized(false);
      setReady(true);
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
        setAuthorized(true);
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
      <div
        className="flex min-h-screen items-center justify-center bg-black text-sm text-amber-500/80 font-bold"
        dir="rtl"
      >
        جارٍ التحقق من الجلسة والأمان بالبوابة العليا…
      </div>
    );
  }

  if (!authorized) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-black px-4 text-center"
        dir="rtl"
      >
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-neutral-950 p-8 shadow-2xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-950/30 text-red-400 border border-red-500/20 mb-6">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-white">الوصول غير مصرح به!</h1>
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            عذراً، هذه الصفحة مخصصة لمدير عام المنصة فقط. ليس لديك صلاحية لمشاهدة محتويات هذا
            الرابط.
          </p>
          <div className="mt-6 flex flex-col gap-2 justify-center sm:flex-row">
            <button
              onClick={() => navigate({ to: "/login" })}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:opacity-90 transition-all shadow-md"
            >
              تسجيل دخول كمسؤول
            </button>
            <Link
              to="/"
              className="rounded-xl border border-zinc-800 px-5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-neutral-900 transition-all"
            >
              الرئيسية للموقع
            </Link>
          </div>
        </div>
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
    <div
      className="min-h-screen bg-background flex flex-col font-display"
      dir="rtl"
    >
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-72 border-l border-border/60 lg:block">
        <SuperAdminSidebarBody pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 w-full max-w-[320px] border-l border-border/60 shadow-2xl lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <SuperAdminSidebarBody pathname={pathname} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="lg:mr-72 flex-1 flex flex-col min-h-screen bg-transparent">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 backdrop-blur-xl md:px-6 shadow-sm">
          <div className="flex flex-1 items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary lg:hidden border border-border"
              aria-label="فتح القائمة"
            >
              <Menu className="size-5" />
            </button>

            {/* Global Search box triggering modal */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-3 bg-secondary/50 hover:bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground font-bold transition-all w-64 text-right justify-between shadow-inner cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Search className="size-3.5 text-accent/80" />
                <span>بحث سريع بالمنصة...</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-secondary px-1.5 font-mono text-[9px] font-medium text-muted-foreground border border-border">
                Ctrl + K
              </kbd>
            </button>

            <div className="text-xs font-bold text-accent flex items-center gap-1.5 sm:mr-4">
              <span className="rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-[9px] font-black text-accent">
                المدير العام
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground font-normal">{user?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary"
            >
              <Search className="size-5" />
            </button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="الحساب"
                  className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground border border-border cursor-pointer focus:outline-none"
                >
                  <User className="size-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 rounded-2xl border border-border bg-card p-2 shadow-elevated text-right font-display"
              >
                <DropdownMenuItem
                  onSelect={() => navigate({ to: "/admin" })}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground focus:bg-secondary focus:text-primary"
                >
                  <span>لوحة المسؤولين العادية</span>
                  <Shield className="size-4 text-primary" />
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="my-1 bg-border/60" />
                
                <div className="py-1">
                  <ThemeManager />
                </div>
                
                <DropdownMenuSeparator className="my-1 bg-border/60" />
                
                <DropdownMenuItem
                  onSelect={handleLogout}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-red-500 focus:bg-red-500/10 focus:text-red-500"
                >
                  <span>تسجيل الخروج</span>
                  <LogOut className="size-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          {!isOnline ? (
            <div
              className="mx-auto max-w-lg rounded-3xl border border-amber-500/10 bg-neutral-950 p-8 text-center shadow-2xl my-12"
              dir="rtl"
            >
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-950/30 text-red-400 border border-red-500/20 mb-6">
                <AlertTriangle className="size-8" />
              </div>
              <h2 className="font-display text-lg font-bold text-white">
                لوحة التحكم غير متوفرة دون اتصال
              </h2>
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                إدارة أمان المنصة، النسخ الاحتياطي، وحسابات الإدارة تتطلب اتصالاً نشطاً بالإنترنت
                لمنع تضارب البيانات وحماية النظام.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-xs font-black text-black shadow-lg hover:opacity-90 transition-all cursor-pointer"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Global Command Palette search Modal (Ctrl + K) */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-10 bg-black/85 backdrop-blur-md pt-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-xl rounded-3xl border border-amber-500/15 bg-neutral-950 p-5 shadow-2xl text-right space-y-4"
            >
              <div className="flex items-center justify-between border-b border-amber-500/10 pb-3">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded bg-black px-1.5 font-mono text-[9px] font-medium text-amber-400 border border-amber-500/10">
                  ESC للغلق
                </kbd>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs font-black text-amber-400">
                    البحث السريع الموحد
                  </span>
                  <Search className="size-4 text-amber-500" />
                </div>
              </div>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="ابحث عن: مدرس، طالب، دورة، أو رمز فاتورة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchOpen(false);
                  }}
                  className="h-11 w-full rounded-2xl border border-amber-500/10 bg-neutral-900/60 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/40 text-end"
                />
                <Search className="absolute left-3 top-3.5 size-4 text-zinc-500" />
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {searchQuery ? (
                  filteredSearchResults(searchQuery).length > 0 ? (
                    filteredSearchResults(searchQuery).map((res, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery("");
                          navigate({ to: res.route });
                        }}
                        className="w-full flex justify-between items-center bg-neutral-900/40 hover:bg-neutral-900 border border-zinc-900 hover:border-amber-500/15 p-3 rounded-2xl text-xs transition-all text-right cursor-pointer"
                      >
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                          {res.type}
                        </span>
                        <span className="font-bold text-white">{res.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="py-6 text-center text-zinc-500 text-xs italic">
                      لا توجد نتائج مطابقة لمصطلح البحث.
                    </div>
                  )
                ) : (
                  <div className="py-8 text-center text-zinc-600 text-xs">
                    اكتب كلمة للبحث عن المدرسين أو الطلاب أو الكورسات المسجلة بالمنصة.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Fallback icon definition for ShieldTriangle / RateLimit
function ShieldTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

// Fallback icons for layout tree
function BookOpen({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function CreditCard({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
