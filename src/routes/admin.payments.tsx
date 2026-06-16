import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  CreditCard,
  CircleDollarSign,
  RefreshCw,
  Landmark,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

interface Transaction {
  id: string;
  orderId: string;
  studentName: string;
  courseTitle: string;
  amount: number;
  gateway: "STRIPE" | "PAYPAL" | "FAWRY";
  status: "COMPLETED" | "REFUNDED" | "PENDING";
  date: string;
}

const initialTransactions: Transaction[] = [
  {
    id: "TXN-101",
    orderId: "ORD-9801",
    studentName: "محمد أحمد علي",
    courseTitle: "Epic Grammer 2026",
    amount: 500,
    gateway: "STRIPE",
    status: "COMPLETED",
    date: "2026-06-13",
  },
  {
    id: "TXN-102",
    orderId: "ORD-9802",
    studentName: "يوسف خالد محمود",
    courseTitle: "PrePre IQ Intermediate",
    amount: 200,
    gateway: "PAYPAL",
    status: "COMPLETED",
    date: "2026-06-12",
  },
  {
    id: "TXN-103",
    orderId: "ORD-9803",
    studentName: "فاطمة محمد علي",
    courseTitle: "أساسيات الرياضيات 2026",
    amount: 250,
    gateway: "FAWRY",
    status: "PENDING",
    date: "2026-06-11",
  },
  {
    id: "TXN-104",
    orderId: "ORD-9804",
    studentName: "رانيا كمال مصطفى",
    courseTitle: "Epic Grammer 2026",
    amount: 500,
    gateway: "STRIPE",
    status: "REFUNDED",
    date: "2026-06-10",
  },
  {
    id: "TXN-105",
    orderId: "ORD-9805",
    studentName: "سارة خالد أحمد",
    courseTitle: "ليالي الامتحان كيمياء",
    amount: 100,
    gateway: "FAWRY",
    status: "COMPLETED",
    date: "2026-06-08",
  },
];

