import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  Activity,
  XCircle,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Monitor,
  Laptop,
  Phone,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllSecurityEventsFn,
  getAllSessionsFn,
  getAllDevicesFn,
  revokeSessionFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/security")({
  component: SuperAdminSecurity,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

interface SecurityEvent {
  id: string;
  type: "FAILED_LOGIN" | "SUSPICIOUS_ACTIVITY" | "LOCKOUT" | "NEW_DEVICE";
  userEmail: string;
  details: string;
  ipAddress: string;
  date: string;
}

interface UserSession {
  id: string;
  userEmail: string;
  device: string;
  ipAddress: string;
  location: string;
  loginTime: string;
}

interface UserDevice {
  id: string;
  userEmail: string;
  name: string;
  type: "MOBILE" | "DESKTOP" | "TABLET";
  os: string;
  lastUsed: string;
}

const initialEvents: SecurityEvent[] = [
  {
    id: "sec-1",
    type: "FAILED_LOGIN",
    userEmail: "unknown@gmail.com",
    details: "محاولة تسجيل دخول فاشلة 3 مرات متتالية",
    ipAddress: "197.34.81.12",
    date: "2026-06-13 23:45",
  },
  {
    id: "sec-2",
    type: "LOCKOUT",
    userEmail: "hackertry@gmail.com",
    details: "تم حظر الحساب مؤقتاً لتخطي محاولات الدخول",
    ipAddress: "197.34.81.12",
    date: "2026-06-13 23:46",
  },
  {
    id: "sec-3",
    type: "SUSPICIOUS_ACTIVITY",
    userEmail: "mohamed@gmail.com",
    details: "نشاط مريب: دخول من متصفح مختلف بموقع جغرافي بعيد",
    ipAddress: "102.43.12.8",
    date: "2026-06-12 14:20",
  },
  {
    id: "sec-4",
    type: "NEW_DEVICE",
    userEmail: "teacher@altiora.com",
    details: "تم ربط جهاز جديد بالحساب: iPhone 15",
    ipAddress: "196.21.40.89",
    date: "2026-06-10 18:30",
  },
];

const initialSessions: UserSession[] = [
  {
    id: "sess-101",
    userEmail: "superadmin@altiora.com",
    device: "Chrome / Windows 11",
    ipAddress: "197.102.8.21",
    location: "القاهرة، مصر",
    loginTime: "منذ 20 دقيقة",
  },
  {
    id: "sess-102",
    userEmail: "teacher@altiora.com",
    device: "Safari / Mac OS",
    ipAddress: "196.21.40.89",
    location: "الإسكندرية، مصر",
    loginTime: "منذ 4 ساعات",
  },
  {
    id: "sess-103",
    userEmail: "mohamed@gmail.com",
    device: "Chrome / Android",
    ipAddress: "102.43.12.8",
    location: "الجيزة، مصر",
    loginTime: "منذ يوم",
  },
];

const initialDevices: UserDevice[] = [
  {
    id: "dev-201",
    userEmail: "superadmin@altiora.com",
    name: "PC-DESKTOP-ADMIN",
    type: "DESKTOP",
    os: "Windows 11",
    lastUsed: "الآن",
  },
  {
    id: "dev-202",
    userEmail: "teacher@altiora.com",
    name: "أيفون أستاذ أحمد",
    type: "MOBILE",
    os: "iOS 17",
    lastUsed: "منذ 4 ساعات",
  },
  {
    id: "dev-203",
    userEmail: "mohamed@gmail.com",
    name: "سامسونج محمد",
    type: "MOBILE",
    os: "Android 13",
    lastUsed: "منذ يوم",
  },
];

