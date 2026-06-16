import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Trash2,
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BookOpen,
  ArrowUpRight,
  HelpCircle,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { getCoursesFn, updateCourseFn, softDeleteCourseFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/courses")({
  component: SuperAdminCourses,
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

function SuperAdminCourses() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

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
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.instructorName.toLowerCase().includes(search.toLowerCase()),
      );
  }, [sortedCourses, search]);

  const paginatedCourses = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCourses.slice(start, start + itemsPerPage);
  }, [filteredCourses, page]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage) || 1;

  const handleToggleFeatured = async (id: string, currentVal: boolean) => {
    try {
      const res = await updateCourseFn({
        data: {
          id,
          isFeatured: !currentVal,
        },
      });
      if (res.success) {
        toast.success(!currentVal ? "تم تمييز الدورة وعرضها أولاً بنجاح" : "تم إلغاء تمييز الدورة");
        loadCourses();
      } else {
        toast.error("فشل تعديل حالة التمييز: " + res.message);
      }
    } catch (err: any) {
      toast.error("فشل تعديل حالة التمييز: " + err.message);
    }
  };

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
        toast.success(!isArchived ? "تم أرشفة الدورة بنجاح" : "تم فك الأرشفة وتفعيل الدورة بنجاح");
        loadCourses();
      } else {
        toast.error("فشل تعديل حالة الأرشفة: " + res.message);
      }
    } catch (err: any) {
      toast.error("فشل تعديل حالة الأرشفة: " + err.message);
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدورة؟")) return;
    try {
      await softDeleteCourseFn({ data: { id } });
      toast.success("تم حذف الدورة بنجاح");
      loadCourses();
    } catch (err: any) {
      toast.error("فشل حذف الدورة: " + err.message);
    }
  };

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
        <div className="relative w-full sm:w-64">
          <input
            type="search"
            placeholder="البحث باسم الكورس أو المعلم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end font-bold"
          />
          <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
        </div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            التحكم العام بالدورات
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            إشراف متكامل على جميع الدورات التدريبية المرفوعة في المنصة، وتحديد التمييز، والأرشفة، وإدارة العرض.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.04)]">
        {loading ? (
          <div className="p-10 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
            ))}
          </div>
        ) : paginatedCourses.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-bold">
            لا توجد دورات مطابقة للبحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-end text-sm text-zinc-300">
              <thead>
                <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                  <th className="px-6 py-4">الخيارات</th>
                  <th className="px-6 py-4">حالة النشر</th>
                  <th className="px-6 py-4">السعر</th>
                  <th className="px-6 py-4">المعلم</th>
                  <th className="px-6 py-4">التصنيف</th>
                  <th className="px-6 py-4">عنوان الدورة</th>
                  <th className="px-6 py-4">الكود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {paginatedCourses.map((c) => (
                  <tr
                    key={c.id}
                    className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSoftDelete(c.id)}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 transition-all"
                          title="حذف مؤقت"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(c.id, c.status)}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-500/10 transition-all"
                          title="أرشفة"
                        >
                          <Archive className="size-4" />
                        </button>
                        <button
                          onClick={() => handleToggleFeatured(c.id, c.featured)}
                          className={`rounded-lg p-2 transition-all ${
                            c.featured
                              ? "text-amber-400 hover:bg-amber-500/15"
                              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                          }`}
                          title="تمييز"
                        >
                          <Star
                            className={`size-4 ${c.featured ? "fill-amber-400 text-amber-400" : ""}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.status === "PUBLISHED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          منشور
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-bold text-zinc-400 border border-zinc-500/20">
                          مؤرشف
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-amber-400">{c.price} ج.م</td>
                    <td className="px-6 py-4 font-bold text-white">{c.instructorName}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/5 px-2 py-0.5 text-[11px] font-semibold text-zinc-300 border border-amber-500/10">
                        {c.categories}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      <div className="flex items-center justify-end gap-2">
                        {c.featured && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                            مميز
                          </span>
                        )}
                        <span>{c.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 font-mono">{c.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page === totalPages}
            onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
            className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="text-xs text-zinc-400 font-bold">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page === 1}
            onClick={() => setPage((v) => Math.max(v - 1, 1))}
            className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