function AdminPayments() {
  const [txns, setTxns] = useState<Transaction[]>(initialTransactions);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterGateway, setFilterGateway] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredTxns = useMemo(() => {
    return txns
      .filter((t) => filterGateway === "ALL" || t.gateway === filterGateway)
      .filter((t) => filterStatus === "ALL" || t.status === filterStatus)
      .filter(
        (t) =>
          t.studentName.toLowerCase().includes(search.toLowerCase()) ||
          t.id.includes(search) ||
          t.orderId.includes(search),
      );
  }, [txns, filterGateway, filterStatus, search]);

  const paginatedTxns = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredTxns.slice(start, start + itemsPerPage);
  }, [filteredTxns, page]);

  const totalPages = Math.ceil(filteredTxns.length / itemsPerPage) || 1;

  // Refund simulation
  const handleRefund = (id: string) => {
    const txn = txns.find((t) => t.id === id);
    if (!txn) return;
    if (txn.status === "REFUNDED") {
      toast.error("هذه المعاملة مستردة بالفعل");
      return;
    }
    if (!confirm(`هل أنت متأكد من رد مبلغ ${txn.amount} ج.م للطالب ${txn.studentName}؟`)) return;

    setTxns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "REFUNDED" } : t)));
    toast.success("تم رد المبلغ بنجاح ومعالجة العملية عبر بوابة الدفع");
  };

  // Gateway Statistics
  const stats = useMemo(() => {
    const active = txns.filter((t) => t.status === "COMPLETED");
    const stripeTotal = active
      .filter((t) => t.gateway === "STRIPE")
      .reduce((sum, t) => sum + t.amount, 0);
    const paypalTotal = active
      .filter((t) => t.gateway === "PAYPAL")
      .reduce((sum, t) => sum + t.amount, 0);
    const fawryTotal = active
      .filter((t) => t.gateway === "FAWRY")
      .reduce((sum, t) => sum + t.amount, 0);
    return { stripeTotal, paypalTotal, fawryTotal, total: stripeTotal + paypalTotal + fawryTotal };
  }, [txns]);

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "المعاملة,الطلب,الطالب,الدورة,المبلغ,بوابة الدفع,الحالة,التاريخ\n";
    filteredTxns.forEach((t) => {
      csvContent += `"${t.id}","${t.orderId}","${t.studentName}","${t.courseTitle}","${t.amount} ج.م","${t.gateway}","${t.status}","${t.date}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "transactions_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجل المدفوعات بنجاح");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          تتبع المعاملات، طلبات الاسترداد، وبوابات الدفع المدعومة
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">المدفوعات والمستخلصات</h2>
      </div>

      {/* Gateway statistics cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-primary/10 text-primary">
              <CircleDollarSign className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">إجمالي مبيعات البوابات</span>
          </div>
          <div className="mt-4 text-start font-display text-xl font-bold text-foreground">
            {stats.total} ج.م
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-indigo-500/10 text-indigo-500">
              <Landmark className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">بوابة Stripe</span>
          </div>
          <div className="mt-4 text-start font-display text-xl font-bold text-indigo-500">
            {stats.stripeTotal} ج.م
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-blue-500/10 text-blue-500">
              <Landmark className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">بوابة Paypal</span>
          </div>
          <div className="mt-4 text-start font-display text-xl font-bold text-blue-500">
            {stats.paypalTotal} ج.m
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="rounded-xl p-2 bg-orange-500/10 text-orange-500">
              <Landmark className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">بوابة Fawry</span>
          </div>
          <div className="mt-4 text-start font-display text-xl font-bold text-orange-500">
            {stats.fawryTotal} ج.م
          </div>
        </div>
      </div>

      {/* Top filters bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:flex-row">
        {/* Actions left (RTL) */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileText className="size-4 text-blue-500" /> تصدير PDF
          </button>
        </div>

        {/* Filters right (RTL) */}
        <div className="flex w-full flex-1 items-center justify-end gap-3 lg:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="COMPLETED">مكتملة</option>
            <option value="PENDING">معلقة</option>
            <option value="REFUNDED">مستردة (Refunded)</option>
          </select>

          <select
            value={filterGateway}
            onChange={(e) => {
              setFilterGateway(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">جميع البوابات</option>
            <option value="STRIPE">Stripe</option>
            <option value="PAYPAL">Paypal</option>
            <option value="FAWRY">Fawry</option>
          </select>

          <input
            type="search"
            placeholder="البحث باسم الطالب أو رقم المعاملة..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">التاريخ</th>
              <th className="px-5 py-4">الحالة</th>
              <th className="px-5 py-4">بوابة الدفع</th>
              <th className="px-5 py-4">المبلغ</th>
              <th className="px-5 py-4">الدورة</th>
              <th className="px-5 py-4">اسم الطالب</th>
              <th className="px-5 py-4">رقم المعاملة (TXN)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTxns.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-secondary/20">
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleRefund(t.id)}
                    disabled={t.status === "REFUNDED" || t.status === "PENDING"}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-card px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  >
                    <RefreshCw className="size-3" /> طلب استرداد
                  </button>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{t.date}</td>
                <td className="px-5 py-3">
                  {t.status === "COMPLETED" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      <CheckCircle className="size-3" /> ناجحة
                    </span>
                  ) : t.status === "PENDING" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                      <Clock className="size-3" /> قيد التحقق
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                      <AlertTriangle className="size-3" /> مستردة
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-semibold text-foreground">{t.gateway}</td>
                <td className="px-5 py-3 font-bold text-primary">{t.amount} ج.م</td>
                <td className="px-5 py-3 text-muted-foreground truncate max-w-xs">
                  {t.courseTitle}
                </td>
                <td className="px-5 py-3 font-medium text-foreground">{t.studentName}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{t.id}</td>
              </tr>
            ))}
            {paginatedTxns.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === totalPages}
            onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page === 1}
            onClick={() => setPage((v) => Math.max(v - 1, 1))}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
