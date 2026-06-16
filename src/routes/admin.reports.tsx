import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, TrendingUp, Users, DollarSign, Award } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReports,
});

const revenueTrend = [
  { month: "يناير", revenue: 45000, expenses: 15000 },
  { month: "فبراير", revenue: 52000, expenses: 18000 },
  { month: "مارس", revenue: 68000, expenses: 22000 },
  { month: "أبريل", revenue: 74000, expenses: 24000 },
  { month: "مايو", revenue: 95000, expenses: 31000 },
  { month: "يونيو", revenue: 125000, expenses: 40000 },
];

const topCoursesData = [
  { name: "Epic Grammer", sales: 450 },
  { name: "أساسيات الرياضيات", sales: 320 },
  { name: "PrePre IQ Intermediate", sales: 280 },
  { name: "ليالي الامتحان كيمياء", sales: 180 },
  { name: "عضوية الكيمياء", sales: 140 },
];

const topInstructorsData = [
  { name: "أحمد علي", students: 1420, courses: 2 },
  { name: "إبرام رفيق", students: 850, courses: 2 },
  { name: "منى عبد المجيد", students: 680, courses: 1 },
];

const retentionRateData = [
  { month: "الشهر 1", rate: 100 },
  { month: "الشهر 2", rate: 94 },
  { month: "الشهر 3", rate: 89 },
  { month: "الشهر 4", rate: 87 },
  { month: "الشهر 5", rate: 83 },
  { month: "الشهر 6", rate: 82 },
];

const completionRateData = [
  { month: "يناير", rate: 68 },
  { month: "فبراير", rate: 70 },
  { month: "مارس", rate: 71 },
  { month: "أبريل", rate: 72 },
  { month: "مايو", rate: 75 },
  { month: "يونيو", rate: 78 },
];

function AdminReports() {
  const [activeReport, setActiveReport] = useState<
    "revenue" | "courses" | "instructors" | "retention" | "completion"
  >("revenue");

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          تحليلات ورسوم بيانية حول المبيعات ومشاركة الطلاب والنمو
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          التقارير والإحصائيات العامة
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-end gap-2 rounded-xl bg-secondary/50 p-1">
        <button
          onClick={() => setActiveReport("completion")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeReport === "completion"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          معدلات الإكمال
        </button>
        <button
          onClick={() => setActiveReport("retention")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeReport === "retention"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          نسب الاحتفاظ بالطلاب
        </button>
        <button
          onClick={() => setActiveReport("instructors")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeReport === "instructors"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          أفضل المعلمين
        </button>
        <button
          onClick={() => setActiveReport("courses")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeReport === "courses"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          أفضل الكورسات مبيعاً
        </button>
        <button
          onClick={() => setActiveReport("revenue")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
            activeReport === "revenue"
              ? "bg-card text-primary shadow-sm"
              : "text-foreground/80 hover:bg-card/40"
          }`}
        >
          التحليلات المالية
        </button>
      </div>

      {/* Report view details */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {activeReport === "revenue" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              تحليلات الأرباح والتدفقات النقدية (الإيرادات والمصروفات)
            </h3>
            <p className="text-xs text-muted-foreground">
              يوضح التطور المالي للنصف الأول من عام 2026.
            </p>
            <div className="h-80 w-full pt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis unit=" ج" stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip formatter={(value) => `${value} ج.م`} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="إجمالي الإيرادات"
                    stroke="var(--primary)"
                    fill="url(#revGrad)"
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="المدفوعات والمستخلصات"
                    stroke="var(--accent)"
                    fill="none"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeReport === "courses" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              الكورسات الخمسة الأعلى مبيعاً
            </h3>
            <p className="text-xs text-muted-foreground">
              مجموع مبيعات الاشتراكات لكل كورس خلال الربع الحالي.
            </p>
            <div className="h-80 w-full pt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCoursesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip />
                  <Bar
                    dataKey="sales"
                    name="المبيعات (الاشتراكات)"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeReport === "instructors" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              ترتيب المعلمين بناءً على أعداد الطلاب النشطين
            </h3>
            <p className="text-xs text-muted-foreground">
              تقرير إجمالي الطلاب المسجلين بالدورات التابعة لكل معلم.
            </p>

            <div className="overflow-x-auto pt-2">
              <table className="w-full border-collapse text-end text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                    <th className="px-5 py-4">عدد الدورات المسندة</th>
                    <th className="px-5 py-4">إجمالي الطلاب</th>
                    <th className="px-5 py-4">اسم المعلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topInstructorsData.map((inst, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10">
                      <td className="px-5 py-3.5 text-muted-foreground">{inst.courses} دورات</td>
                      <td className="px-5 py-3.5 font-bold text-primary">
                        {inst.students} طالب نشط
                      </td>
                      <td className="px-5 py-3.5 font-bold text-foreground">{inst.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReport === "retention" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              نسبة الاحتفاظ بالطلاب (Student Retention Rate)
            </h3>
            <p className="text-xs text-muted-foreground">
              يوضح نسبة استمرار الطالب بالمنصة وتسجيله بكورسات جديدة شهراً بعد شهر.
            </p>
            <div className="h-80 w-full pt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionRateData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis unit="%" stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="نسبة الاحتفاظ"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeReport === "completion" && (
          <div className="space-y-4">
            <h3 className="font-display text-base font-bold text-foreground">
              معدلات إكمال المقررات للطلاب نشاطاً بعد نشاط
            </h3>
            <p className="text-xs text-muted-foreground">
              متوسط النسبة المئوية للمحاضرات المكتملة لجميع الدورات شهرياً.
            </p>
            <div className="h-80 w-full pt-4" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionRateData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis unit="%" stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="معدل الإكمال"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
