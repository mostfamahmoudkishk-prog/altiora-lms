import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Landmark,
  CheckCircle,
  RefreshCw,
  FileSpreadsheet,
  Percent,
  Coins,
  Users,
  Award,
  TrendingUp,
  Settings,
  Plus,
  BookOpen,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getSuperAdminRevenueAnalyticsFn, updateRevenueSettingsFn } from "@/lib/api/db.functions";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/super-admin/payments")({
  component: SuperAdminPayments,
});

interface Transaction {
  id: string;
  amount: number;
  teacherAmount: number;
  platformAmount: number;
  type: string;
  created_at: string;
  course: { title: string };
  teacher: { email: string; profile?: { name: string } | null };
  student: { email: string; profile?: { name: string } | null };
}

interface BestTeacher {
  name: string;
  email: string;
  sales: number;
  earnings: number;
}

interface TopCourse {
  title: string;
  count: number;
  total: number;
}

interface MonthlyData {
  month: string;
  platform: number;
  teachers: number;
}

function SuperAdminPayments() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalPlatformRevenue: number;
    totalTeachersRevenue: number;
    bestTeachers: BestTeacher[];
    monthlyChart: MonthlyData[];
    topCourses: TopCourse[];
    transactions: Transaction[];
  } | null>(null);

  // Settings Override Form State
  const [teacherEmail, setTeacherEmail] = useState("");
  const [platformPercentage, setPlatformPercentage] = useState(20);
  const [teacherPercentage, setTeacherPercentage] = useState(80);
  const [submittingSettings, setSubmittingSettings] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = () => {
    setLoading(true);
    getSuperAdminRevenueAnalyticsFn()
      .then((res: any) => {
        setStats(res);
      })
      .catch((err) => {
        toast.error("فشل تحميل تحليلات المدفوعات: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleUpdatePercentage = (e: React.FormEvent) => {
    e.preventDefault();
    if (platformPercentage + teacherPercentage !== 100) {
      toast.error("يجب أن يكون مجموع نسبتي المنصة والمعلم مساوياً لـ 100%");
      return;
    }

    setSubmittingSettings(true);
    updateRevenueSettingsFn({
      data: {
        teacherEmail: teacherEmail.trim() || null,
        platformPercentage,
        teacherPercentage,
      },
    })
      .then(() => {
        toast.success(
          teacherEmail.trim()
            ? "تم تحديث نسب تقسيم الأرباح للمعلم المحدد بنجاح"
            : "تم تحديث نسب تقسيم الأرباح العامة بنجاح",
        );
        setTeacherEmail("");
        loadAnalytics();
      })
      .catch((err) => {
        toast.error("فشل تحديث الإعدادات: " + err.message);
      })
      .finally(() => {
        setSubmittingSettings(false);
      });
  };

  const handleExportCSV = () => {
    if (!stats || stats.transactions.length === 0) {
      toast.error("لا توجد معاملات لتصديرها.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent +=
      "رقم المعاملة,المعلم,الطالب,الدورة,التاريخ,نوع المعاملة,المبلغ الإجمالي,عمولة المنصة,صافي المعلم\n";

    stats.transactions.forEach((tx) => {
      const teacherName = tx.teacher?.profile?.name || tx.teacher?.email || "معلم غير معروف";
      const studentName = tx.student?.profile?.name || tx.student?.email || "طالب غير معروف";
      const date = new Date(tx.created_at).toLocaleDateString("ar-EG");
      const typeLabel =
        tx.type === "PURCHASE" ? "شراء مباشر" : tx.type === "COUPON" ? "تفعيل كود" : "يدوي";

      csvContent += `"${tx.id}","${teacherName}","${studentName}","${tx.course.title.replace(/"/g, '""')}","${date}","${typeLabel}","${tx.amount}","${tx.platformAmount}","${tx.teacherAmount}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_مبيعات_المنصة_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير تقرير المبيعات بنجاح بصيغة Excel (CSV)");
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 text-end" dir="rtl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-neutral-900/50 border border-amber-500/10 rounded-3xl p-5 space-y-4 shadow-[0_0_40px_rgba(251,191,36,.04)]"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-16 bg-neutral-800 rounded"></div>
              <div className="size-10 bg-neutral-800 rounded-xl"></div>
            </div>
            <div className="h-10 bg-neutral-800 rounded-2xl w-2/3"></div>
          </div>
        ))}
        <div className="col-span-full h-80 bg-neutral-900/50 border border-amber-500/10 rounded-3xl animate-pulse"></div>
      </div>
    );
  }

  const totalPlatform = stats?.totalPlatformRevenue || 0;
  const totalTeachers = stats?.totalTeachersRevenue || 0;
  const totalSales = totalPlatform + totalTeachers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-end bg-transparent font-display text-white"
      dir="rtl"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير تقرير الإيرادات
          </button>
        </div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            إدارة الإيرادات وتقسيم الأرباح
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            تتبع مبيعات المنصة الإجمالية، عمولات الإدارة، وإيرادات المعلمين وتخصيص نسب تقسيم الأرباح الفورية.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Total Sales */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.06)] transition-all hover:scale-[1.02] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-2xl p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="size-5" />
            </span>
            <span className="text-xs text-zinc-400 font-bold">إجمالي مبيعات المنصة</span>
          </div>
          <div className="mt-6 text-start">
            <span className="font-mono text-3xl font-black text-white">
              {totalSales.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-bold block mt-1">ج.م</span>
          </div>
        </div>

        {/* Platform Commission */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.06)] transition-all hover:scale-[1.02] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-2xl p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="size-5" />
            </span>
            <span className="text-xs text-zinc-400 font-bold">إجمالي عمولات المنصة</span>
          </div>
          <div className="mt-6 text-start">
            <span className="font-mono text-3xl font-black text-emerald-400">
              {totalPlatform.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-bold block mt-1">ج.م</span>
          </div>
        </div>

        {/* Teachers Dues */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.06)] transition-all hover:scale-[1.02] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="rounded-2xl p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Landmark className="size-5" />
            </span>
            <span className="text-xs text-zinc-400 font-bold">مستحقات المعلمين الإجمالية</span>
          </div>
          <div className="mt-6 text-start">
            <span className="font-mono text-3xl font-black text-amber-400">
              {totalTeachers.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-500 font-bold block mt-1">ج.م</span>
          </div>
        </div>
      </div>

      {/* Override Split & Monthly Chart Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings overrides */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 justify-end border-b border-zinc-900 pb-3">
            <h3 className="font-display text-base font-bold text-amber-400">
              تعديل نسب تقسيم الأرباح
            </h3>
            <Settings className="size-5 text-amber-400" />
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed text-right">
            النسب الافتراضية للمنصة هي 20% وللمعلمين هي 80%. يمكنك تعيين نسب مخصصة لمعلم معين عبر
            إدخال بريده الإلكتروني أدناه، أو تعديل النسبة الافتراضية بترك البريد فارغاً.
          </p>
          <form onSubmit={handleUpdatePercentage} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 mb-1.5 text-right">
                البريد الإلكتروني للمعلم (اختياري)
              </label>
              <input
                type="email"
                placeholder="teacher@example.com"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white text-end font-bold outline-none focus:border-amber-500/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 text-center">
                  نسبة المعلم (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={teacherPercentage}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTeacherPercentage(val);
                    setPlatformPercentage(100 - val);
                  }}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white text-center font-bold outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 mb-1.5 text-center">
                  نسبة المنصة (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={platformPercentage}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPlatformPercentage(val);
                    setTeacherPercentage(100 - val);
                  }}
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white text-center font-bold outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submittingSettings}
              className="w-full rounded-xl bg-amber-500 text-black py-2.5 text-xs font-black hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-amber-500/10 mt-2"
            >
              {submittingSettings ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </form>
        </div>

        {/* Recharts Monthly comparative Chart */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2 border-b border-zinc-900 pb-3">
            <span className="text-xs text-zinc-400">
              مقارنة الإيرادات على مدار 6 أشهر الماضية
            </span>
            <h3 className="font-display text-base font-bold text-amber-400 flex items-center gap-1.5">
              <span>تحليلات الأرباح الشهرية</span>
              <TrendingUp className="size-5" />
            </h3>
          </div>
          <div className="h-64 w-full" dir="ltr">
            {stats && stats.monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.monthlyChart}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPlatformRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTeachersRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e4e4e7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a1a1aa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "rgba(245,158,11,0.2)",
                      borderRadius: "16px",
                      color: "#fff",
                      direction: "rtl",
                      textAlign: "right",
                    }}
                    formatter={(value) => [`${value} ج.م`]}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }} />
                  <Area
                    name="إيرادات المنصة"
                    type="monotone"
                    dataKey="platform"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPlatformRevenue)"
                  />
                  <Area
                    name="إيرادات المعلمين"
                    type="monotone"
                    dataKey="teachers"
                    stroke="#e4e4e7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTeachersRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                لا توجد بيانات بيانية كافية بعد.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Teachers Performance and Top Courses */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Performing Teachers */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
          <div className="flex items-center gap-2 justify-end border-b border-zinc-900 pb-3">
            <h3 className="font-display text-base font-bold text-amber-400">أفضل المعلمين أداءً</h3>
            <Users className="size-5 text-amber-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-end text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-bold">
                  <th className="pb-3 text-start">إيرادات المعلم</th>
                  <th className="pb-3 text-start">إجمالي مبيعاته</th>
                  <th className="pb-3 text-right">المعلم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {stats?.bestTeachers && stats.bestTeachers.length > 0 ? (
                  stats.bestTeachers.map((t, idx) => (
                    <tr key={idx} className="hover:bg-amber-500/[0.02] transition-colors">
                      <td className="py-3 font-mono font-bold text-amber-400 text-start">
                        {t.earnings.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 font-mono font-semibold text-white text-start">
                        {t.sales.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 text-right">
                        <div className="font-bold text-white">{t.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{t.email}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-zinc-500">
                      لا يوجد معلمون مسجلون لديهم مبيعات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Selling Courses */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
          <div className="flex items-center gap-2 justify-end border-b border-zinc-900 pb-3">
            <h3 className="font-display text-base font-bold text-amber-400">
              الدورات الأكثر مبيعاً
            </h3>
            <BookOpen className="size-5 text-amber-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-end text-xs text-zinc-300">
              <thead>
                <tr className="border-b border-zinc-900 text-zinc-500 font-bold">
                  <th className="pb-3 text-start">قيمة المبيعات</th>
                  <th className="pb-3 text-start">عدد المبيعات</th>
                  <th className="pb-3 text-right">الدورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {stats?.topCourses && stats.topCourses.length > 0 ? (
                  stats.topCourses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-amber-500/[0.02] transition-colors">
                      <td className="py-3 font-mono font-bold text-amber-400 text-start">
                        {c.total.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 font-semibold text-white text-start">
                        {c.count} عملية شراء
                      </td>
                      <td className="py-3 font-bold text-white text-right">{c.title}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-zinc-500">
                      لا توجد مبيعات مسجلة للدورات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)] overflow-hidden">
        <div className="p-6 border-b border-zinc-900/80">
          <h3 className="font-display text-base font-bold text-amber-400">سجل المعاملات الأخيرة</h3>
          <p className="text-[10px] text-zinc-400 mt-1">
            تفاصيل العمليات المالية وعمولات المنصة وصافي أرباح المعلمين.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-end text-xs text-zinc-300">
            <thead>
              <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-amber-500/80 font-bold text-[11px]">
                <th className="px-6 py-4 text-start">صافي المعلم</th>
                <th className="px-6 py-4 text-start">عمولة المنصة</th>
                <th className="px-6 py-4 text-start">المبلغ الإجمالي</th>
                <th className="px-6 py-4 text-center">نوع الدفع</th>
                <th className="px-6 py-4 text-right">الدورة</th>
                <th className="px-6 py-4 text-right">الطالب</th>
                <th className="px-6 py-4 text-right">المعلم</th>
                <th className="px-6 py-4 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80">
              {stats?.transactions && stats.transactions.length > 0 ? (
                stats.transactions.map((tx) => {
                  const studentName = tx.student?.profile?.name || tx.student?.email || "طالب عام";
                  const teacherName = tx.teacher?.profile?.name || tx.teacher?.email || "معلم عام";
                  const date = new Date(tx.created_at).toLocaleDateString("ar-EG");
                  const typeLabel =
                    tx.type === "PURCHASE"
                      ? "شراء مباشر"
                      : tx.type === "COUPON"
                        ? "تفعيل كود"
                        : "يدوي";

                  return (
                    <tr
                      key={tx.id}
                      className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-amber-400 text-start">
                        {Number(tx.teacherAmount).toLocaleString()} ج.م
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white/90 text-start">
                        {Number(tx.platformAmount).toLocaleString()}.00 ج.م
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white text-start">
                        {Number(tx.amount).toLocaleString()}.00 ج.m
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            tx.type === "PURCHASE"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : tx.type === "COUPON"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-right font-bold">{tx.course.title}</td>
                      <td className="px-6 py-4 font-bold text-white text-right">{studentName}</td>
                      <td className="px-6 py-4 font-bold text-white text-right">{teacherName}</td>
                      <td className="px-6 py-4 text-zinc-400 text-right font-mono">{date}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-zinc-500">
                    لا توجد معاملات مسجلة بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
