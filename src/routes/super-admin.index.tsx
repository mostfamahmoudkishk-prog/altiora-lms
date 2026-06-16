import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Users,
  Activity,
  Coins,
  ShieldAlert,
  Cpu,
  PlusCircle,
  Ticket,
  BellRing,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDashboardStatsFn } from "@/lib/api/db.functions";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/super-admin/")({
  component: SuperAdminIndex,
});

const dauTrend = [
  { day: "06-08", dau: 920 },
  { day: "06-09", dau: 1100 },
  { day: "06-10", dau: 1050 },
  { day: "06-11", dau: 1250 },
  { day: "06-12", dau: 1420 },
  { day: "06-13", dau: 1530 },
];

const revenueMonthly = [
  { month: "يناير", amount: 45000 },
  { month: "فبراير", amount: 52000 },
  { month: "مارس", amount: 68000 },
  { month: "أبريل", amount: 74000 },
  { month: "مايو", amount: 95000 },
  { month: "يونيو", amount: 125000 },
];

function SuperAdminIndex() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalRevenue: 0,
    activeSessionsCount: 0,
    pendingSecurityAlerts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStatsFn()
      .then((res) => {
        setStatsData(res);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const gridColor = resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "#cbd5e1";
  const axisColor = resolvedTheme === "dark" ? "#8b949e" : "#64748b";
  const tooltipStyle = {
    backgroundColor: resolvedTheme === "dark" ? "#0d1117" : "#ffffff",
    borderColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0",
    borderRadius: "12px",
    color: resolvedTheme === "dark" ? "#ffffff" : "#111827",
  };

  const stats = [
    {
      label: "إجمالي المستخدمين",
      value: loading ? 0 : statsData.totalUsers,
      suffix: "مستخدم",
      icon: Users,
      change: "+12.4%",
      isPositive: true,
    },
    {
      label: "الجلسات النشطة",
      value: loading ? 0 : statsData.activeSessionsCount,
      suffix: "جلسة",
      icon: Activity,
      change: "+8.2%",
      isPositive: true,
    },
    {
      label: "أرباح المنصة",
      value: loading ? 0 : statsData.totalRevenue,
      suffix: "ج.م",
      icon: Coins,
      change: "+15.1%",
      isPositive: true,
    },
    {
      label: "التنبيهات الأمنية",
      value: loading ? 0 : statsData.pendingSecurityAlerts,
      suffix: "تنبيه",
      icon: ShieldAlert,
      change: statsData.pendingSecurityAlerts > 0 ? "+2%" : "0%",
      isPositive: false,
    },
  ];

  const quickActions = [
    {
      title: "إضافة مدرس",
      desc: "تسجيل حساب معلم وصلاحياته",
      icon: PlusCircle,
      action: () => navigate({ to: "/super-admin/teachers" }),
    },
    {
      title: "إضافة طالب",
      desc: "تسجيل يدوي لطالب جديد بالمسارات",
      icon: Users,
      action: () => navigate({ to: "/super-admin/students" }),
    },
    {
      title: "إنشاء كوبون",
      desc: "توليد كود خصم وتفعيل خطط هويات",
      icon: Ticket,
      action: () => navigate({ to: "/super-admin/branding" }),
    },
    {
      title: "إرسال إشعار",
      desc: "بث تنبيه عام لشرائح المستخدمين",
      icon: BellRing,
      action: () => navigate({ to: "/super-admin/notifications" }),
    },
    {
      title: "عرض الأرباح",
      desc: "التقارير المالية والتحليلات البيانية",
      icon: TrendingUp,
      action: () => navigate({ to: "/super-admin/analytics" }),
    },
  ];

  const timelineEvents = [
    {
      time: "منذ دقيقة",
      desc: "تم إنشاء دورة جديدة بالمنصة",
      detail: "دورة الكيمياء العضوية - أ. أحمد خالد",
      type: "course",
    },
    {
      time: "منذ 5 دقائق",
      desc: "تم تسجيل طالب جديد بالبوابة",
      detail: "الطالب عمر علي - سجل عبر كود الدفع",
      type: "student",
    },
    {
      time: "منذ 20 دقيقة",
      desc: "تم حظر جهاز مستخدم تلقائياً",
      detail: "تخطي الحد الأقصى للجلسات المتزامنة (IP: 197.34.12.9)",
      type: "ban",
    },
  ];

  return (
    <div className="space-y-6 text-end bg-transparent font-display">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-accent/10 blur-3xl"></div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <span className="text-xs font-bold text-accent">
              مساعد الذكاء الاصطناعي Altiora AI
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              مستعد للمساعدة في تحليل التقارير وضبط أمان الجلسات.
            </p>
          </div>
          <div className="size-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <Cpu className="size-4 animate-pulse" />
          </div>
        </div>

        <div className="text-end">
          <h1 className="font-display text-xl font-black text-foreground">
            مرحباً بك في لوحة التحكم العليا
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            البوابة الإدارية والأمنية الكلية لإدارة خوادم ومنصة MOGENIX.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st, idx) => {
          const Icon = st.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-2xl bg-secondary border border-border p-2.5 text-accent">
                  <Icon className="size-4.5" />
                </span>
                <span className="text-[11px] text-muted-foreground font-bold">{st.label}</span>
              </div>
              <div className="mt-4 text-start font-mono text-4xl font-black text-foreground">
                {loading ? "..." : st.value.toLocaleString("ar-EG")}
                {!loading && (
                  <span className="text-[11px] text-muted-foreground font-display font-semibold mr-1">
                    {st.suffix}
                  </span>
                )}
              </div>
              <div className="mt-2 text-start text-[10px] font-bold text-emerald-500 flex items-center gap-1 justify-start">
                <span>↑ {st.change}</span>
                <span className="text-muted-foreground font-normal">نسبة التغير</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Panel */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-display text-sm font-black text-accent mb-4 flex items-center justify-end gap-2">
          <span>العمليات والروابط السريعة</span>
          <Activity className="size-4" />
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {quickActions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                onClick={act.action}
                className="group flex flex-col justify-between items-end border border-border hover:border-accent/40 bg-secondary/30 hover:bg-secondary/70 p-4 rounded-2xl text-right transition-all hover:scale-[1.03] cursor-pointer shadow-sm"
              >
                <div className="size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-background transition-all mb-4">
                  <Icon className="size-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-foreground block group-hover:text-accent transition-colors">
                    {act.title}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-1">{act.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Graphs & Activity Timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active sessions evolution graph */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="font-display text-sm font-black text-accent flex items-center justify-end gap-1.5">
            <span>تطور نشاط الجلسات اليومي</span>
            <TrendingUp className="size-4" />
          </h3>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dauTrend}>
                <defs>
                  <linearGradient id="colorDau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke={axisColor} fontSize={10} tickLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="dau"
                  name="النشطون يومياً"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDau)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Timeline */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col">
          <h3 className="font-display text-sm font-black text-accent flex items-center justify-end gap-1.5">
            <span>سجل العمليات الأخير (Timeline)</span>
            <Clock className="size-4" />
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-64 pr-1 text-right">
            {timelineEvents.map((evt, i) => (
              <div key={i} className="flex gap-3 items-start justify-end text-xs">
                <div className="flex-1 space-y-0.5">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="font-bold text-foreground">{evt.desc}</span>
                    <span className="text-[9px] text-muted-foreground">{evt.time}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{evt.detail}</p>
                </div>
                <div className="mt-1 size-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue monthly graph */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-display text-sm font-black text-accent flex items-center justify-end gap-1.5">
          <span>مقارنة الأرباح الشهرية الكلية</span>
          <Coins className="size-4" />
        </h3>
        <div className="h-60 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueMonthly}>
              <XAxis dataKey="month" stroke={axisColor} fontSize={10} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="amount" name="الأرباح" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
