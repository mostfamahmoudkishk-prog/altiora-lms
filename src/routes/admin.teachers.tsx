import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Loader2,
  BookOpen,
  UserMinus,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getAdminTeachersFn,
  createTeacherFn,
  updateTeacherFn,
  suspendTeacherFn,
  deleteTeacherFn,
  reactivateTeacherFn,
  getFeaturedInstructorFn,
  updateFeaturedInstructorFn,
  removeFeaturedInstructorFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/admin/teachers")({
  component: AdminTeachers,
});

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  coursesCount: number;
  studentsCount: number;
  revenue: number;
  sales: number;
  isFeatured?: boolean;
  canCustomizeBranding?: boolean;
}

function AdminTeachers() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFeaturedOpen, setIsFeaturedOpen] = useState(false);

  // Featured Instructor states
  const [featuredTeacher, setFeaturedTeacher] = useState<TeacherItem | null>(null);
  const [featuredEnabled, setFeaturedEnabled] = useState(true);
  const [featuredPriority, setFeaturedPriority] = useState(0);
  const [featuredBadgeLabel, setFeaturedBadgeLabel] = useState("مدرس مميز ⭐");
  const [featuredBadgeColor, setFeaturedBadgeColor] = useState("GOLD");

  const handleOpenFeatured = async (teacher: TeacherItem) => {
    setFeaturedTeacher(teacher);
    try {
      const res = await getFeaturedInstructorFn({ data: { instructorId: teacher.id } });
      if (res) {
        setFeaturedEnabled(res.enabled);
        setFeaturedPriority(res.priority);
        setFeaturedBadgeLabel(res.badgeLabel || "مدرس مميز ⭐");
        setFeaturedBadgeColor(res.badgeColor || "GOLD");
      } else {
        setFeaturedEnabled(false);
        setFeaturedPriority(0);
        setFeaturedBadgeLabel("مدرس مميز ⭐");
        setFeaturedBadgeColor("GOLD");
      }
      setIsFeaturedOpen(true);
    } catch (err: any) {
      toast.error("فشل تحميل إعدادات التميز: " + err.message);
    }
  };

  const handleSaveFeatured = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featuredTeacher) return;

    setActionLoading(true);
    try {
      if (featuredEnabled) {
        await updateFeaturedInstructorFn({
          data: {
            instructorId: featuredTeacher.id,
            priority: Number(featuredPriority),
            badgeLabel: featuredBadgeLabel,
            badgeColor: featuredBadgeColor,
            enabled: true,
          },
        });
      } else {
        await removeFeaturedInstructorFn({
          data: {
            instructorId: featuredTeacher.id,
          },
        });
      }
      toast.success("تم تحديث إعدادات التميز للمعلم بنجاح!");
      setIsFeaturedOpen(false);
      loadTeachers();
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [formCanCustomizeBranding, setFormCanCustomizeBranding] = useState(false);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = () => {
    setLoading(true);
    getAdminTeachersFn()
      .then((res: any) => {
        setTeachers(res || []);
      })
      .catch((err) => {
        toast.error("فشل تحميل قائمة المعلمين: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormSubject("");
    setFormPassword("");
    setFormCanCustomizeBranding(false);
    setIsCreateOpen(true);
  };

  // Create Teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPhone || !formSubject || !formPassword) {
      toast.error("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    setActionLoading(true);
    try {
      await createTeacherFn({
        data: {
          name: formName,
          email: formEmail,
          phone: formPhone,
          subject: formSubject,
          password: formPassword,
          canCustomizeBranding: formCanCustomizeBranding,
        },
      });
      toast.success("تم إنشاء حساب المعلم بنجاح.");
      setIsCreateOpen(false);
      loadTeachers();
    } catch (err: any) {
      toast.error(err.message || "فشل إنشاء حساب المعلم.");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (t: TeacherItem) => {
    setActiveTeacher(t);
    setFormName(t.name);
    setFormEmail(t.email);
    setFormPhone(t.phone);
    setFormSubject(t.subject);
    setFormStatus(t.status === "DELETED" ? "ACTIVE" : (t.status as "ACTIVE" | "SUSPENDED"));
    setFormCanCustomizeBranding(t.canCustomizeBranding || false);
    setIsEditOpen(true);
  };

  // Edit Teacher
  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) return;

    if (!formName || !formEmail || !formPhone || !formSubject) {
      toast.error("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    setActionLoading(true);
    try {
      await updateTeacherFn({
        data: {
          id: activeTeacher.id,
          name: formName,
          email: formEmail,
          phone: formPhone,
          subject: formSubject,
          status: formStatus,
          canCustomizeBranding: formCanCustomizeBranding,
        },
      });
      toast.success("تم تحديث بيانات المعلم بنجاح.");
      setIsEditOpen(false);
      setActiveTeacher(null);
      loadTeachers();
    } catch (err: any) {
      toast.error(err.message || "فشل تحديث بيانات المعلم.");
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend / Activate teacher
  const handleToggleStatus = async (id: string, currentStatus: "ACTIVE" | "SUSPENDED") => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await suspendTeacherFn({
        data: { id, status: nextStatus },
      });
      toast.success(
        nextStatus === "SUSPENDED"
          ? "تم إيقاف حساب المعلم بنجاح."
          : "تم إلغاء إيقاف وتفعيل حساب المعلم.",
      );
      loadTeachers();
    } catch (err: any) {
      toast.error("فشل تغيير حالة الحساب: " + err.message);
    }
  };

  // Soft Delete Teacher
  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف حساب المعلم هذا (حذف مؤقت)؟")) return;

    try {
      await deleteTeacherFn({ data: { id } });
      toast.success("تم حذف حساب المعلم مؤقتاً.");
      loadTeachers();
    } catch (err: any) {
      toast.error(err.message || "فشل حذف حساب المعلم.");
    }
  };

  // Reactivate Teacher
  const handleReactivateTeacher = async (id: string) => {
    try {
      await reactivateTeacherFn({ data: { id } });
      toast.success("تم إعادة تنشيط وتفعيل حساب المعلم بنجاح.");
      loadTeachers();
    } catch (err: any) {
      toast.error("فشل إعادة تنشيط الحساب: " + err.message);
    }
  };

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers
      .filter((t) => {
        if (filterStatus === "ALL") return true;
        return t.status === filterStatus;
      })
      .filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.email.toLowerCase().includes(search.toLowerCase()) ||
          t.phone.includes(search) ||
          t.subject.toLowerCase().includes(search.toLowerCase()),
      );
  }, [teachers, filterStatus, search]);

  const paginatedTeachers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredTeachers.slice(start, start + itemsPerPage);
  }, [filteredTeachers, page]);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage) || 1;

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent +=
      "الاسم,البريد الإلكتروني,الهاتف,المادة,الحالة,عدد الدورات,عدد الطلاب,المبيعات,الإيرادات\n";
    filteredTeachers.forEach((t) => {
      csvContent += `"${t.name}","${t.email}","${t.phone}","${t.subject}","${t.status}","${t.coursesCount}","${t.studentsCount}","${t.sales}","${t.revenue}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `قائمة_المعلمين_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير قائمة المعلمين بنجاح");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary me-2" />
        جارٍ تحميل قائمة وإحصائيات المعلمين…
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
            <FileText className="size-4 text-blue-500" /> طباعة
          </button>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-95 shadow-card transition-all"
          >
            <Plus className="size-4" /> إضافة معلم جديد
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
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary font-bold text-foreground"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="SUSPENDED">موقوف</option>
            <option value="DELETED">محذوف مؤقتاً</option>
          </select>
          <input
            type="search"
            placeholder="البحث باسم المعلم، البريد، الهاتف أو المادة..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-80 text-end"
          />
        </div>
      </div>

      {/* Teachers table */}
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">إجمالي الإيرادات</th>
              <th className="px-5 py-4">المبيعات</th>
              <th className="px-5 py-4">الطلاب</th>
              <th className="px-5 py-4">الدورات</th>
              <th className="px-5 py-4">المادة</th>
              <th className="px-5 py-4">الهاتف</th>
              <th className="px-5 py-4">الحالة</th>
              <th className="px-5 py-4">المعلم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-semibold">
            {paginatedTeachers.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-secondary/20">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    {t.status === "DELETED" ? (
                      <button
                        onClick={() => handleReactivateTeacher(t.id)}
                        className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-500/10 transition-all"
                        title="إعادة تنشيط حساب المعلم"
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            handleToggleStatus(t.id, t.status as "ACTIVE" | "SUSPENDED")
                          }
                          className={`rounded-lg p-1.5 transition-all ${
                            t.status === "ACTIVE"
                              ? "text-amber-500 hover:bg-amber-500/10"
                              : "text-success hover:bg-success/10"
                          }`}
                          title={t.status === "ACTIVE" ? "إيقاف حساب المعلم" : "تنشيط حساب المعلم"}
                        >
                          {t.status === "ACTIVE" ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenFeatured(t)}
                          className={`rounded-lg p-1.5 transition-all ${
                            t.isFeatured
                              ? "text-amber-500 hover:bg-amber-500/10"
                              : "text-muted-foreground hover:bg-secondary/40"
                          }`}
                          title="إعدادات المعلم المتميز"
                        >
                          <Star className={`size-4 ${t.isFeatured ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="rounded-lg p-1.5 text-primary hover:bg-secondary transition-all"
                          title="تعديل تفاصيل المعلم"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(t.id)}
                          className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-all"
                          title="حذف مؤقت"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 font-semibold text-primary">
                  {t.revenue.toLocaleString()} ج.م
                </td>
                <td className="px-5 py-3 text-foreground">{t.sales} مبيعة</td>
                <td className="px-5 py-3 text-foreground">{t.studentsCount} طالب</td>
                <td className="px-5 py-3 text-muted-foreground">{t.coursesCount} دورة</td>
                <td className="px-5 py-3 text-foreground">{t.subject}</td>
                <td className="px-5 py-3 text-muted-foreground font-mono">{t.phone}</td>
                <td className="px-5 py-3">
                  {t.status === "ACTIVE" ? (
                    <span className="rounded bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                      نشط
                    </span>
                  ) : t.status === "SUSPENDED" ? (
                    <span className="rounded bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                      موقوف
                    </span>
                  ) : (
                    <span className="rounded bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                      محذوف مؤقتاً
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col items-end">
                    <span className="text-foreground text-sm font-bold">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{t.email}</span>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedTeachers.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground">
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

      {/* Create Teacher Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              إضافة معلم جديد للمنصة
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeacher} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الاسم الكامل للمعلم
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                placeholder="أحمد علي..."
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                البريد الإلكتروني (لتسجيل الدخول)
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                placeholder="teacher@altiora.com"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  placeholder="01xxxxxxxxx"
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  المادة الدراسية / التخصص
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                  placeholder="اللغة العربية..."
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                كلمة المرور المؤقتة للمعلم
              </label>
              <input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                placeholder="حد أدنى 6 أحرف"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2 p-1.5 rounded-xl border border-border bg-secondary/10">
              <label className="flex items-center gap-2 cursor-pointer select-none justify-end">
                <span className="text-xs font-semibold text-muted-foreground">
                  تفعيل إمكانية تخصيص الهوية البصرية (Branding)
                </span>
                <input
                  type="checkbox"
                  checked={formCanCustomizeBranding}
                  onChange={(e) => setFormCanCustomizeBranding(e.target.checked)}
                  className="size-4 rounded border-border bg-card text-primary focus:ring-primary"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              حفظ وإنشاء حساب المعلم
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(v) => {
          if (!v) {
            setIsEditOpen(false);
            setActiveTeacher(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              تعديل بيانات المعلم
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTeacher} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الاسم الكامل
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  المادة / التخصص
                </label>
                <input
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                حالة الحساب
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary font-semibold text-foreground"
              >
                <option value="ACTIVE">نشط (مفعل)</option>
                <option value="SUSPENDED">موقوف (معطل)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 p-1.5 rounded-xl border border-border bg-secondary/10">
              <label className="flex items-center gap-2 cursor-pointer select-none justify-end">
                <span className="text-xs font-semibold text-muted-foreground">
                  تفعيل إمكانية تخصيص الهوية البصرية (Branding)
                </span>
                <input
                  type="checkbox"
                  checked={formCanCustomizeBranding}
                  onChange={(e) => setFormCanCustomizeBranding(e.target.checked)}
                  className="size-4 rounded border-border bg-card text-primary focus:ring-primary"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              حفظ التعديلات
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Featured Instructor Dialog */}
      <Dialog open={isFeaturedOpen} onOpenChange={setIsFeaturedOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-2xl p-5 text-end bg-card border border-border"
        >
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="font-display text-base font-bold text-foreground">
              تهيئة إعدادات المعلم المتميز ⭐
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              تحديد الشارات والأولوية للمعلم {featuredTeacher?.name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFeatured} className="space-y-4 pt-3">
            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between border border-border rounded-xl p-3 bg-secondary/10">
              <button
                type="button"
                onClick={() => setFeaturedEnabled(!featuredEnabled)}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${featuredEnabled ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`size-4 rounded-full bg-white transition-transform ${featuredEnabled ? "-translate-x-6" : "-translate-x-1"}`}
                />
              </button>
              <div className="text-end">
                <span className="block text-xs font-bold text-foreground">تفعيل حالة التميز</span>
                <span className="text-[10px] text-muted-foreground">
                  عرض الشارات ورفع ترتيب البحث عند التفعيل.
                </span>
              </div>
            </div>

            {featuredEnabled && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    اسم الشارة المخصصة (badgeLabel)
                  </label>
                  <input
                    type="text"
                    value={featuredBadgeLabel}
                    onChange={(e) => setFeaturedBadgeLabel(e.target.value)}
                    required
                    placeholder="مثال: مدرس مميز ⭐"
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-end"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      أولوية الترتيب (priority)
                    </label>
                    <input
                      type="number"
                      value={featuredPriority}
                      onChange={(e) => setFeaturedPriority(Number(e.target.value))}
                      required
                      min={0}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      لون الشارة
                    </label>
                    <select
                      value={featuredBadgeColor}
                      onChange={(e) => setFeaturedBadgeColor(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary font-semibold text-foreground"
                    >
                      <option value="GOLD">ذهبي (GOLD)</option>
                      <option value="PURPLE">بنفسجي (PURPLE)</option>
                      <option value="BLUE">أزرق (BLUE)</option>
                      <option value="EMERALD">أخضر (EMERALD)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all mt-4"
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" />}
              حفظ إعدادات التميز
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
