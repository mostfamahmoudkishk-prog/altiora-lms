import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Ticket,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  ShieldAlert,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Calendar,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  generateTeacherCouponFn,
  generateTeacherEnrollmentCodeFn,
  getTeacherCodesFn,
  deactivateCouponFn,
  deleteEnrollmentCodeFn,
  deactivateEnrollmentCodeFn,
  expireEnrollmentCodeFn,
} from "@/lib/api/db.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/teacher/coupons")({
  component: TeacherCoupons,
});

interface Coupon {
  id: string;
  code: string;
  courseId: string;
  teacherId: string;
  discountType: "PERCENTAGE" | "FIXED" | "FREE";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  created_at: string;
  course: { title: string };
}

interface EnrollmentCode {
  id: string;
  code: string;
  courseId: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  created_at: string;
  course: { title: string };
  user?: { email: string; profile?: { name: string } | null } | null;
  email: string | null;
  used: boolean;
  expiresAt: string | null;
  isActive: boolean;
}

interface Course {
  id: string;
  title: string;
}

function TeacherCoupons() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [enrollmentCodes, setEnrollmentCodes] = useState<EnrollmentCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Search and tabs
  const [activeTab, setActiveTab] = useState<"coupons" | "enrollments">("coupons");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false);

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED" | "FREE">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("100");
  const [expiresAt, setExpiresAt] = useState("");

  // New Enrollment Code inputs
  const [studentEmail, setStudentEmail] = useState("");
  const [enrollmentExpiresAt, setEnrollmentExpiresAt] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const user = getCurrentUser();
    if (user) {
      setLoading(true);
      getTeacherCodesFn({ data: { email: user.email } })
        .then((res: any) => {
          setCoupons(res.coupons || []);
          setEnrollmentCodes(res.enrollmentCodes || []);
          setCourses(res.courses || []);
        })
        .catch((err) => {
          toast.error("فشل تحميل البيانات: " + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`تم نسخ الرمز: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Generate Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    if (!selectedCourseId) {
      toast.error("الرجاء اختيار الدورة التدريبية.");
      return;
    }

    const valueNum = discountType === "FREE" ? 0 : parseFloat(discountValue);
    if (discountType !== "FREE" && (isNaN(valueNum) || valueNum <= 0)) {
      toast.error("الرجاء إدخال قيمة خصم صالحة.");
      return;
    }

    setActionLoading(true);
    try {
      await generateTeacherCouponFn({
        data: {
          courseId: selectedCourseId,
          teacherEmail: user.email,
          discountType,
          discountValue: valueNum,
          maxUses: parseInt(maxUses) || 100,
          expiresAt: expiresAt || null,
        },
      });
      toast.success("تم إنشاء الكوبون بنجاح.");
      setIsCouponDialogOpen(false);
      setSelectedCourseId("");
      setDiscountType("PERCENTAGE");
      setDiscountValue("");
      setMaxUses("100");
      setExpiresAt("");
      loadData();
    } catch (err: any) {
      toast.error("فشل إنشاء الكوبون: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Generate Enrollment Code
  const handleCreateEnrollmentCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    if (!selectedCourseId) {
      toast.error("الرجاء اختيار الدورة التدريبية.");
      return;
    }

    setActionLoading(true);
    try {
      await generateTeacherEnrollmentCodeFn({
        data: {
          courseId: selectedCourseId,
          teacherEmail: user.email,
          studentEmail: studentEmail.trim() || null,
          expiresAt: enrollmentExpiresAt || null,
        },
      });
      toast.success("تم إنشاء كود الالتحاق بنجاح.");
      setIsEnrollmentDialogOpen(false);
      setSelectedCourseId("");
      setStudentEmail("");
      setEnrollmentExpiresAt("");
      loadData();
    } catch (err: any) {
      toast.error("فشل إنشاء كود الالتحاق: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Coupon Active Status
  const handleToggleCoupon = async (id: string) => {
    try {
      await deactivateCouponFn({ data: { id } });
      toast.success("تم تغيير حالة الكوبون.");
      loadData();
    } catch (err: any) {
      toast.error("فشل تغيير حالة الكوبون: " + err.message);
    }
  };

  // Toggle Enrollment Code Active Status
  const handleToggleEnrollmentCode = async (id: string) => {
    try {
      await deactivateEnrollmentCodeFn({ data: { id } });
      toast.success("تم تغيير حالة كود الالتحاق.");
      loadData();
    } catch (err: any) {
      toast.error("فشل تغيير حالة كود الالتحاق: " + err.message);
    }
  };

  // Expire Enrollment Code
  const handleExpireEnrollmentCode = async (id: string) => {
    try {
      await expireEnrollmentCodeFn({ data: { id } });
      toast.success("تم إنهاء صلاحية كود الالتحاق بنجاح.");
      loadData();
    } catch (err: any) {
      toast.error("فشل إنهاء صلاحية الكود: " + err.message);
    }
  };

  // Delete Enrollment Code
  const handleDeleteEnrollment = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف كود الالتحاق هذا؟ لن يتمكن الطلاب من استخدامه بعد الآن."))
      return;

    try {
      await deleteEnrollmentCodeFn({ data: { id } });
      toast.success("تم حذف كود الالتحاق بنجاح.");
      loadData();
    } catch (err: any) {
      toast.error("فشل حذف كود الالتحاق: " + err.message);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    if (activeTab === "coupons") {
      csvContent += "الرمز,الدورة,نوع الخصم,القيمة,الاستخدام,الحد الأقصى,تاريخ الانتهاء,الحالة\n";
      filteredCoupons.forEach((c) => {
        const typeStr =
          c.discountType === "PERCENTAGE"
            ? "نسبة مئوية"
            : c.discountType === "FIXED"
              ? "مبلغ ثابت"
              : "مجاني بالكامل";
        const valStr =
          c.discountType === "PERCENTAGE"
            ? `${c.discountValue}%`
            : c.discountType === "FIXED"
              ? `${c.discountValue} ج.م`
              : "0";
        const expStr = c.expiresAt
          ? new Date(c.expiresAt).toLocaleDateString("ar-EG")
          : "بلا انتهاء";
        const statusStr = c.isActive ? "نشط" : "غير نشط";
        csvContent += `"${c.code}","${c.course.title.replace(/"/g, '""')}","${typeStr}","${valStr}","${c.usedCount}","${c.maxUses}","${expStr}","${statusStr}"\n`;
      });
    } else {
      csvContent +=
        "رمز الالتحاق,الدورة,الحالة,البريد الإلكتروني المخصص,تاريخ الانتهاء,المستخدم,تاريخ الاستخدام\n";
      filteredEnrollments.forEach((e) => {
        const statusStr = e.usedBy ? "مستخدم" : e.isActive ? "نشط" : "معطل";
        const restrictedEmail = e.email || "عام";
        const expStr = e.expiresAt
          ? new Date(e.expiresAt).toLocaleDateString("ar-EG")
          : "بلا انتهاء";
        const userStr = e.user?.profile?.name || e.user?.email || "غير مستخدم";
        const dateStr = e.usedAt ? new Date(e.usedAt).toLocaleDateString("ar-EG") : "-";
        csvContent += `"${e.code}","${e.course.title.replace(/"/g, '""')}","${statusStr}","${restrictedEmail}","${expStr}","${userStr}","${dateStr}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `تقرير_الأكواد_${activeTab === "coupons" ? "الخصم" : "الالتحاق"}_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير التقرير بنجاح");
  };

  // Filtered lists
  const filteredCoupons = useMemo(() => {
    return coupons.filter(
      (c) =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.course.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [coupons, searchQuery]);

  const filteredEnrollments = useMemo(() => {
    return enrollmentCodes.filter(
      (e) =>
        e.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.course.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [enrollmentCodes, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary me-2" />
        جارٍ تحميل الأكواد والكوبونات…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end animate-fade-in" dir="rtl">
      {/* Header card */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير للـ Excel
          </button>

          <button
            onClick={() => {
              setSelectedCourseId("");
              setStudentEmail("");
              setEnrollmentExpiresAt("");
              setIsEnrollmentDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
          >
            <Plus className="size-4" /> توليد كود التحاق مجاني
          </button>

          <button
            onClick={() => {
              setSelectedCourseId("");
              setDiscountType("PERCENTAGE");
              setDiscountValue("");
              setMaxUses("100");
              setExpiresAt("");
              setIsCouponDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-95 transition-all shadow-card"
          >
            <Plus className="size-4" /> إنشاء كوبون خصم جديد
          </button>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center justify-end gap-2">
            <span>إدارة أكواد الخصم والالتحاق</span>
            <Ticket className="size-5 text-primary" />
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            توليد كوبونات خصم أو أكواد دخول مجانية للطلاب ودوراتك التدريبية.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <input
            type="search"
            placeholder="البحث بالرمز أو الدورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card pe-10 ps-4 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-end"
          />
          <Search className="absolute right-3.5 top-3 size-4 text-muted-foreground" />
        </div>

        {/* Tab triggers */}
        <div className="flex rounded-xl bg-secondary/40 p-1 border border-border/40">
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === "enrollments"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            أكواد الالتحاق (Free Codes)
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === "coupons"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            كوبونات الخصم (Coupons)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {activeTab === "coupons" ? (
          <div className="overflow-x-auto">
            {filteredCoupons.length > 0 ? (
              <table className="w-full border-collapse text-end text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                    <th className="px-4 py-3">الخيارات</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">الانتهاء</th>
                    <th className="px-4 py-3">الاستخدام</th>
                    <th className="px-4 py-3">قيمة الخصم</th>
                    <th className="px-4 py-3">الدورة التدريبية</th>
                    <th className="px-4 py-3">كود الكوبون</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-semibold">
                  {filteredCoupons.map((c) => {
                    const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    return (
                      <tr key={c.id} className="hover:bg-secondary/10">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
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
                            <button
                              onClick={() => handleCopy(c.code)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                              title="نسخ الرمز"
                            >
                              {copiedCode === c.code ? (
                                <Check className="size-4 text-emerald-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isExpired ? (
                            <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              منتهي
                            </span>
                          ) : c.isActive ? (
                            <span className="rounded bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                              نشط
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              معطل
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.expiresAt
                            ? new Date(c.expiresAt).toLocaleDateString("ar-EG")
                            : "بلا نهاية"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          <span className="font-bold text-primary">{c.usedCount}</span> /{" "}
                          {c.maxUses}
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono">
                          {c.discountType === "PERCENTAGE" ? (
                            <span className="text-primary font-bold">{c.discountValue}% خصم</span>
                          ) : c.discountType === "FIXED" ? (
                            <span className="text-primary font-bold">
                              {c.discountValue} ج.م خصم
                            </span>
                          ) : (
                            <span className="text-emerald-500 font-bold">100% (مجاني)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground font-semibold">
                          {c.course.title}
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono font-bold tracking-wider">
                          {c.code}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لا توجد كوبونات خصم مطابقة للبحث.
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {filteredEnrollments.length > 0 ? (
              <table className="w-full border-collapse text-end text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                    <th className="px-4 py-3">الخيارات</th>
                    <th className="px-4 py-3">تاريخ الاستخدام</th>
                    <th className="px-4 py-3">المستخدم</th>
                    <th className="px-4 py-3">تاريخ الانتهاء</th>
                    <th className="px-4 py-3">البريد الإلكتروني المخصص</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">الدورة التدريبية</th>
                    <th className="px-4 py-3">رمز الالتحاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-semibold">
                  {filteredEnrollments.map((e) => {
                    const isExpired = e.expiresAt && new Date(e.expiresAt) < new Date();
                    return (
                      <tr key={e.id} className="hover:bg-secondary/10">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-start">
                            <button
                              onClick={() => handleToggleEnrollmentCode(e.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-all"
                              title={e.isActive ? "تعطيل كود الالتحاق" : "تفعيل كود الالتحاق"}
                            >
                              {e.isActive ? (
                                <ToggleRight className="size-5 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="size-5 text-muted-foreground" />
                              )}
                            </button>
                            {!isExpired && !e.used && (
                              <button
                                onClick={() => handleExpireEnrollmentCode(e.id)}
                                className="rounded-lg p-1.5 text-amber-600 hover:bg-secondary transition-all"
                                title="إنهاء الصلاحية فوراً"
                              >
                                <Calendar className="size-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEnrollment(e.id)}
                              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-all"
                              title="حذف كود الالتحاق"
                            >
                              <Trash2 className="size-4" />
                            </button>
                            {!e.used && (
                              <button
                                onClick={() => handleCopy(e.code)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-all"
                                title="نسخ الرمز"
                              >
                                {copiedCode === e.code ? (
                                  <Check className="size-4 text-emerald-500" />
                                ) : (
                                  <Copy className="size-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {e.usedAt ? new Date(e.usedAt).toLocaleDateString("ar-EG") : "-"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {e.user ? (
                            <div className="flex flex-col items-end">
                              <span className="text-foreground">
                                {e.user.profile?.name || "طالب"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {e.user.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">غير مستخدم</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {e.expiresAt
                            ? new Date(e.expiresAt).toLocaleDateString("ar-EG")
                            : "بلا انتهاء"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {e.email ? (
                            <span className="font-mono text-xs text-primary">{e.email}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">عام (لا يوجد قيد)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {e.used ? (
                            <span className="rounded bg-success/10 px-2.5 py-0.5 text-[10px] font-bold text-success">
                              مستعمل
                            </span>
                          ) : isExpired ? (
                            <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              منتهي
                            </span>
                          ) : e.isActive ? (
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                              نشط / متاح
                            </span>
                          ) : (
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              معطل
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground font-semibold">
                          {e.course.title}
                        </td>
                        <td className="px-4 py-3 text-foreground font-mono font-bold tracking-wider">
                          {e.code}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لا توجد رموز التحاق مطابقة للبحث.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog for new Coupon */}
      <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              إنشاء كوبون خصم جديد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCoupon} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                اختر الدورة التدريبية
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">-- اختر الدورة --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  نوع الخصم
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="PERCENTAGE">نسبة مئوية (%)</option>
                  <option value="FIXED">مبلغ ثابت (ج.م)</option>
                  <option value="FREE">مجاني بالكامل (100%)</option>
                </select>
              </div>

              {discountType !== "FREE" && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    قيمة الخصم
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                    placeholder={discountType === "PERCENTAGE" ? "مثال: 20" : "مثال: 50"}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  تاريخ الانتهاء (اختياري)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  الحد الأقصى للاستخدام
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              توليد الكوبون
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for new Enrollment Code */}
      <Dialog open={isEnrollmentDialogOpen} onOpenChange={setIsEnrollmentDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              توليد كود التحاق مجاني
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEnrollmentCode} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                اختر الدورة التدريبية
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">-- اختر الدورة --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                تحديد بريد إلكتروني لطالب معين (اختياري)
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="طالب@بريد.كوم (اتركه فارغاً ليصبح الكود عاماً)"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                تاريخ انتهاء صلاحية الكود (اختياري)
              </label>
              <input
                type="date"
                value={enrollmentExpiresAt}
                onChange={(e) => setEnrollmentExpiresAt(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center"
              />
            </div>

            <div className="rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/25 flex items-start gap-3">
              <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 font-semibold leading-relaxed">
                كود الالتحاق هو رمز استخدام لمرة واحدة فقط. عند قيام الطالب بإدخال الكود، سيتم
                اشتراكه في الدورة مجاناً (100% خصم) وسيتم ربط الكود بحسابه مباشرة ولا يمكن استخدامه
                مرة أخرى.
              </p>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              توليد كود الالتحاق
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
