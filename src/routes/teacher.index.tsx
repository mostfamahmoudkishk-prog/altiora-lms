import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DollarSign,
  Users,
  BookOpen,
  Star,
  Percent,
  ArrowUpRight,
  Play,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/teacher/")({
  component: TeacherHome,
});

const revenueData = [
  { name: "يناير", views: 2400, watchTime: 400, revenue: 12000 },
  { name: "فبراير", views: 1398, watchTime: 300, revenue: 15000 },
  { name: "مارس", views: 9800, watchTime: 800, revenue: 18000 },
  { name: "أبريل", views: 3908, watchTime: 200, revenue: 24000 },
  { name: "مايو", views: 4800, watchTime: 900, revenue: 32000 },
  { name: "يونيو", views: 3800, watchTime: 700, revenue: 45820 },
];

const bestLessons = [
  { name: "مقدمة البرمجة", views: 1200 },
  { name: "المتغيرات وأنواع البيانات", views: 980 },
  { name: "الدوال والتكرار", views: 860 },
  { name: "مفاهيم OOP", views: 720 },
  { name: "إدارة قواعد البيانات", views: 600 },
];

const completionPercents = [
  { name: "مكتمل", value: 72 },
  { name: "غير مكتمل", value: 28 },
];

const COLORS = ["#0055ff", "#e5e7eb"];

function TeacherHome() {
  const stats = [
    {
      label: "إجمالي الإيرادات",
      value: "45,820 ج.م",
      icon: DollarSign,
      color: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: "عدد الطلاب",
      value: "1,420 طالب",
      icon: Users,
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      label: "عدد الدورات",
      value: "8 دورات",
      icon: BookOpen,
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      label: "متوسط التقييم",
      value: "4.9 / 5",
      icon: Star,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "نسبة إكمال الطلاب",
      value: "72%",
      icon: Percent,
      color: "text-indigo-500 bg-indigo-500/10",
    },
  ];

  const activities = [
    {
      user: "محمد أحمد",
      action: "أكمل درس 'المتغيرات وأنواع البيانات'",
      time: "منذ دقيقتين",
      type: "lesson",
    },
    {
      user: "سارة خالد",
      action: "اشتركت في دورة 'أساسيات لغة JavaScript'",
      time: "منذ ساعة",
      type: "enroll",
    },
    {
      user: "محمود علي",
      action: "أضاف تقييمًا 5 نجوم لدورة 'تطوير الويب'",
      time: "منذ ساعتين",
      type: "rating",
    },
    {
      user: "رنا يوسف",
      action: "أرسلت سؤالاً في بنك الاختبارات",
      time: "منذ 4 ساعات",
      type: "question",
    },
  ];

  return (
    <div className="space-y-8 text-end">
      {/* Welcome banner */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-card md:flex-row md:items-center">
        <Link
          to="/teacher/courses"
          search={{ content: undefined }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all self-end md:self-auto"
        >
          <span>إدارة دوراتي</span>
          <ArrowUpRight className="size-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            مرحباً بك مجدداً، أستاذ أحمد! 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            هذا هو ملخص أداء دوراتك وإحصائيات الطلاب لشهر يونيو 2026.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((st, i) => {
          const Icon = st.icon;
          return (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <span className={`rounded-xl p-2.5 ${st.color}`}>
                  <Icon className="size-5" />
                </span>
                <span className="text-xs text-muted-foreground">{st.label}</span>
              </div>
              <div className="mt-4 text-start font-display text-xl font-bold text-foreground md:text-2xl">
                {st.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* View and watch time */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h3 className="mb-6 font-display text-lg font-bold text-foreground">
            تحليلات المشاهدة والوقت
          </h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="عدد المشاهدات"
                  stroke="var(--primary)"
                  fillOpacity={1}
                  fill="url(#colorViews)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="watchTime"
                  name="وقت المشاهدة (ساعة)"
                  stroke="var(--accent)"
                  fill="none"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion rates */}
        <div className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-6 font-display text-lg font-bold text-foreground">نسبة إكمال الطلاب</h3>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative size-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionPercents}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="var(--primary)" />
                    <Cell fill="var(--muted)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-bold text-foreground">72%</span>
                <span className="text-xs text-muted-foreground">نسبة الإكمال</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-primary" />
              <span>مكتمل</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-muted" />
              <span>غير مكتمل</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Best lessons */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-6 font-display text-lg font-bold text-foreground">
            أفضل الدروس مشاهدة
          </h3>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestLessons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="views" name="المشاهدات" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activities */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-bold text-foreground">آخر النشاطات</h3>
          <div className="divide-y divide-border">
            {activities.map((act, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
              >
                <span className="text-xs text-muted-foreground">{act.time}</span>
                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <div className="text-sm font-bold text-foreground">{act.user}</div>
                    <div className="text-xs text-muted-foreground">{act.action}</div>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                    {act.type === "lesson" ? (
                      <CheckCircle className="size-4" />
                    ) : act.type === "enroll" ? (
                      <Play className="size-4" />
                    ) : (
                      <Star className="size-4" />
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
