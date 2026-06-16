import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Percent,
  Ticket,
  ToggleLeft,
  ToggleRight,
  Loader2,
  User,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSuperAdminCodesFn,
  deactivateCouponFn,
  deleteEnrollmentCodeFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

interface CouponItem {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED" | "FREE";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  created_at: string;
  course: { title: string };
  teacher: { email: string; profile?: { name: string } | null };
}

interface EnrollmentCodeItem {
  id: string;
  code: string;
  usedBy: string | null;
  usedAt: string | null;
  created_at: string;
  course: { title: string };
  creator: { email: string; profile?: { name: string } | null };
  user?: { email: string; profile?: { name: string } | null } | null;
}

function AdminCoupons() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [enrollmentCodes, setEnrollmentCodes] = useState<EnrollmentCodeItem[]>([]);

  // Search & Tabs
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"coupons" | "enrollments">("coupons");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadAllCodes();
  }, []);

  const loadAllCodes = () => {
    setLoading(true);
    getSuperAdminCodesFn()
      .then((res: any) => {
        setCoupons(res.coupons || []);
        setEnrollmentCodes(res.enrollmentCodes || []);
      })
      .catch((err) => {
        toast.error("فشل تحميل الأكواد: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Toggle Coupon Active Status
  const handleToggleCoupon = async (id: string) => {
    try {
      await deactivateCouponFn({ data: { id } });
      toast.success("تم تعديل حالة تفعيل الكوبون بنجاح.");
      loadAllCodes();
    } catch (err: any) {
      toast.error("فشل تعديل حالة الكوبون: " + err.message);
    }
  };

  // Delete Enrollment Code
  const handleDeleteEnrollment = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف كود الالتحاق هذا؟ لن يتمكن الطلاب من استخدامه بعد الآن."))
      return;

    try {
      await deleteEnrollmentCodeFn({ data: { id } });
      toast.success("تم حذف كود الالتحاق بنجاح.");
      loadAllCodes();
    } catch (err: any) {
      toast.error("فشل حذف كود الالتحاق: " + err.message);
    }
  };

  // Filtered lists
  const filteredCoupons = useMemo(() => {
    return coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.course.title.toLowerCase().includes(search.toLowerCase()) ||
        c.teacher.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.teacher.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [coupons, search]);

  const filteredEnrollments = useMemo(() => {
    return enrollmentCodes.filter(
      (e) =>
        e.code.toLowerCase().includes(search.toLowerCase()) ||
        e.course.title.toLowerCase().includes(search.toLowerCase()) ||
        e.creator.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.creator.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [enrollmentCodes, search]);

  // Paginated list
  const displayItems = useMemo(() => {
    const list = activeTab === "coupons" ? filteredCoupons : filteredEnrollments;
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  }, [activeTab, filteredCoupons, filteredEnrollments, page]);

  const totalPages = useMemo(() => {
    const list = activeTab === "coupons" ? filteredCoupons : filteredEnrollments;
    return Math.ceil(list.length / itemsPerPage) || 1;
  }, [activeTab, filteredCoupons, filteredEnrollments]);

  // Reset page on tab change
  const handleTabChange = (tab: "coupons" | "enrollments") => {
    setActiveTab(tab);
    setPage(1);
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    if (activeTab === "coupons") {
      csvContent += "الرمز,المعلم,الدورة,نوع الخصم,القيمة,الاستخدام,الحد الأقصى,الانتهاء,الحالة\n";
      filteredCoupons.forEach((c) => {
        const typeStr =
          c.discountType === "PERCENTAGE"
            ? "نسبة مئوية"
            : c.discountType === "FIXED"
              ? "مبلغ ثابت"
              : "مجاني";
        const valStr =
          c.discountType === "PERCENTAGE"
            ? `${c.discountValue}%`
            : c.discountType === "FIXED"
              ? `${c.discountValue} ج.م`
              : "0";
        const expStr = c.expiresAt
          ? new Date(c.expiresAt).toLocaleDateString("ar-EG")
          : "بلا انتهاء";
        const statusStr = c.isActive ? "نشط" : "معطل";
        const teacherName = c.teacher.profile?.name || c.teacher.email;
        csvContent += `"${c.code}","${teacherName}","${c.course.title.replace(/"/g, '""')}","${typeStr}","${valStr}","${c.usedCount}","${c.maxUses}","${expStr}","${statusStr}"\n`;
      });
    } else {
      csvContent += "رمز الالتحاق,المنشئ (المعلم),الدورة,الحالة,المستخدم,تاريخ الاستخدام\n";
      filteredEnrollments.forEach((e) => {
        const creatorName = e.creator.profile?.name || e.creator.email;
        const statusStr = e.usedBy ? "مستخدم" : "متاح";
        const userStr = e.user?.profile?.name || e.user?.email || "غير مستخدم";
        const dateStr = e.usedAt ? new Date(e.usedAt).toLocaleDateString("ar-EG") : "-";
        csvContent += `"${e.code}","${creatorName}","${e.course.title.replace(/"/g, '""')}","${statusStr}","${userStr}","${dateStr}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `تقرير_أكواد_المنصة_${activeTab === "coupons" ? "الخصم" : "الالتحاق"}_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير قائمة الأكواد بنجاح");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary me-2" />
        جارٍ تحميل الأكواد والكوبونات للمشرف العام…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end animate-fade-in" dir="rtl">
      {/* Top tools bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:flex-row">
        {/* Actions left (RTL) */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileText className="size-4 text-blue-500" /> طباعة التقرير
          </button>
        </div>

        {/* Tab & Search */}
        <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row lg:items-center">
          {/* Tab triggers */}
          <div className="flex rounded-xl bg-secondary/40 p-1 border border-border/40 shrink-0">
            <button
              onClick={() => handleTabChange("enrollments")}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === "enrollments"
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              أكواد الالتحاق
            </button>
            <button
              onClick={() => handleTabChange("coupons")}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                activeTab === "coupons"
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              كوبونات الخصم
            </button>
          </div>

          <input
            type="search"
            placeholder="البحث بالرمز، المعلم، أو الدورة..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 lg:w-80 text-end"
          />
        </div>
      </div>

      {/* Coupons/Enrollment Table */}
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        {activeTab === "coupons" ? (
          <table className="w-full border-collapse text-end text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                <th className="px-5 py-4">الخيارات</th>
                <th className="px-5 py-4">الحالة</th>
                <th className="px-5 py-4">الانتهاء</th>
                <th className="px-5 py-4">الاستخدام</th>
                <th className="px-5 py-4">قيمة الخصم</th>
                <th className="px-5 py-4">المعلم</th>
                <th className="px-5 py-4">الدورة التدريبية</th>
                <th className="px-5 py-4">كود الكوبون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-semibold">
              {(displayItems as CouponItem[]).map((c) => {
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c.id} className="transition-colors hover:bg-secondary/20">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleCoupon(c.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                        title={c.isActive ? "تعطيل الكوبون" : "تفعيل الكوبون"}
                      >
                        {c.isActive ? (
                          <ToggleRight className="size-5 text-primary" />
                        ) : (
                          <ToggleLeft className="size-5 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      {isExpired ? (
                        <span className="rounded bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive">
                          منتهي
                        </span>
                      ) : c.isActive ? (
                        <span className="rounded bg-success/10 px-2.5 py-0.5 text-xs font-bold text-success">
                          نشط
                        </span>
                      ) : (
                        <span className="rounded bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                          معطل
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString("ar-EG")
                        : "بلا نهاية"}
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">
                      <span className="text-primary font-bold">{c.usedCount}</span> / {c.maxUses}
                    </td>
                    <td className="px-5 py-3 font-bold text-primary font-mono">
                      {c.discountType === "PERCENTAGE"
                        ? `${c.discountValue}%`
                        : c.discountType === "FIXED"
                          ? `${c.discountValue} ج.م`
                          : "100% مجاني"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <div className="flex flex-col items-end">
                        <span className="text-foreground text-xs font-bold">
                          {c.teacher.profile?.name || "معلم"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.teacher.email}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground">{c.course.title}</td>
                    <td className="px-5 py-3 font-mono font-bold text-foreground tracking-wider">
                      {c.code}
                    </td>
                  </tr>
                );
              })}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    لا توجد كوبونات خصم مسجلة بالمنصة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-end text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                <th className="px-5 py-4">الخيارات</th>
                <th className="px-5 py-4">تاريخ الاستخدام</th>
                <th className="px-5 py-4">المستخدم</th>
                <th className="px-5 py-4">الحالة</th>
                <th className="px-5 py-4">المعلم المنشئ</th>
                <th className="px-5 py-4">الدورة التدريبية</th>
                <th className="px-5 py-4">رمز الالتحاق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-semibold">
              {(displayItems as EnrollmentCodeItem[]).map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-secondary/20">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDeleteEnrollment(e.id)}
                      className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-all"
                      title="حذف الكود"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {e.usedAt ? new Date(e.usedAt).toLocaleDateString("ar-EG") : "-"}
                  </td>
                  <td className="px-5 py-3 text-foreground">
                    {e.user ? (
                      <div className="flex flex-col items-end">
                        <span className="text-foreground text-xs font-bold">
                          {e.user.profile?.name || "طالب"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {e.user.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {e.usedBy ? (
                      <span className="rounded bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                        مستخدم
                      </span>
                    ) : (
                      <span className="rounded bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-500">
                        متاح
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <div className="flex flex-col items-end">
                      <span className="text-foreground text-xs font-bold">
                        {e.creator.profile?.name || "معلم"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {e.creator.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground">{e.course.title}</td>
                  <td className="px-5 py-3 font-mono font-bold text-foreground tracking-wider">
                    {e.code}
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    لا توجد رموز التحاق مسجلة بالمنصة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
