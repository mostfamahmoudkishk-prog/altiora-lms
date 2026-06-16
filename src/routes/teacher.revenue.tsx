import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  DollarSign,
  Wallet,
  Percent,
  Send,
  FileSpreadsheet,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherRevenueStatsFn } from "@/lib/api/db.functions";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/teacher/revenue")({
  component: TeacherRevenue,
});

interface Transaction {
  id: string;
  amount: number;
  teacherAmount: number;
  platformAmount: number;
  type: string;
  created_at: string;
  course: { title: string };
  student: { email: string; profile?: { name: string } | null };
}

interface TopCourse {
  title: string;
  count: number;
  total: number;
}

interface MonthlyData {
  month: string;
  sales: number;
  earnings: number;
}

function TeacherRevenue() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalSales: number;
    totalEarnings: number;
    platformCommission: number;
    topCourses: TopCourse[];
    monthlyChart: MonthlyData[];
    transactions: Transaction[];
  } | null>(null);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = () => {
    const user = getCurrentUser();
    if (user) {
      setLoading(true);
      getTeacherRevenueStatsFn({ data: { email: user.email } })
        .then((res: any) => {
          setStats(res);
        })
        .catch((err) => {
          toast.error("فشل تحميل بيانات الأرباح: " + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const handleExportCSV = () => {
    if (!stats || stats.transactions.length === 0) {
      toast.error("لا توجد معاملات لتصديرها.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent +=
      "رقم المعاملة,الطالب,الدورة,التاريخ,نوع المعاملة,المبلغ الإجمالي,عمولة المنصة,صافي الأرباح\n";

    stats.transactions.forEach((tx) => {
      const studentName = tx.student?.profile?.name || tx.student?.email || "طالب عام";
      const date = new Date(tx.created_at).toLocaleDateString("ar-EG");
      const typeLabel =
        tx.type === "PURCHASE" ? "شراء مباشر" : tx.type === "COUPON" ? "تفعيل كود" : "يدوي";

      csvContent += `"${tx.id}","${studentName}","${tx.course.title.replace(/"/g, '""')}","${date}","${typeLabel}","${tx.amount}","${tx.platformAmount}","${tx.teacherAmount}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_أرباح_المعلم_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير تقرير الأرباح بنجاح بصيغة Excel (CSV)");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background text-sm text-muted-foreground">
        جارٍ تحميل تحليلات الأرباح والمبيعات…
      </div>
    );
  }

  const totalSales = stats?.totalSales || 0;
  const totalEarnings = stats?.totalEarnings || 0;
  const platformCommission = stats?.platformCommission || 0;

  return (
    <div className="space-y-6 text-end animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير تقرير المبيعات
          </button>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">تقارير وأرباح المعلم</h2>
          <p className="text-xs text-muted-foreground mt-1">
            تتبع المبيعات الإجمالية، عمولات المنصة، وأرباحك الشهرية.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-emerald-500/10 text-emerald-500">
              <DollarSign className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">إجمالي مبيعات دوراتك</span>
          </div>
          <div className="mt-4 text-start font-display text-2xl font-black text-foreground">
            {totalSales.toLocaleString()} ج.م
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">صافي أرباح المعلم (80%)</span>
          </div>
          <div className="mt-4 text-start font-display text-2xl font-black text-primary">
            {totalEarnings.toLocaleString()} ج.م
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-amber-500/10 text-amber-500">
              <Percent className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">عمولة المنصة الإجمالية</span>
          </div>
          <div className="mt-4 text-start font-display text-2xl font-black text-amber-500">
            {platformCommission.toLocaleString()} ج.م
          </div>
        </div>
      </div>

      {/* Monthly chart & Top Courses */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Earnings Chart */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2 space-y-4">
          <h3 className="font-display text-base font-bold text-foreground">
            الإحصائيات الشهرية للأرباح
          </h3>
          {stats?.monthlyChart && stats.monthlyChart.length > 0 ? (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.monthlyChart}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    name="أرباحك"
                    stroke="var(--primary)"
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-xs">
              لا توجد أرباح مسجلة في الأشهر الستة الماضية.
            </div>
          )}
        </div>

        {/* Top Courses */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-4">
          <h3 className="font-display text-base font-bold text-foreground">
            الدورات الأكثر مبيعاً
          </h3>
          {stats?.topCourses && stats.topCourses.length > 0 ? (
            <div className="space-y-3">
              {stats.topCourses.map((c, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center rounded-xl bg-secondary/30 p-3 text-xs border border-border/40"
                >
                  <div className="text-start">
                    <div className="font-bold text-foreground">{c.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      عدد المبيعات: {c.count}
                    </div>
                  </div>
                  <div className="font-bold text-primary">{c.total.toLocaleString()} ج.م</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground text-xs">
              لا توجد مبيعات مسجلة بعد.
            </div>
          )}
        </div>
      </div>

      {/* Transactions History */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <h3 className="mb-4 font-display text-base font-bold text-foreground">
          سجل حركات المبيعات والعمولات
        </h3>
        <div className="overflow-x-auto">
          {stats?.transactions && stats.transactions.length > 0 ? (
            <table className="w-full border-collapse text-end text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-[10px] sm:text-xs font-bold text-muted-foreground">
                  <th className="px-4 py-3">صافي أرباحك</th>
                  <th className="px-4 py-3">العمولة</th>
                  <th className="px-4 py-3">المبلغ الإجمالي</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">نوع العملية</th>
                  <th className="px-4 py-3">الدورة</th>
                  <th className="px-4 py-3">الطالب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-semibold">
                {stats.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-secondary/10">
                    <td className="px-4 py-3 text-primary">
                      {Number(tx.teacherAmount).toLocaleString()} ج.م
                    </td>
                    <td className="px-4 py-3 text-amber-600">
                      {Number(tx.platformAmount).toLocaleString()} ج.م
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {Number(tx.amount).toLocaleString()} ج.م
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === "PURCHASE"
                            ? "bg-success/10 text-success"
                            : tx.type === "COUPON"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tx.type === "PURCHASE"
                          ? "شراء"
                          : tx.type === "COUPON"
                            ? "كود تفعيل"
                            : "يدوي"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{tx.course?.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tx.student?.profile?.name || tx.student?.email}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا توجد عمليات مبيعات مسجلة حتى الآن.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