function SuperAdminSecurity() {
  const navigate = useNavigate() as any;
  const searchParams = Route.useSearch() as any;
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [activeTab, setActiveTab] = useState<"audit" | "sessions" | "devices">(
    searchParams.tab === "sessions" || searchParams.tab === "devices" || searchParams.tab === "audit"
      ? searchParams.tab
      : "audit"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (searchParams.tab === "sessions" || searchParams.tab === "devices" || searchParams.tab === "audit") {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams.tab]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const loadData = () => {
    setLoading(true);
    Promise.all([getAllSecurityEventsFn(), getAllSessionsFn(), getAllDevicesFn()])
      .then(([evts, sess, devs]) => {
        setEvents(evts);
        setSessions(sess.filter((s: any) => s.status === "ACTIVE"));
        setDevices(devs.filter((d: any) => !d.revoked));
        setLoading(false);
      })
      .catch(() => {
        setEvents(initialEvents);
        setSessions(initialSessions);
        setDevices(initialDevices);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => filterType === "ALL" || e.type === filterType)
      .filter(
        (e) =>
          e.userEmail.toLowerCase().includes(search.toLowerCase()) ||
          e.details.toLowerCase().includes(search.toLowerCase()),
      );
  }, [events, filterType, search]);

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, page]);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;

  // Terminate Session
  const handleTerminateSession = async (id: string, userEmail: string) => {
    if (!confirm(`هل أنت متأكد من إنهاء جلسة المستخدم ${userEmail}؟ سيتم إخراجه فوراً.`)) return;
    try {
      await revokeSessionFn({ data: { deviceId: id } });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("تم إنهاء الجلسة وإخراج المستخدم بنجاح من النظام");
      loadData();
    } catch {
      toast.error("تعذر إنهاء الجلسة");
    }
  };

  // Remove Device
  const handleRemoveDevice = async (id: string, deviceName: string) => {
    if (!confirm(`هل أنت متأكد من إزالة هذا الجهاز (${deviceName})؟`)) return;
    try {
      await revokeSessionFn({ data: { deviceId: id } });
      setDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success("تمت إزالة الجهاز وإلغاء ارتباطه بالكامل");
      loadData();
    } catch {
      toast.error("تعذر إزالة الجهاز");
    }
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "المعرف,النوع,المستخدم,التفاصيل,IP العنوان,التاريخ\n";
    filteredEvents.forEach((e) => {
      csvContent += `"${e.id}","${e.type}","${e.userEmail}","${e.details}","${e.ipAddress}","${e.date}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "security_audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجل الأمان بنجاح");
  };

  return (
    <div className="space-y-6 text-end bg-transparent font-display text-white" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            مركز الأمان والجلسات
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            مراقبة محاولات تسجيل الدخول، الأجهزة النشطة، وإدارة الجلسات الفعالة لمنع تكرار أو إساءة استخدام الحسابات.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-end gap-2 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-1.5 max-w-lg mr-auto">
        <button
          onClick={() => {
            setActiveTab("devices");
            navigate({ search: { tab: "devices" } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "devices"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          الأجهزة الموثوقة ({devices.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("sessions");
            navigate({ search: { tab: "sessions" } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "sessions"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          الجلسات النشطة ({sessions.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("audit");
            navigate({ search: { tab: undefined } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "audit"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          سجلات التدقيق الأمني
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "audit" && (
          <motion.div
            key="audit-tab"
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
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:border-amber-500/50 font-bold text-end"
                >
                  <option value="ALL" className="bg-neutral-950 text-white font-bold">جميع التنبيهات</option>
                  <option value="FAILED_LOGIN" className="bg-neutral-950 text-white font-bold">دخول فاشل</option>
                  <option value="LOCKOUT" className="bg-neutral-950 text-white font-bold">حظر حساب (Lockout)</option>
                  <option value="SUSPICIOUS_ACTIVITY" className="bg-neutral-950 text-white font-bold">نشاط مريب</option>
                  <option value="NEW_DEVICE" className="bg-neutral-950 text-white font-bold">جهاز جديد</option>
                </select>

                <div className="relative w-full sm:w-64">
                  <input
                    type="search"
                    placeholder="البحث باسم البريد أو الحدث..."
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

            {/* Audit events list */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.04)]">
              {loading ? (
                <div className="p-10 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
                  ))}
                </div>
              ) : paginatedEvents.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-bold">
                  لا توجد سجلات مطابقة لمعايير البحث
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-end text-sm text-zinc-300">
                    <thead>
                      <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                        <th className="px-6 py-4">IP العنوان</th>
                        <th className="px-6 py-4">تاريخ الحدث</th>
                        <th className="px-6 py-4">تفاصيل التنبيه</th>
                        <th className="px-6 py-4">البريد المستهدف</th>
                        <th className="px-6 py-4">النوع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {paginatedEvents.map((e) => (
                        <tr
                          key={e.id}
                          className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                        >
                          <td className="px-6 py-4 font-mono text-zinc-400">{e.ipAddress}</td>
                          <td className="px-6 py-4 text-zinc-400 font-mono">{e.date}</td>
                          <td className="px-6 py-4 font-bold text-white">{e.details}</td>
                          <td className="px-6 py-4 text-zinc-400 font-mono">{e.userEmail}</td>
                          <td className="px-6 py-4">
                            {e.type === "LOCKOUT" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                                <AlertTriangle className="size-3" /> حظر حساب
                              </span>
                            ) : e.type === "FAILED_LOGIN" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                                دخول فاشل
                              </span>
                            ) : e.type === "SUSPICIOUS_ACTIVITY" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                                نشط مريب
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                                ربط جهاز
                              </span>
                            )}
                          </td>
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
        )}

        {activeTab === "sessions" && (
          <motion.div
            key="sessions-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            <div className="text-right border-b border-zinc-900 pb-3">
              <h3 className="font-display text-lg font-bold text-amber-400">
                جلسات تسجيل الدخول النشطة حالياً
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                المستخدمون النشطون والمتصلون بالمنصة حالياً. يمكنك قطع الاتصال وإنهاء جلسة أي مستخدم.
              </p>
            </div>

            {loading ? (
              <div className="p-10 space-y-4">
                <div className="h-20 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-3xl border border-amber-500/10 bg-neutral-900/30 p-10 text-center text-zinc-500 font-bold">
                لا توجد جلسات نشطة حالياً بالمنصة
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.06)] hover:scale-[1.02] transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-900/80 pb-3">
                      <button
                        onClick={() => handleTerminateSession(s.id, s.userEmail)}
                        className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-xs font-black text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        إنهاء الجلسة
                      </button>
                      <div className="text-end min-w-0">
                        <span className="block text-sm font-bold text-white truncate" title={s.userEmail}>
                          {s.userEmail}
                        </span>
                        <span className="text-xs text-amber-400 font-bold mt-1 block truncate">{s.device}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-zinc-400">
                      <div className="flex justify-between">
                        <span className="font-bold text-white font-mono">{s.ipAddress}</span>
                        <span className="font-medium text-zinc-500">عنوان الـ IP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-white">{s.location}</span>
                        <span className="font-medium text-zinc-500">الموقع الجغرافي</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-white">{s.loginTime}</span>
                        <span className="font-medium text-zinc-500">وقت الدخول</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "devices" && (
          <motion.div
            key="devices-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            <div className="text-right border-b border-zinc-900 pb-3">
              <h3 className="font-display text-lg font-bold text-amber-400">
                الأجهزة المرتبطة بحسابات المستخدمين
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                الأجهزة الموثوقة التي سجلت دخول وتستخدم التطبيق. يمكنك إلغاء ارتباط الجهاز لإجبار المستخدم على المصادقة مجدداً.
              </p>
            </div>

            {loading ? (
              <div className="p-10 space-y-4">
                <div className="h-20 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
              </div>
            ) : devices.length === 0 ? (
              <div className="rounded-3xl border border-amber-500/10 bg-neutral-900/30 p-10 text-center text-zinc-500 font-bold">
                لا توجد أجهزة مرتبطة مسجلة حالياً
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.06)] hover:scale-[1.02] transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-900/80 pb-3">
                      <button
                        onClick={() => handleRemoveDevice(d.id, d.name)}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer"
                      >
                        إزالة الجهاز
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="text-end min-w-0">
                          <span className="block text-sm font-bold text-white truncate" title={d.name}>{d.name}</span>
                          <span className="block text-xs text-zinc-500 font-mono truncate" title={d.userEmail}>
                            {d.userEmail}
                          </span>
                        </div>
                        <span className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-400">
                          {d.type === "DESKTOP" ? (
                            <Laptop className="size-5" />
                          ) : (
                            <Phone className="size-5" />
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-zinc-400">
                      <div className="flex justify-between">
                        <span className="font-bold text-white">{d.os}</span>
                        <span className="font-medium text-zinc-500">نظام التشغيل</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-white">{d.lastUsed}</span>
                        <span className="font-medium text-zinc-500">آخر استخدام</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
