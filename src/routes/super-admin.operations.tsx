import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Activity,
  Users,
  AlertTriangle,
  RefreshCw,
  Server,
  Wifi,
  Mail,
  ShieldAlert,
  Play,
  Terminal,
  Monitor,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/super-admin/operations")({
  component: SuperAdminOperations,
});

interface LogItem {
  id: string;
  time: string;
  ip: string;
  user: string;
  action: string;
}

interface ErrorItem {
  id: string;
  time: string;
  message: string;
  service: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

function SuperAdminOperations() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // System Stats states with dynamic fluctuation
  const [stats, setStats] = useState({
    activeUsers: 342,
    activeStreams: 4,
    bannedDevices: 18,
    cpuUsage: 34,
    ramUsage: 58,
    socketStatus: "ONLINE" as "ONLINE" | "OFFLINE",
    emailStatus: "ONLINE" as "ONLINE" | "OFFLINE",
    bunnyStatus: "ONLINE" as "ONLINE" | "OFFLINE",
  });

  // Simulated metrics history for charts
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);

  // Simulated logs
  const [logins, setLogins] = useState<LogItem[]>([
    {
      id: "1",
      time: "منذ دقيقة",
      ip: "197.34.120.45",
      user: "أحمد علي (طالب)",
      action: "تسجيل دخول - Chrome (Windows)",
    },
    {
      id: "2",
      time: "منذ 3 دقائق",
      ip: "41.223.90.12",
      user: "أ. محمد عبد الله (مدرس)",
      action: "تسجيل دخول - Safari (macOS)",
    },
    {
      id: "3",
      time: "منذ 7 دقائق",
      ip: "197.38.15.110",
      user: "خالد سعيد (طالب)",
      action: "تسجيل دخول - Chrome (Android)",
    },
    {
      id: "4",
      time: "منذ 10 دقائق",
      ip: "102.43.5.76",
      user: "سارة أحمد (طالب)",
      action: "تسجيل دخول - Safari (iOS)",
    },
  ]);

  const [errors, setErrors] = useState<ErrorItem[]>([
    {
      id: "e1",
      time: "منذ دقيقتين",
      message: "Timeout during payload signature verification",
      service: "Bunny Stream Webhook",
      severity: "MEDIUM",
    },
    {
      id: "e2",
      time: "منذ 15 دقيقة",
      message: "Failed to send verification code email (SMTP timeout)",
      service: "Email API",
      severity: "HIGH",
    },
    {
      id: "e3",
      time: "منذ 40 دقيقة",
      message: "WebSocket connection dropped by client unexpectedly",
      service: "Socket Server",
      severity: "LOW",
    },
  ]);

  const runDiagnostics = async () => {
    setRefreshing(true);
    // Simulate API fetch delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStats((prev) => ({
      ...prev,
      activeUsers: Math.floor(300 + Math.random() * 80),
      activeStreams: Math.floor(2 + Math.random() * 5),
      cpuUsage: Math.floor(20 + Math.random() * 30),
      ramUsage: Math.floor(50 + Math.random() * 15),
      socketStatus: Math.random() > 0.05 ? "ONLINE" : "OFFLINE",
      emailStatus: Math.random() > 0.05 ? "ONLINE" : "OFFLINE",
      bunnyStatus: Math.random() > 0.05 ? "ONLINE" : "OFFLINE",
    }));
    setRefreshing(false);
    toast.success("تم تحديث الفحوصات الفنية لمركز العمليات بنجاح!");
  };

  useEffect(() => {
    // Generate initial history
    const history = Array.from({ length: 10 }).map((_, i) => ({
      time: `${10 - i}ث`,
      cpu: Math.floor(20 + Math.random() * 30),
      ram: Math.floor(50 + Math.random() * 10),
    }));
    setCpuHistory(history);
    setLoading(false);

    // Dynamic fluctuation simulator
    const interval = setInterval(() => {
      setStats((prev) => {
        const nextCpu = Math.max(
          10,
          Math.min(95, prev.cpuUsage + Math.floor(Math.random() * 11) - 5),
        );
        const nextRam = Math.max(
          40,
          Math.min(95, prev.ramUsage + Math.floor(Math.random() * 5) - 2),
        );

        setCpuHistory((curr) => {
          const nextHistory = [...curr.slice(1), { time: "0ث", cpu: nextCpu, ram: nextRam }];
          return nextHistory.map((item, idx) => ({
            ...item,
            time: idx === 9 ? "الآن" : `${9 - idx}ث`,
          }));
        });

        return {
          ...prev,
          activeUsers: Math.max(250, prev.activeUsers + Math.floor(Math.random() * 7) - 3),
          cpuUsage: nextCpu,
          ramUsage: nextRam,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center bg-black min-h-screen text-amber-500"
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse bg-neutral-800 rounded-3xl p-8 flex flex-col items-center gap-4">
            <div className="size-10 rounded-full bg-neutral-700 animate-bounce"></div>
            <div className="h-4 w-48 bg-neutral-700 rounded"></div>
            <div className="h-3 w-32 bg-neutral-700 rounded mt-2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 text-end p-6 bg-gradient-to-br from-black via-zinc-950 to-neutral-900 min-h-screen text-white rounded-3xl"
      dir="rtl"
    >
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            مركز العمليات الفنية والشبكة
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            مراقبة لحظية لاستهلاك موارد الخادم، أجهزة الشبكة المتصلة، البث المباشر النشط، وحالة
            الخوادم الخارجية ومزودي الخدمات المتصلين بـ MOGENIX.
          </p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/10 bg-neutral-900 hover:bg-neutral-850 px-4 py-2.5 text-xs font-bold text-amber-400 transition-all cursor-pointer shadow-md disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث العمليات
        </button>
      </div>

      {/* Services Status Checks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bunny Stream */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(251,191,36,.08)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stats.bunnyStatus === "ONLINE" ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
            )}
            <span
              className={`text-[10px] font-bold ${stats.bunnyStatus === "ONLINE" ? "text-emerald-400" : "text-red-400"}`}
            >
              {stats.bunnyStatus === "ONLINE" ? "نشط ومستقر" : "معطل"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <span className="font-bold text-xs text-white block">حالة Bunny Stream</span>
              <span className="text-[9px] text-zinc-500">مشغل البث ورفع الفيديوهات</span>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Play className="size-4" />
            </div>
          </div>
        </div>

        {/* Email Gateway */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(251,191,36,.08)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stats.emailStatus === "ONLINE" ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
            )}
            <span
              className={`text-[10px] font-bold ${stats.emailStatus === "ONLINE" ? "text-emerald-400" : "text-red-400"}`}
            >
              {stats.emailStatus === "ONLINE" ? "متصل" : "خطأ اتصال SMTP"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <span className="font-bold text-xs text-white block">حالة البريد الإلكتروني</span>
              <span className="text-[9px] text-zinc-500">بوابة إرسال رسائل التحقق</span>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Mail className="size-4" />
            </div>
          </div>
        </div>

        {/* Socket Server */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(251,191,36,.08)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {stats.socketStatus === "ONLINE" ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
            )}
            <span
              className={`text-[10px] font-bold ${stats.socketStatus === "ONLINE" ? "text-emerald-400" : "text-red-400"}`}
            >
              {stats.socketStatus === "ONLINE" ? "متصل (WebSocket)" : "فشل مزامنة"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <span className="font-bold text-xs text-white block">حالة Socket Server</span>
              <span className="text-[9px] text-zinc-500">مزامنة البيانات الفورية والدردشة</span>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Wifi className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Resource Utilizations & Numbers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: System Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
            <h3 className="font-display text-sm font-black text-amber-400 flex items-center gap-2 justify-end">
              <span>مخطط استهلاك موارد الخادم اللحظي (%)</span>
              <Cpu className="size-4" />
            </h3>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-neutral-900/50 border border-zinc-900 p-4 rounded-2xl">
                <span className="text-[10px] text-zinc-500 block">المعالج (CPU)</span>
                <span className="font-mono text-3xl font-black text-amber-400">
                  {stats.cpuUsage}%
                </span>
              </div>
              <div className="bg-neutral-900/50 border border-zinc-900 p-4 rounded-2xl">
                <span className="text-[10px] text-zinc-500 block">الذاكرة (RAM)</span>
                <span className="font-mono text-3xl font-black text-amber-400">
                  {stats.ramUsage}%
                </span>
              </div>
            </div>

            <div className="h-56 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cpuHistory}>
                  <defs>
                    <linearGradient id="cpuColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#71717a" fontSize={9} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={9} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpuColor)"
                    name="المعالج CPU"
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    stroke="#d97706"
                    strokeWidth={1.5}
                    fill="none"
                    name="الذاكرة RAM"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Key Stats */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
            <h3 className="font-display text-sm font-black text-amber-400 flex items-center gap-2 justify-end">
              <span>مؤشرات التشغيل الكلية</span>
              <Activity className="size-4" />
            </h3>

            <div className="space-y-4">
              {/* Connected Users */}
              <div className="flex items-center justify-between bg-neutral-900/30 p-3.5 border border-zinc-900 rounded-2xl">
                <span className="font-mono text-lg font-black text-amber-500">
                  {stats.activeUsers}
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="text-end">
                    <span className="font-bold text-xs text-white block">المتصلون الآن</span>
                    <span className="text-[9px] text-zinc-500">جلسات نشطة متفاعلة</span>
                  </div>
                  <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Users className="size-4" />
                  </div>
                </div>
              </div>

              {/* Active streams */}
              <div className="flex items-center justify-between bg-neutral-900/30 p-3.5 border border-zinc-900 rounded-2xl">
                <span className="font-mono text-lg font-black text-amber-500">
                  {stats.activeStreams}
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="text-end">
                    <span className="font-bold text-xs text-white block">البثوث الحالية</span>
                    <span className="text-[9px] text-zinc-500">حصص بث مباشر نشطة</span>
                  </div>
                  <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                    <Play className="size-4" />
                  </div>
                </div>
              </div>

              {/* Blocked Devices */}
              <div className="flex items-center justify-between bg-neutral-900/30 p-3.5 border border-zinc-900 rounded-2xl">
                <span className="font-mono text-lg font-black text-red-500">
                  {stats.bannedDevices}
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="text-end">
                    <span className="font-bold text-xs text-white block">الأجهزة المحظورة</span>
                    <span className="text-[9px] text-zinc-500">تم رصد تعدي حد الجلسات</span>
                  </div>
                  <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    <ShieldAlert className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent logins */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
          <h3 className="font-display text-sm font-black text-amber-400 flex items-center gap-2 justify-end">
            <span>آخر عمليات تسجيل الدخول الآمنة</span>
            <Monitor className="size-4" />
          </h3>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {logins.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-neutral-900/30 border border-zinc-900/60 p-3 rounded-2xl text-xs"
              >
                <span className="font-mono text-[10px] text-zinc-500">{item.ip}</span>
                <div className="text-end">
                  <div className="font-bold text-zinc-200">{item.user}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {item.action} • {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Error Logs */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
          <h3 className="font-display text-sm font-black text-amber-400 flex items-center gap-2 justify-end">
            <span>سجل أخطاء النظام الأخيرة (Logs)</span>
            <Terminal className="size-4" />
          </h3>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {errors.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between items-start border p-3 rounded-2xl text-xs ${
                  item.severity === "HIGH"
                    ? "bg-red-500/5 border-red-500/20"
                    : item.severity === "MEDIUM"
                      ? "bg-amber-500/5 border-amber-500/15"
                      : "bg-neutral-900/30 border-zinc-900"
                }`}
              >
                <span
                  className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono ${
                    item.severity === "HIGH"
                      ? "bg-red-500/15 text-red-400"
                      : item.severity === "MEDIUM"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {item.severity}
                </span>
                <div className="text-end flex-1 pl-4">
                  <div className="font-mono text-zinc-300 font-semibold break-all text-[11px]">
                    {item.message}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    المصدر: {item.service} • {item.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
