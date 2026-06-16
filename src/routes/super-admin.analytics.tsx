import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Users,
  BookOpen,
  FileText,
  Smartphone,
  Coins,
  Crown,
  RefreshCw,
  Activity,
  Laptop,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import { getPlatformAnalyticsFn } from "@/lib/api/db.functions";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/super-admin/analytics")({
  component: SuperAdminAnalytics,
});

interface AnalyticsData {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalExams: number;
  activeDevices: number;
  totalRevenue: number;
  topTeachers: any[];
}

function SuperAdminAnalytics() {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getPlatformAnalyticsFn();
      setData(res || null);
    } catch (err: any) {
      toast.error("فشل تحميل إحصائيات المنصة: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const gridColor = resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "#cbd5e1";
  const axisColor = resolvedTheme === "dark" ? "#8b949e" : "#64748b";
  const tooltipStyle = {
    backgroundColor: resolvedTheme === "dark" ? "#0d1117" : "#ffffff",
    borderColor: resolvedTheme === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0",
    borderRadius: "12px",
    color: resolvedTheme === "dark" ? "#ffffff" : "#111827",
  };

  // Mock revenue history chart
  const revenueHistory = [
    { month: "يناير", revenue: 12000 },
    { month: "فبراير", revenue: 19000 },
    { month: "مارس", revenue: 15000 },
    { month: "أبريل", revenue: 27000 },
    { month: "مايو", revenue: 35000 },
    { month: "يونيو", revenue: 42000 },
  ];

  // Mock student growth
  const studentGrowth = [
    { name: "أسبوع 1", count: 120 },
    { name: "أسبوع 2", count: 240 },
    { name: "أسبوع 3", count: 350 },
    { name: "أسبوع 4", count: 510 },
  ];

  // Mock teacher growth
  const teacherGrowth = [
    { name: "أسبوع 1", count: 3 },
    { name: "أسبوع 2", count: 6 },
    { name: "أسبوع 3", count: 8 },
    { name: "أسبوع 4", count: 12 },
  ];

  // Mock active sessions trend
  const activeSessionsTrend = [
    { hour: "08:00", sessions: 150 },
    { hour: "12:00", sessions: 280 },
    { hour: "16:00", sessions: 420 },
    { hour: "20:00", sessions: 390 },
    { hour: "00:00", sessions: 210 },
  ];

  if (loading) {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center min-h-screen bg-background"
        dir="rtl"
      >
        <div className="animate-pulse bg-secondary border border-border rounded-3xl p-8 flex flex-col items-center gap-4">
          <div className="size-10 rounded-full bg-border animate-bounce"></div>
          <div className="h-4 w-48 bg-border rounded"></div>
          <div className="h-3 w-32 bg-border rounded mt-2"></div>
        </div>
      </div>
    );
  }

  // Devices usage details
  const deviceData = [
    { name: "المكتبية (Desktop)", percent: 55, icon: Laptop },
    { name: "الهواتف (Mobile)", percent: 35, icon: Smartphone },
    { name: "اللوحية (Tablet)", percent: 10, icon: Tablet },
  ];

  return (
    <div className="space-y-6 text-end bg-transparent font-display text-foreground" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-accent/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-accent flex items-center gap-2 justify-end">
            لوحة الإحصائيات والتحليلات العامة
          </h2>
          <p className="text-xs text-muted-foreground max-w-xl">
            متابعة المؤشرات الحيوية لنمو الطلاب، نشاط المدرسين، تفاصيل المدفوعات والأجهزة النشطة على
            خوادم MOGENIX.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 hover:bg-secondary px-4 py-2 text-xs font-bold text-accent transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="size-3.5 animate-spin-slow" /> تحديث الإحصائيات
        </button>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Revenue */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm text-center space-y-1 flex flex-col justify-between">
          <div className="mx-auto size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-1">
            <Coins className="size-4" />
          </div>
          <span className="text-muted-foreground text-[10px] font-bold block">إجمالي الإيرادات</span>
          <span className="font-mono text-xl font-black text-foreground">
            {(data?.totalRevenue || 0).toLocaleString("ar-EG")}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold block">ج.م</span>
          <span className="text-[10px] font-bold text-emerald-500 block mt-2">↑ +18%</span>
        </div>

        {/* Students */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm text-center space-y-1 flex flex-col justify-between">
          <div className="mx-auto size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-1">
            <Users className="size-4" />
          </div>
          <span className="text-muted-foreground text-[10px] font-bold block">إجمالي الطلاب</span>
          <span className="font-mono text-xl font-black text-foreground">
            {data?.totalStudents || 0}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold block">طالب</span>
          <span className="text-[10px] font-bold text-emerald-500 block mt-2">↑ +12.4%</span>
        </div>

        {/* Teachers */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm text-center space-y-1 flex flex-col justify-between">
          <div className="mx-auto size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-1">
            <Crown className="size-4" />
          </div>
          <span className="text-muted-foreground text-[10px] font-bold block">المدرسين النشطين</span>
          <span className="font-mono text-xl font-black text-foreground">
            {data?.totalTeachers || 0}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold block">مدرس</span>
          <span className="text-[10px] font-bold text-emerald-500 block mt-2">↑ +5.2%</span>
        </div>

        {/* Courses */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm text-center space-y-1 flex flex-col justify-between">
          <div className="mx-auto size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-1">
            <BookOpen className="size-4" />
          </div>
          <span className="text-muted-foreground text-[10px] font-bold block">الدورات التعليمية</span>
          <span className="font-mono text-xl font-black text-foreground">
            {data?.totalCourses || 0}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold block">دورة</span>
          <span className="text-[10px] font-bold text-emerald-500 block mt-2">↑ +8.3%</span>
        </div>

        {/* Exams */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm text-center space-y-1 flex flex-col justify-between">
          <div className="mx-auto size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-1">
            <FileText className="size-4" />
          </div>
          <span className="text-muted-foreground text-[10px] font-bold block">الامتحانات النشطة</span>
          <span className="font-mono text-xl font-black text-foreground">{data?.totalExams || 0}</span>
          <span className="text-[9px] text-muted-foreground font-semibold block">امتحان</span>
          <span className="text-[10px] font-bold text-emerald-500 block mt-2">↑ +14%</span>
        </div>

        {/* Devices */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm text-center space-y-1 flex flex-col justify-between">
          <div className="mx-auto size-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-1">
            <Smartphone className="size-4" />
          </div>
          <span className="text-muted-foreground text-[10px] font-bold block">الأجهزة المتصلة</span>
          <span className="font-mono text-xl font-black text-foreground">
            {data?.activeDevices || 0}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold block">جهاز</span>
          <span className="text-[10px] font-bold text-emerald-500 block mt-2">↑ +21%</span>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Area Chart - Gold Gradient */}
        <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-black text-accent flex items-center gap-1.5 justify-end">
            <span>مخطط نمو الإيرادات الشهري (ج.م)</span>
            <TrendingUp className="size-4" />
          </h3>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueHistory}>
                <defs>
                  <linearGradient id="colorRevenueAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke={axisColor} fontSize={10} tickLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenueAnalytics)"
                  name="الأرباح"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Usage statistics */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-sm font-black text-accent justify-end flex items-center gap-1.5 mb-2">
              <span>توزيع استخدام الأجهزة بالمنصة</span>
              <Smartphone className="size-4" />
            </h3>
            <p className="text-[10px] text-muted-foreground text-right mb-6">
              تصنيف الجلسات النشطة وفقاً لنوع أنظمة تشغيل أجهزة الطلاب.
            </p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {deviceData.map((dev, i) => {
              const DevIcon = dev.icon;
              return (
                <div key={i} className="space-y-2 text-right">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-accent">{dev.percent}%</span>
                    <span className="flex items-center gap-1.5 font-bold text-foreground">
                      <span>{dev.name}</span>
                      <DevIcon className="size-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary border border-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${dev.percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Student Growth Chart */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-black text-accent justify-end flex items-center gap-1.5">
            <span>مخطط نمو الطلاب (المشتركين الجدد)</span>
            <Users className="size-4" />
          </h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentGrowth}>
                <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} name="الطلاب" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Teacher Growth Chart */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-black text-accent justify-end flex items-center gap-1.5">
            <span>معدل نمو وانضمام المدرسين</span>
            <Crown className="size-4" />
          </h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherGrowth}>
                <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} name="المدرسين الجدد" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Sessions trend */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-sm font-black text-accent justify-end flex items-center gap-1.5">
            <span>إحصائيات الجلسات النشطة (متوسط ساعي)</span>
            <Activity className="size-4" />
          </h3>
          <div className="h-56 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSessionsTrend}>
                <XAxis dataKey="hour" stroke={axisColor} fontSize={10} tickLine={false} />
                <YAxis stroke={axisColor} fontSize={10} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  name="الجلسات النشطة"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
