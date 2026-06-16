import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Archive,
  Trash2,
  CheckCheck,
  Search,
  Pin,
  Star,
  Megaphone,
  Info,
  AlertTriangle,
  PlaySquare,
  ClipboardCheck,
  Wallet,
  Radio,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import io from "socket.io-client";
import {
  getUserNotificationsFn,
  markNotificationAsReadFn,
  markAllNotificationsAsReadFn,
  deleteNotificationFn,
  togglePinNotificationFn,
  toggleStarNotificationFn,
  toggleArchiveNotificationFn,
} from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/app/notifications")({
  component: StudentNotifications,
});

interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  isPinned: boolean;
  isStarred: boolean;
  isArchived: boolean;
  createdAt: string;
  actionUrl?: string | null;
  priority: string;
}

type FilterType = "all" | "unread" | "COURSES" | "EXAMS" | "SYSTEM" | "PAYMENTS" | "LIVE" | "starred" | "archived";

const TYPE_ICONS: Record<string, any> = {
  NEW_LESSON: PlaySquare,
  COURSE: PlaySquare,
  EXAM_RESULT: ClipboardCheck,
  ASSIGNMENT: ClipboardCheck,
  SYSTEM: Info,
  PAYMENT: Wallet,
  LIVE_SESSION: Radio,
  ANNOUNCEMENT: Megaphone,
  WARNING: AlertTriangle,
  SUCCESS: Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  NEW_LESSON: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  COURSE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  EXAM_RESULT: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  ASSIGNMENT: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  SYSTEM: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  PAYMENT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  LIVE_SESSION: "bg-red-500/10 text-red-500 border-red-500/20",
  ANNOUNCEMENT: "bg-sky-500/10 text-sky-500 border-sky-500/20",
  WARNING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  SUCCESS: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

const TYPE_LABELS: Record<string, string> = {
  NEW_LESSON: "درس جديد",
  COURSE: "الدورة التدريبية",
  EXAM_RESULT: "نتيجة امتحان",
  ASSIGNMENT: "الواجب الدراسي",
  SYSTEM: "النظام",
  PAYMENT: "المدفوعات",
  LIVE_SESSION: "بث مباشر",
  ANNOUNCEMENT: "إعلان",
  WARNING: "تنبيه",
  SUCCESS: "نجاح",
};

function StudentNotifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const currentUser = getCurrentUser();

  // Load notifications from server
  const loadNotifications = (pageNum = 1, append = false) => {
    setLoading(true);
    getUserNotificationsFn({
      data: {
        page: pageNum,
        limit: 10,
        filter: filter,
        search: search.trim() || undefined,
      },
    })
      .then((res: any) => {
        if (append) {
          setNotifications((prev) => [...prev, ...(res.notifications || [])]);
        } else {
          setNotifications(res.notifications || []);
        }
        setHasMore(res.hasMore || false);
        setTotal(res.total || 0);
        setPage(pageNum);
      })
      .catch((err) => {
        toast.error("فشل تحميل الإشعارات: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Reload when filter or search query changes
  useEffect(() => {
    loadNotifications(1, false);
  }, [filter, search]);

  // Real-Time WebSocket updates
  useEffect(() => {
    if (currentUser && currentUser.id) {
      const socketHost = `${window.location.protocol}//${window.location.hostname}:3001`;
      const socket = io(socketHost, {
        query: { userId: currentUser.id },
      });

      socket.on("notification", (newNotif: any) => {
        setNotifications((prev) => {
          // Prevent duplicates
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
        setTotal((t) => t + 1);
        toast.info(`إشعار جديد: ${newNotif.title}`);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [currentUser?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsReadFn({ data: { id } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      toast.error("خطأ: " + err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsReadFn();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("تم تحديد جميع الإشعارات كمقروءة.");
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotificationFn({ data: { id } });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
      toast.success("تم حذف الإشعار.");
    } catch (err: any) {
      toast.error("خطأ في الحذف: " + err.message);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      await togglePinNotificationFn({ data: { id, isPinned: !currentPinned } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPinned: !currentPinned } : n))
      );
      toast.success(!currentPinned ? "تم تثبيت الإشعار في الأعلى." : "تم إلغاء تثبيت الإشعار.");
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    }
  };

  const handleToggleStar = async (id: string, currentStarred: boolean) => {
    try {
      await toggleStarNotificationFn({ data: { id, isStarred: !currentStarred } });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isStarred: !currentStarred } : n))
      );
      toast.success(!currentStarred ? "تم وضع تمييز بنجمة للإشعار." : "تم إزالة نجمة التمييز.");
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    }
  };

  const handleToggleArchive = async (id: string, currentArchived: boolean) => {
    try {
      await toggleArchiveNotificationFn({ data: { id, isArchived: !currentArchived } });
      if (filter !== "archived") {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isArchived: !currentArchived } : n))
        );
      }
      toast.success(!currentArchived ? "تم نقل الإشعار إلى الأرشيف." : "تم استعادة الإشعار من الأرشيف.");
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    }
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead && !n.isArchived).length;
  }, [notifications]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-end" dir="rtl">
      {/* Title block */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-card sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center justify-end gap-2">
            <span>مركز التنبيهات والإشعارات</span>
            <Bell className="size-6 text-primary animate-bounce" />
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            شاهد وتابع آخر أخبار حصصك المباشرة، نتائج امتحاناتك والمستجدات على حسابك.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              لديك {unreadCount} إشعار غير مقروء
            </span>
          )}
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition-all hover:bg-secondary cursor-pointer"
          >
            <CheckCheck className="size-4 text-success" />
            <span>تحديد الكل كمقروء</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Navigation Filters */}
        <aside className="space-y-1.5">
          <h3 className="text-xs font-bold text-muted-foreground px-3 mb-2">تصنيفات الإشعارات</h3>
          {[
            { id: "all", label: "الكل", icon: Bell },
            { id: "unread", label: "غير مقروءة", icon: Clock },
            { id: "COURSES", label: "الدورات والدروس", icon: PlaySquare },
            { id: "EXAMS", label: "الامتحانات والنتائج", icon: ClipboardCheck },
            { id: "SYSTEM", label: "تنبيهات النظام", icon: Info },
            { id: "PAYMENTS", label: "المدفوعات والمحفظة", icon: Wallet },
            { id: "LIVE", label: "الحصص المباشرة", icon: Radio },
            { id: "starred", label: "المميزة بنجمة", icon: Star },
            { id: "archived", label: "الأرشيف", icon: Archive },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = filter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id as FilterType)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content feed */}
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث في عنوان الإشعار ومحتواه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-card pe-11 ps-4 text-xs text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* Notifications feed list */}
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const Icon = TYPE_ICONS[notif.type] || Bell;
                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) {
                        handleMarkAsRead(notif.id);
                      }
                    }}
                    className={`group relative flex items-start gap-4 rounded-2xl border p-4 shadow-sm transition-all hover:bg-secondary/15 ${
                      notif.isPinned
                        ? "border-primary/40 bg-primary/[0.02] dark:bg-primary/[0.01]"
                        : notif.isRead
                        ? "border-border bg-card"
                        : "border-primary/20 bg-primary/[0.01]"
                    }`}
                  >
                    {/* Floating Indicators */}
                    <div className="absolute top-4 start-4 flex items-center gap-1">
                      {notif.isPinned && <Pin className="size-3.5 text-primary fill-primary" />}
                      {notif.isStarred && <Star className="size-3.5 text-amber-500 fill-amber-500" />}
                      {!notif.isRead && (
                        <span className="size-2 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                    </div>

                    {/* Icon container */}
                    <div
                      className={`rounded-xl border p-2.5 shrink-0 ${
                        TYPE_COLORS[notif.type] || "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>

                    {/* Text content details */}
                    <div className="flex-1 min-w-0 space-y-1 text-right pe-10">
                      <div className="flex items-center justify-between flex-row-reverse gap-2">
                        <h4 className="font-bold text-foreground text-sm sm:text-base leading-snug">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground bg-secondary/65 px-2.5 py-0.5 rounded-full shrink-0">
                          {TYPE_LABELS[notif.type] || notif.type}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground flex-wrap gap-2">
                        <span className="font-semibold">
                          {new Date(notif.createdAt).toLocaleDateString("ar-EG", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePin(notif.id, notif.isPinned);
                            }}
                            className={`p-1.5 rounded-lg border hover:bg-secondary ${
                              notif.isPinned ? "text-primary border-primary/20" : "text-muted-foreground border-transparent"
                            }`}
                            title={notif.isPinned ? "إلغاء التثبيت" : "تثبيت في الأعلى"}
                          >
                            <Pin className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(notif.id, notif.isStarred);
                            }}
                            className={`p-1.5 rounded-lg border hover:bg-secondary ${
                              notif.isStarred ? "text-amber-500 border-amber-500/20" : "text-muted-foreground border-transparent"
                            }`}
                            title={notif.isStarred ? "إزالة النجمة" : "تمييز بنجمة"}
                          >
                            <Star className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(notif.id, notif.isArchived);
                            }}
                            className={`p-1.5 rounded-lg border hover:bg-secondary ${
                              notif.isArchived ? "text-success border-success/20" : "text-muted-foreground border-transparent"
                            }`}
                            title={notif.isArchived ? "استعادة للوارد" : "أرشفة"}
                          >
                            <Archive className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notif.id);
                            }}
                            className="p-1.5 rounded-lg border border-transparent text-muted-foreground hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                            title="حذف"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-border bg-card py-20 text-center text-muted-foreground shadow-card flex flex-col items-center justify-center">
                <Bell className="size-16 text-muted-foreground/30 mb-4 animate-pulse" />
                <p className="text-sm font-bold">صندوق الإشعارات فارغ</p>
                <p className="text-xs text-muted-foreground mt-1">لا توجد أي إشعارات تطابق التصفية الحالية.</p>
              </div>
            )}
          </div>

          {/* Pagination Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => loadNotifications(page + 1, true)}
                className="rounded-xl border border-primary bg-primary/5 px-6 py-2.5 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground cursor-pointer"
              >
                {loading ? "جاري التحميل..." : "تحميل المزيد من الإشعارات"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
