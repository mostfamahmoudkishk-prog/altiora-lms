import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Archive,
  Star,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getCoursesFn,
  createCourseFn,
  updateCourseFn,
  softDeleteCourseFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/admin/courses")({
  component: AdminCourses,
});

interface CourseItem {
  id: string;
  title: string;
  img: string;
  categories: string;
  price: string;
  instructorName: string;
  featured: boolean;
  status: "PUBLISHED" | "ARCHIVED" | "DRAFT";
  isDeleted?: boolean;
}

function AdminCourses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCourse, setActiveCourse] = useState<CourseItem | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterFeatured, setFilterFeatured] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Add/Edit Form states
  const [formTitle, setFormTitle] = useState("");
  const [formImg, setFormImg] = useState("");
  const [formCat, setFormCat] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formInstructor, setFormInstructor] = useState("أحمد علي");
  const [formStatus, setFormStatus] = useState<"PUBLISHED" | "ARCHIVED" | "DRAFT">("PUBLISHED");
  const [formFeatured, setFormFeatured] = useState(false);

  const loadCourses = async () => {
    try {
      const res = await getCoursesFn();
      const mapped: CourseItem[] = res.map((c: any) => {
        const primaryInstructor = c.instructors?.[0]?.instructor?.profile?.name || "النظام";
        return {
          id: c.id,
          title: c.title,
          img:
            c.coverImage ||
            "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
          categories: c.category?.name || "عام",
          price: Number(c.price).toFixed(2),
          instructorName: primaryInstructor,
          featured: c.isFeatured,
          status: c.isArchived ? "ARCHIVED" : "PUBLISHED",
        };
      });
      setCourses(mapped);
    } catch (err: any) {
      toast.error("فشل تحميل الكورسات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Sort: Featured courses MUST appear first!
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return sortedCourses
      .filter((c) => !c.isDeleted)
      .filter(
        (c) =>
          filterFeatured === "ALL" ||
          (filterFeatured === "YES" && c.featured) ||
          (filterFeatured === "NO" && !c.featured),
      )
      .filter((c) => filterStatus === "ALL" || c.status === filterStatus)
      .filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.instructorName.toLowerCase().includes(search.toLowerCase()),
      );
  }, [sortedCourses, filterFeatured, filterStatus, search]);

  const paginatedCourses = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCourses.slice(start, start + itemsPerPage);
  }, [filteredCourses, page]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;

  // Toggle Featured status
  const handleToggleFeatured = async (id: string, currentVal: boolean) => {
    try {
      const res = await updateCourseFn({
        data: {
          id,
          isFeatured: !currentVal,
        },
      });
      if (res.success) {
        toast.success(!currentVal ? "تمت إضافة النجمة المميزة للدورة ⭐" : "تم إلغاء تمييز الدورة");
        loadCourses();
      } else {
        toast.error("فشل تعديل حالة التمييز: " + res.message);
      }
    } catch (err: any) {
      toast.error("فشل تعديل حالة التمييز: " + err.message);
    }
  };

  // Toggle Archive status
  const handleToggleArchive = async (
    id: string,
    currentStatus: "PUBLISHED" | "ARCHIVED" | "DRAFT",
  ) => {
    const isArchived = currentStatus === "ARCHIVED";
    try {
      const res = await updateCourseFn({
        data: {
          id,
          isArchived: !isArchived,
        },
      });
      if (res.success) {
        toast.success(!isArchived ? "تم أرشفة الدورة بنجاح" : "تم إلغاء أرشفة الدورة ونشرها");
        loadCourses();
      } else {
        toast.error("فشل تعديل حالة الأرشفة: " + res.message);
      }
    } catch (err: any) {
      toast.error("فشل تعديل حالة الأرشفة: " + err.message);
    }
  };

  // Soft Delete course
  const handleSoftDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدورة؟ (سيتم إخفاؤها مؤقتاً)")) return;
    try {
      await softDeleteCourseFn({ data: { id } });
      toast.success("تم حذف الدورة (حذف مؤقت)");
      loadCourses();
    } catch (err: any) {
      toast.error("فشل حذف الدورة: " + err.message);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    setFormTitle("");
    setFormImg(
      "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
    );
    setFormCat("");
    setFormPrice("");
    setFormInstructor("أحمد علي");
    setFormStatus("PUBLISHED");
    setFormFeatured(false);
    setIsAddMode(true);
    setActiveCourse({
      id: "",
      title: "",
      img: "",
      categories: "",
      price: "",
      instructorName: "",
      featured: false,
      status: "PUBLISHED",
    });
  };

  // Open Edit Dialog
  const handleOpenEdit = (c: CourseItem) => {
    setFormTitle(c.title);
    setFormImg(c.img);
    setFormCat(c.categories);
    setFormPrice(c.price);
    setFormInstructor(c.instructorName);
    setFormStatus(c.status);
    setFormFeatured(c.featured);
    setIsAddMode(false);
    setActiveCourse(c);
  };

  // Save changes
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;

    try {
      if (isAddMode) {
        const res = await createCourseFn({
          data: {
            title: formTitle,
            price: parseFloat(formPrice) || 0,
            categoryName: formCat,
            coverImage: formImg,
            isFeatured: formFeatured,
            instructorName: formInstructor,
          },
        });
        if (res.success) {
          toast.success("تم إنشاء الدورة الجديدة بنجاح");
          setActiveCourse(null);
          loadCourses();
        } else {
          toast.error("فشل حفظ الدورة: " + res.message);
        }
      } else {
        const res = await updateCourseFn({
          data: {
            id: activeCourse.id,
            title: formTitle,
            price: parseFloat(formPrice) || 0,
            categoryName: formCat,
            coverImage: formImg,
            isFeatured: formFeatured,
            isArchived: formStatus === "ARCHIVED",
            instructorName: formInstructor,
          },
        });
        if (res.success) {
          toast.success("تم حفظ التعديلات بنجاح");
          setActiveCourse(null);
          loadCourses();
        } else {
          toast.error("فشل حفظ الدورة: " + res.message);
        }
      }
    } catch (err: any) {
      toast.error("فشل حفظ الدورة: " + err.message);
    }
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "الكود,عنوان الدورة,التصنيف,السعر,المدرس,الحالة,مميزة\n";
    filteredCourses.forEach((c) => {
      csvContent += `"${c.id}","${c.title}","${c.categories}","${c.price} ج.م","${c.instructorName}","${c.status}","${c.featured ? "نعم" : "لا"}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "courses_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير قائمة الدورات بنجاح");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Top tools bar */}
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
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
          >
            <Plus className="size-4" /> إنشاء دورة جديدة
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
            <option value="PUBLISHED">منشورة</option>
            <option value="ARCHIVED">مؤرشفة</option>
            <option value="DRAFT">مسودة</option>
          </select>

          <select
            value={filterFeatured}
            onChange={(e) => {
              setFilterFeatured(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">التمييز (الكل)</option>
            <option value="YES">المميز ⭐</option>
            <option value="NO">العادي</option>
          </select>

          <input
            type="search"
            placeholder="البحث بالدورة أو المدرس..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
          />
        </div>
      </div>

      {/* Courses list table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">حالة النشر</th>
              <th className="px-5 py-4">السعر</th>
              <th className="px-5 py-4">المعلم</th>
              <th className="px-5 py-4">التصنيف</th>
              <th className="px-5 py-4">عنوان الدورة</th>
              <th className="px-5 py-4">الكود</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="animate-spin inline-block me-2 size-4 text-primary" />
                  جاري تحميل الدورات...
                </td>
              </tr>
            ) : paginatedCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة للبحث
                </td>
              </tr>
            ) : (
              paginatedCourses.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-secondary/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSoftDelete(c.id)}
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                        title="حذف مؤقت"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        onClick={() => handleToggleArchive(c.id, c.status)}
                        className={`rounded-lg p-1.5 ${
                          c.status === "ARCHIVED"
                            ? "text-emerald-500 hover:bg-emerald-500/10"
                            : "text-amber-500 hover:bg-amber-500/10"
                        }`}
                        title={c.status === "ARCHIVED" ? "إلغاء الأرشفة" : "أرشفة الدورة"}
                      >
                        <Archive className="size-4" />
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(c.id, c.featured)}
                        className={`rounded-lg p-1.5 ${
                          c.featured
                            ? "text-amber-500 hover:bg-amber-500/10"
                            : "text-muted-foreground hover:bg-secondary"
                        }`}
                        title="تمييز الدورة ⭐"
                      >
                        <Star
                          className={`size-4 ${c.featured ? "fill-amber-500 text-amber-500" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="rounded-lg p-1.5 text-primary hover:bg-secondary"
                        title="تعديل"
                      >
                        <Edit className="size-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {c.status === "PUBLISHED" ? (
                      <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        منشورة
                      </span>
                    ) : c.status === "ARCHIVED" ? (
                      <span className="rounded bg-secondary-foreground/10 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                        مؤرشفة
                      </span>
                    ) : (
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                        مسودة
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-primary">{c.price} ج.م</td>
                  <td className="px-5 py-3 font-medium text-foreground">{c.instructorName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.categories}</td>
                  <td className="px-5 py-3 font-bold text-foreground">
                    <div className="flex items-center justify-end gap-2">
                      {c.featured && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                          ⭐ مميز
                        </span>
                      )}
                      <span>{c.title}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{c.id}</td>
                </tr>
              ))
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

      {/* Create / Edit Dialog */}
      <Dialog open={!!activeCourse} onOpenChange={() => setActiveCourse(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              {isAddMode ? "إنشاء دورة تعليمية جديدة" : "تعديل بيانات الدورة"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCourse} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                عنوان الدورة
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                المادة / التصنيف
              </label>
              <input
                type="text"
                placeholder="مثال: رياضيات، إنجليزي"
                value={formCat}
                onChange={(e) => setFormCat(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  المدرس المسؤول
                </label>
                <select
                  value={formInstructor}
                  onChange={(e) => setFormInstructor(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="أحمد علي">أحمد علي</option>
                  <option value="إبرام رفيق">إبرام رفيق</option>
                  <option value="منى عبد المجيد">منى عبد المجيد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  السعر (ج.م)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                رابط الصورة المعبرة
              </label>
              <input
                type="text"
                value={formImg}
                onChange={(e) => setFormImg(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFormFeatured(!formFeatured)}
                  className={`flex h-6 w-11 items-center rounded-full transition-colors ${formFeatured ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`size-4 rounded-full bg-white transition-transform ${formFeatured ? "-translate-x-6" : "-translate-x-1"}`}
                  />
                </button>
                <span className="text-xs font-semibold text-foreground">دورة مميزة ⭐</span>
              </div>

              <div>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="PUBLISHED">منشورة (Published)</option>
                  <option value="ARCHIVED">مؤرشفة (Archived)</option>
                  <option value="DRAFT">مسودة (Draft)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              حفظ وتطبيق
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
