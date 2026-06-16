import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  ShieldAlert,
  Edit,
  Save,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Lock,
  Check,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAuditLogsFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/audit-logs")({
  component: SuperAdminAuditLogs,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

interface AuditLog {
  id: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  ipAddress: string;
  timestamp: string;
}

interface RateLimitItem {
  endpoint: string;
  maxRequests: number;
  timeWindow: number; // in seconds
  status: "ACTIVE" | "DISABLED";
}

function SuperAdminAuditLogs() {
  const navigate = useNavigate() as any;
  const searchParams = Route.useSearch() as any;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limits, setLimits] = useState<RateLimitItem[]>([
    { endpoint: "/api/auth/login", maxRequests: 5, timeWindow: 300, status: "ACTIVE" },
    { endpoint: "/api/auth/reset-password", maxRequests: 3, timeWindow: 3600, status: "ACTIVE" },
    { endpoint: "/api/exams/submit", maxRequests: 10, timeWindow: 3600, status: "ACTIVE" },
    { endpoint: "/api/general", maxRequests: 100, timeWindow: 60, status: "ACTIVE" },
  ]);
  const [activeTab, setActiveTab] = useState<"logs" | "limits">(
    searchParams.tab === "limits" ? "limits" : "logs"
  );

  useEffect(() => {
    if (searchParams.tab === "limits" || searchParams.tab === "logs") {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams.tab]);

  // Form edit rate limit
  const [editingLimit, setEditingLimit] = useState<RateLimitItem | null>(null);
  const [newMaxRequests, setNewMaxRequests] = useState<number>(5);
  const [newTimeWindow, setNewTimeWindow] = useState<number>(60);

  const loadLogs = async () => {
    try {
      const dbLogs = await getAuditLogsFn();
      const mapped = dbLogs.map((l: any) => ({
        id: l.id,
        actor: l.user?.profile?.name || l.user?.email || "النظام / تلقائي",
        role: l.user?.role || "SYSTEM",
        action: l.action,
        target: l.resourceType ? `${l.resourceType} (ID: ${l.resourceId || "N/A"})` : "عام",
        ipAddress: l.ipAddress || "127.0.0.1",
        timestamp: new Date(l.created_at).toLocaleString("ar-EG"),
      }));
      setLogs(mapped);
    } catch (err: any) {
      toast.error("فشل تحميل سجلات التدقيق: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Search, Filters & Pagination
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => filterRole === "ALL" || l.role === filterRole)
      .filter(
        (l) =>
          l.actor.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          l.target.toLowerCase().includes(search.toLowerCase()),
      );
  }, [logs, filterRole, search]);

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, page]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;

  // Open Edit Limit
  const handleOpenEditLimit = (item: RateLimitItem) => {
    setEditingLimit(item);
    setNewMaxRequests(item.maxRequests);
    setNewTimeWindow(item.timeWindow);
  };

  // Save Limit
  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLimit) return;

    setLimits((prev) =>
      prev.map((l) =>
        l.endpoint === editingLimit.endpoint
          ? { ...l, maxRequests: newMaxRequests, timeWindow: newTimeWindow }
          : l,
      ),
    );
    toast.success(`تم تعديل حد الطلبات للمسار ${editingLimit.endpoint}`);
    setEditingLimit(null);
  };

  // Toggle Limit status
  const handleToggleLimitStatus = (endpoint: string, currentStatus: "ACTIVE" | "DISABLED") => {
    const nextStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    setLimits((prev) =>
      prev.map((l) => (l.endpoint === endpoint ? { ...l, status: nextStatus } : l)),
    );
    toast.success(
      nextStatus === "DISABLED" ? "تم إيقاف حد الطلبات لهذا المسار" : "تم تفعيل حد الطلبات",
    );
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "المعرف,المسؤول,الدور,العملية,المستهدف,العنوان IP,التاريخ\n";
    filteredLogs.forEach((l) => {
      csvContent += `"${l.id}","${l.actor}","${l.role}","${l.action}","${l.target}","${l.ipAddress}","${l.timestamp}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "system_audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجلات التدقيق بنجاح");
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "المدير العام";
      case "ADMIN":
        return "مسؤول";
      case "TEACHER":
        return "معلم";
      case "STUDENT":
        return "طالب";
      case "SYSTEM":
        return "النظام";
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6 text-end bg-transparent font-display text-white" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            سجلات التدقيق الأمني والـ Rate Limits
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            مراقبة ورصد جميع العمليات الحساسة التي يجريها المسؤولون ووضع قيود لمعدلات الطلب لحماية الخوادم والـ APIs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-end gap-2 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-1.5 max-w-lg mr-auto">
        <button
          onClick={() => {
            setActiveTab("limits");
            navigate({ search: { tab: "limits" } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "limits"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          حدود الطلبات للنظام (Rate Limits)
        </button>
        <button
          onClick={() => {
            setActiveTab("logs");
            navigate({ search: { tab: undefined } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "logs"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          سجلات عمليات التدقيق (Audit Logs)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "logs" ? (
          <motion.div
            key="logs-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Tools bar */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/10 bg-neutral-900/30 p-4 lg:flex-row backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer"
                >
                  <FileText className="size-4 text-blue-500" /> تصدير PDF
                </button>
              </div>

              <div className="flex w-full flex-1 items-center justify-end gap-3 lg:w-auto">
                <select
                  value={filterRole}
                  onChange={(e) => {
                    setFilterRole(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:border-amber-500/50 font-bold text-end"
                >
                  <option value="ALL" className="bg-neutral-950 text-white font-bold">جميع الأدوار</option>
                  <option value="SUPER_ADMIN" className="bg-neutral-950 text-white font-bold">المدير العام</option>
                  <option value="ADMIN" className="bg-neutral-950 text-white font-bold">مسؤول (Admin)</option>
                  <option value="TEACHER" className="bg-neutral-950 text-white font-bold">معلم</option>
                </select>

                <div className="relative w-full sm:w-64">
                  <input
                    type="search"
                    placeholder="البحث بالمسؤول أو بالحدث..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end font-bold"
                  />
                  <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
                </div>
              </div>
            </div>

            {/* Audit logs table */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.04)]">
              {loading ? (
                <div className="p-10 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
                  ))}
                </div>
              ) : paginatedLogs.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-bold">
                  لا توجد سجلات مطابقة للبحث
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-end text-sm text-zinc-300">
                    <thead>
                      <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                        <th className="px-6 py-4">IP العنوان</th>
                        <th className="px-6 py-4">التاريخ والوقت</th>
                        <th className="px-6 py-4">المستهدف بالعملية</th>
                        <th className="px-6 py-4">العملية / الإجراء</th>
                        <th className="px-6 py-4">الدور الوظيفي</th>
                        <th className="px-6 py-4">المسؤول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {paginatedLogs.map((l) => (
                        <tr
                          key={l.id}
                          className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                        >
                          <td className="px-6 py-4 font-mono text-zinc-400 text-xs">{l.ipAddress}</td>
                          <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{l.timestamp}</td>
                          <td className="px-6 py-4 font-bold text-white text-xs truncate max-w-xs">{l.target}</td>
                          <td className="px-6 py-4 font-bold text-white text-xs">{l.action}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/5 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/10">
                              {getRoleLabel(l.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-white text-xs">{l.actor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
                  className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
                <span className="text-xs text-zinc-400 font-bold">
                  صفحة {page} من {totalPages}
                </span>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((v) => Math.max(v - 1, 1))}
                  className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          // RATE LIMITS VIEW
          <motion.div
            key="limits-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            <div className="text-right border-b border-zinc-900 pb-3">
              <h3 className="font-display text-lg font-bold text-amber-400">
                حدود الطلبات للمسارات الحساسة للنظام (Rate Limits)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                قم بإدارة أقصى عدد طلبات مسموح بها لكل مسار API وخلال فترة زمنية بالثواني لمنع هجمات Brute Force و DDoS.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.04)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-end text-sm text-zinc-300">
                  <thead>
                    <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                      <th className="px-6 py-4">الخيارات</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4">النافذة الزمنية</th>
                      <th className="px-6 py-4">أقصى حد للطلبات</th>
                      <th className="px-6 py-4">المسار (API Endpoint)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/80">
                    {limits.map((l) => (
                      <tr
                        key={l.endpoint}
                        className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleLimitStatus(l.endpoint, l.status)}
                              className={`rounded-lg p-2 transition-all ${
                                l.status === "ACTIVE"
                                  ? "text-red-400 hover:bg-red-500/10"
                                  : "text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                              title={l.status === "ACTIVE" ? "إيقاف التفعيل" : "تفعيل"}
                            >
                              {l.status === "ACTIVE" ? (
                                <Lock className="size-4" />
                              ) : (
                                <Check className="size-4" strokeWidth={3} />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditLimit(l)}
                              className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10 transition-all"
                              title="تعديل القيود"
                            >
                              <Edit className="size-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {l.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                              مفعلة
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                              معطلة
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-mono">{l.timeWindow} ثانية</td>
                        <td className="px-6 py-4 font-mono font-bold text-amber-400">{l.maxRequests} طلبات</td>
                        <td className="px-6 py-4 font-mono font-bold text-white text-xs">{l.endpoint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Limit Dialog */}
      <Dialog open={!!editingLimit} onOpenChange={() => setEditingLimit(null)}>
        <DialogContent
          className="max-w-md rounded-3xl border border-amber-500/20 bg-neutral-950 p-6 text-white text-end shadow-[0_0_50px_rgba(251,191,36,.15)] backdrop-blur-xl"
          dir="rtl"
        >
          <DialogHeader className="border-b border-zinc-900 pb-3">
            <DialogTitle className="font-display text-lg font-black text-amber-400 flex items-center justify-end gap-2">
              <LockKeyhole className="size-5 text-amber-400" />
              تعديل حد الطلبات
            </DialogTitle>
          </DialogHeader>
          {editingLimit && (
            <form onSubmit={handleSaveLimit} className="mt-4 space-y-4">
              <div className="rounded-xl border border-amber-500/10 p-3 bg-amber-500/5 font-mono text-xs text-center text-amber-400 font-bold">
                {editingLimit.endpoint}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 mb-1 text-right">
                  الحد الأقصى للطلبات (Max Requests)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newMaxRequests}
                  onChange={(e) => setNewMaxRequests(parseInt(e.target.value) || 1)}
                  required
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 mb-1 text-right">
                  النافذة الزمنية بالثواني (Time Window)
                </label>
                <input
                  type="number"
                  min="5"
                  value={newTimeWindow}
                  onChange={(e) => setNewTimeWindow(parseInt(e.target.value) || 5)}
                  required
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-all mt-6 cursor-pointer"
              >
                حفظ التعديلات
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
