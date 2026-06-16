import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, Clock, Award, PlayCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherCourseAnalyticsFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/teacher/statistics")({
  component: TeacherStatistics,
});

const topStudents = [
  { name: "يوسف خالد محمود", rate: "100%", score: "98%", time: "24 ساعة" },
  { name: "أحمد محمود حسن", rate: "85%", score: "92%", time: "18 ساعة" },
  { name: "رانيا كمال مصطفى", rate: "92%", score: "90%", time: "21 ساعة" },
  { name: "هادي فايز لطيف", rate: "88%", score: "89%", time: "19 ساعة" },
];

function TeacherStatistics() {
  const [activeTab, setActiveTab] = useState<"rates" | "watch" | "lessons" | "students">("rates");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    mostWatched: [],
    leastWatched: [],
    topCourses: [],
    stats: { avgCompletion: 0, avgWatchTime: 0, completionRate: 0 },
  });

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      getTeacherCourseAnalyticsFn({ data: { email: user.email } })
        .then((res: any) => {
          setAnalytics(
            res || {
              mostWatched: [],
              leastWatched: [],
              topCourses: [],
              stats: { avgCompletion: 0, avgWatchTime: 0, completionRate: 0 },
            },
          );
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-foreground font-semibold">
        جاري تحميل تحليلات المشاهدة والطلاب...
      </div>
    );
  }

  const completionRateData = analytics.topCourses.map((c: any) => ({
    course: c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title,
    rate: c.avgCompletion,
  }));

  // Dummy trend mapping for area chart based on avg watch time
  const watchTimeTrend = [
    { name: "الأسبوع 1", hours: Math.round((analytics.stats.avgWatchTime * 0.4) / 60) },
    { name: "الأسبوع 2", hours: Math.round((analytics.stats.avgWatchTime * 0.7) / 60) },
    { name: "الأسبوع 3", hours: Math.round((analytics.stats.avgWatchTime * 0.5) / 60) },
    { name: "الأسبوع 4", hours: Math.round((analytics.stats.avgWatchTime * 0.9) / 60) },
    { name: "الأسبوع 5", hours: Math.round((analytics.stats.avgWatchTime * 0.8) / 60) },
    { name: "الأسبوع 6", hours: Math.round(analytics.stats.avgWatchTime / 60) },
  ];

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          تحليلات تفصيلية عن أداء دوراتك والطلاب المتفاعلين
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          إحصائيات الأداء والمشاهدات
        </h2>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<Clock className="size-5 text-primary" />}
          label="متوسط وقت المشاهدة"
          value={`${Math.round(analytics.stats.avgWatchTime / 60)} دقيقة`}
          desc="متوسط الوقت الذي يقضيه الطالب للمحاضرة"
        />
        <StatsCard
          icon={<TrendingUp className="size-5 text-accent" />}
          label="متوسط إكمال المحاضرات"
          value={`${analytics.stats.avgCompletion}%`}
          desc="نسبة مشاهدة المحتوى الإجمالية للطلاب"
        />
        <StatsCard
          icon={<BarChart3 className="size-5 text-purple-600" />}
          label="معدل إكمال المنهج"
          value={`${analytics.stats.completionRate}%`}
          desc="الطلاب الذين شاهدوا 95% أو أكثر"
        />
        <StatsCard
          icon={<Award className="size-5 text-emerald-600" />}
          label="أفضل الدورات أداءً"
          value={analytics.topCourses[0]?.title || "لا يوجد دورات"}
          desc="الدورة الأعلى اشتراكاً وتفاعلاً"
        />
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap justify-end gap-2 rounded-xl bg-secondary/50 p-1">
        <button
          onClick={() => setActiveTab("students")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "students"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Award className="size-3.5" /> الطلاب المتفوقون
          </span>
        </button>
        <button
          onClick={() => setActiveTab("lessons")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "lessons"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <PlayCircle className="size-3.5" /> أداء الدروس
          </span>
        </button>
        <button
          onClick={() => setActiveTab("watch")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "watch"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" /> تطور وقت المشاهدة
          </span>
        </button>
        <button
          onClick={() => setActiveTab("rates")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "rates"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5" /> نسب إكمال الطلاب
          </span>
        </button>
      </div>

      {/* Main charts content area */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {activeTab === "rates" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              نسب إكمال الطلاب لكل دورة
            </h3>
            <p className="text-xs text-muted-foreground">
              معدل الإنجاز يوضح متوسط النسبة المئوية للمحاضرات التي شاهدها الطلاب.
            </p>
            {completionRateData.length > 0 ? (
              <div className="h-80 w-full pt-4" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={completionRateData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="course" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis unit="%" stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar
                      dataKey="rate"
                      name="معدل الإكمال"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">
                لا توجد بيانات دورات كافية بعد.
              </p>
            )}
          </div>
        )}

        {activeTab === "watch" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              تطور وقت المشاهدة التقريبي
            </h3>
            <p className="text-xs text-muted-foreground">
              يوضح إجمالي عدد الدقائق المشاهدة لمحاضراتك تدريجياً.
            </p>
            <div className="h-80 w-full pt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={watchTimeTrend}>
                  <defs>
                    <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis unit=" د" stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip formatter={(value) => `${value} دقيقة`} />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    name="وقت المشاهدة"
                    stroke="var(--accent)"
                    fill="url(#watchGrad)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "lessons" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right">
            {/* Top Lessons Chart */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold text-foreground">
                الدروس الأكثر مشاهدة وتفاعلاً
              </h3>
              <p className="text-[11px] text-muted-foreground">
                الدروس الخمسة الأولى التي حققت أعلى معدلات نقرات تشغيل.
              </p>
              {analytics.mostWatched.length > 0 ? (
                <div className="h-80 w-full pt-4" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.mostWatched.map((l: any) => ({
                        name: l.title.length > 15 ? l.title.slice(0, 15) + "..." : l.title,
                        views: l.playCount,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="var(--border)"
                      />
                      <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        stroke="var(--muted-foreground)"
                        fontSize={10}
                        width={100}
                      />
                      <Tooltip formatter={(value) => `${value} نقرات`} />
                      <Bar
                        dataKey="views"
                        name="المشاهدات"
                        fill="var(--primary)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  لا توجد تفاعلات مسجلة بعد.
                </p>
              )}
            </div>

            {/* Least Lessons List */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-bold text-foreground">
                الدروس الأقل تفاعلاً ومتابعة
              </h3>
              <p className="text-[11px] text-muted-foreground">
                الدروس الخمسة الأقل تفاعلاً التي قد تحتاج إلى تحديث أو تحسين المضمون.
              </p>
              <div className="space-y-2 pt-4">
                {analytics.leastWatched.length > 0 ? (
                  analytics.leastWatched.map((l: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-4 py-3 text-xs"
                    >
                      <span className="font-bold text-destructive">تفاعلات: {l.playCount}</span>
                      <div className="text-end">
                        <div className="font-bold text-foreground">{l.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {l.courseTitle}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    لا توجد بيانات كافية.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              الطلاب المتفوقون (الأعلى تفاعلاً وإنجازاً)
            </h3>
            <p className="text-xs text-muted-foreground">
              الطلاب الذين حققوا أعلى نتائج في الواجبات والامتحانات وأكملوا المقاطع.
            </p>

            <div className="overflow-x-auto pt-2">
              <table className="w-full border-collapse text-end text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                    <th className="px-5 py-4 text-center">الوقت المخصص</th>
                    <th className="px-5 py-4 text-center">متوسط الدرجات</th>
                    <th className="px-5 py-4 text-center">نسبة إكمال المنهج</th>
                    <th className="px-5 py-4 text-right">اسم الطالب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topStudents.map((st, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10">
                      <td className="px-5 py-3.5 text-center text-muted-foreground">{st.time}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-success">{st.score}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {st.rate}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground">
                        {st.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
  desc,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card text-end space-y-2">
      <div className="flex items-center justify-between">
        <span className="rounded-xl bg-secondary p-2.5">{icon}</span>
        <span className="text-xs font-bold text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-bold text-foreground truncate">{value}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </div>
  );
}
