import {
  Search,
  Menu,
  X,
  Home,
  UserPlus,
  LogIn,
  Info,
  HelpCircle,
  FileText,
  ListChecks,
  ExternalLink,
  ChevronLeft,
  BookOpen,
  User,
  LogOut,
  Bell,
  Download,
} from "lucide-react";
import { usePWA } from "@/hooks/usePWA";
import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import logoTransparent from "@/assets/altiora-logo-transparent.png";
import { isAuthenticated, getCurrentUser, clearAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isInstallable, installApp } = usePWA();

  const isLoggedIn = isAuthenticated();
  const user = getCurrentUser();

  const drawerLinks = [
    { to: "/", label: "الرئيسية", icon: Home },
    { to: "/#courses", label: "الدورات التعليمية", icon: BookOpen },
    ...(isLoggedIn && user
      ? [
          {
            to:
              user.role === "SUPER_ADMIN"
                ? "/super-admin"
                : user.role === "ADMIN"
                  ? "/admin"
                  : user.role === "TEACHER"
                    ? "/teacher"
                    : "/app",
            label:
              user.role === "SUPER_ADMIN"
                ? "لوحة المدير العام"
                : user.role === "ADMIN"
                  ? "لوحة المسؤول"
                  : user.role === "TEACHER"
                    ? "لوحة المعلم"
                    : "لوحة الطالب",
            icon: User,
          },
        ]
      : [
          { to: "/login", label: "تسجيل الدخول", icon: LogIn },
          { to: "/register", label: "إنشاء حساب", icon: UserPlus },
        ]),
    { to: "/about", label: "من نحن", icon: Info },
    { to: "/terms", label: "الشروط والأحكام", icon: ListChecks },
    { to: "/privacy", label: "سياسة الخصوصية", icon: FileText },
    { to: "/support", label: "الدعم الفني", icon: HelpCircle },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/app/courses?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus trapping inside sidebar drawer when open
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const aside = document.getElementById("sidebar-drawer");
      if (!aside) return;

      const focusableElements = aside.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      firstElement.focus();

      window.addEventListener("keydown", handleTabKey);
      return () => window.removeEventListener("keydown", handleTabKey);
    }, 50);

    return () => clearTimeout(timer);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4 md:px-6">
        {/* RIGHT SIDE: Logo + Hamburger + Search Bar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setOpen(!open)}
            aria-label="تبديل القائمة"
            className="flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-secondary cursor-pointer lg:hidden"
          >
            <Menu className="size-6" strokeWidth={2.5} />
          </button>

          <Link to="/" className="flex items-center">
            <img
              src={logoTransparent}
              alt="Altiora — نحو القمة"
              className="h-16 w-auto md:h-20 max-w-[220px] object-contain"
            />
          </Link>

          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden max-w-[200px] items-center sm:flex md:max-w-[260px] lg:max-w-[320px]"
          >
            <input
              type="text"
              placeholder="ابحث في الدورات"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-full border border-border bg-secondary/40 pe-10 ps-4 text-sm outline-none transition-all focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary"
              dir="rtl"
            />
            <button
              type="submit"
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Search className="size-4.5" />
            </button>
          </form>
        </div>

        {/* LEFT SIDE: Navigation buttons */}
        <nav className="hidden items-center gap-3 md:flex">
          {isInstallable && (
            <>
              <button
                onClick={installApp}
                className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                تحميل التطبيق
              </button>
              <span aria-hidden className="h-6 w-px bg-[#D8DCE3]" />
            </>
          )}
          <Link
            to="/"
            hash="courses"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            الدورات التعليمية
          </Link>
          <span aria-hidden className="h-6 w-px bg-[#D8DCE3]" />

          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              <Link
                to={
                  user.role === "SUPER_ADMIN"
                    ? "/super-admin"
                    : user.role === "ADMIN"
                      ? "/admin"
                      : user.role === "TEACHER"
                        ? "/teacher"
                        : "/app"
                }
                className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                {user.role === "SUPER_ADMIN"
                  ? "لوحة المدير العام"
                  : user.role === "ADMIN"
                    ? "لوحة المسؤول"
                    : user.role === "TEACHER"
                      ? "لوحة المعلم"
                      : "لوحة الطالب"}
              </Link>
              <span aria-hidden className="h-6 w-px bg-[#D8DCE3]" />

              <button
                aria-label="الإشعارات"
                className="relative flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Bell className="size-5" />
                <span className="absolute end-2 top-2 size-2 rounded-full bg-accent" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="الحساب"
                    className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
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
                    onSelect={() => {
                      window.location.href =
                        user.role === "SUPER_ADMIN"
                          ? "/super-admin"
                          : user.role === "ADMIN"
                            ? "/admin"
                            : user.role === "TEACHER"
                              ? "/teacher/profile"
                              : "/app/profile";
                    }}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:bg-secondary"
                  >
                    <span>الملف الشخصي</span>
                    <User className="size-4 text-primary" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-border" />
                  <DropdownMenuItem
                    onSelect={() => clearAuth()}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <span>تسجيل الخروج</span>
                    <LogOut className="size-4" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                تسجيل الدخول
              </Link>
              <span aria-hidden className="h-6 w-px bg-[#D8DCE3]" />
              <Link
                to="/register"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105"
              >
                حساب جديد
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />

            {/* Sidebar content */}
            <motion.aside
              id="sidebar-drawer"
              className="fixed inset-y-0 right-0 z-50 flex h-screen w-full max-w-[360px] sm:max-w-[400px] flex-col overflow-hidden border-l border-border bg-card shadow-elevated"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
                <img src={logoTransparent} alt="Altiora" className="h-10 w-auto object-contain" />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق القائمة"
                  className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Mobile Search Bar inside Drawer */}
              <div className="p-4 border-b border-border sm:hidden">
                <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
                  <input
                    type="text"
                    placeholder="ابحث في الدورات"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-full border border-border bg-secondary/50 pe-10 ps-4 text-sm outline-none transition-all focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary"
                    dir="rtl"
                  />
                  <button
                    type="submit"
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Search className="size-4.5" />
                  </button>
                </form>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-3">
                {drawerLinks.map((l, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
                  >
                    {l.to.startsWith("/#") ? (
                      <Link
                        to="/"
                        hash={l.to.substring(2)}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors text-foreground hover:bg-secondary"
                      >
                        <span>{l.label}</span>
                        <l.icon className="size-5 text-muted-foreground" />
                      </Link>
                    ) : (
                      <Link
                        to={l.to}
                        onClick={() => setOpen(false)}
                        activeProps={{ className: "bg-secondary text-primary" }}
                        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors text-foreground hover:bg-secondary"
                      >
                        <span>{l.label}</span>
                        <l.icon className="size-5 text-muted-foreground" />
                      </Link>
                    )}
                  </motion.div>
                ))}
                {isInstallable && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + drawerLinks.length * 0.04, duration: 0.3 }}
                  >
                    <button
                      onClick={() => {
                        setOpen(false);
                        installApp();
                      }}
                      className="flex w-full items-center justify-between rounded-xl bg-primary/10 px-4 py-3.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                    >
                      <span>تحميل التطبيق / Install Altiora</span>
                      <Download className="size-5" />
                    </button>
                  </motion.div>
                )}
              </nav>

              {/* Drawer footer */}
              <div className="mt-auto border-t border-border p-5">
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      clearAuth();
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
                  >
                    <span>تسجيل الخروج</span>
                    <LogOut className="size-5" />
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
