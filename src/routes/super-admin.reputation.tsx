import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Star,
  Check,
  X,
  Trash2,
  AlertTriangle,
  Bookmark,
  BookmarkMinus,
  Search,
  Filter,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { getAdminAllReviewsFn, moderateReviewFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/reputation")({
  component: SuperAdminReputation,
});

interface ReviewItem {
  id: string;
  teacherId: string;
  studentId: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  isPinned: boolean;
  isSuspicious: boolean;
  created_at: string;
  student?: {
    email: string;
    profile?: {
      name: string;
      avatarUrl: string | null;
    };
    enrollments?: any[];
  };
  teacher?: {
    profile?: {
      name: string;
    };
  };
}

function SuperAdminReputation() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "SUSPICIOUS" | "PINNED"
  >("ALL");

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await getAdminAllReviewsFn();
      setReviews(res || []);
    } catch (err: any) {
      toast.error("فشل تحميل التقييمات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleModerate = async (
    reviewId: string,
    action: "APPROVE" | "HIDE" | "DELETE" | "PIN" | "UNPIN",
  ) => {
    try {
      toast.loading("جاري تعديل حالة التقييم...");
      await moderateReviewFn({
        data: {
          reviewId,
          action,
        },
      });
      toast.success("تم تحديث حالة التقييم وتعديل إحصائيات المعلم!");
      loadReviews();
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => !r.isApproved).length;
    const suspicious = reviews.filter((r) => r.isSuspicious).length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 5.0;

    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        counts[r.rating - 1]++;
      }
    });

    return {
      total,
      pending,
      suspicious,
      average: Number(avg.toFixed(2)),
      distribution: counts,
    };
  }, [reviews]);

  const filtered = reviews.filter((rev) => {
    const studentName = rev.student?.profile?.name?.toLowerCase() || "";
    const teacherName = rev.teacher?.profile?.name?.toLowerCase() || "";
    const comment = rev.comment?.toLowerCase() || "";
    const query = search.toLowerCase();

    const matchesSearch =
      studentName.includes(query) || teacherName.includes(query) || comment.includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === "PENDING") return !rev.isApproved;
    if (statusFilter === "APPROVED") return rev.isApproved;
    if (statusFilter === "SUSPICIOUS") return rev.isSuspicious;
    if (statusFilter === "PINNED") return rev.isPinned;
    return true;
  });

  if (loading) {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center bg-black min-h-screen"
        dir="rtl"
      >
        <div className="animate-pulse bg-neutral-800 rounded-3xl p-8 flex flex-col items-center gap-4">
          <div className="size-10 rounded-full bg-neutral-700 animate-bounce"></div>
          <div className="h-4 w-48 bg-neutral-700 rounded"></div>
          <div className="h-3 w-32 bg-neutral-700 rounded mt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end p-6 bg-transparent font-display text-white" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            إدارة السمعة والتقييمات
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            مراجعة تقييمات الطلاب وتصفية التعليقات غير المرغوبة، وضمان موثوقية ونزاهة آراء
            المشتركين.
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Average Rating Card */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-2 flex flex-col justify-center">
          <span className="text-zinc-400 text-xs font-bold block">متوسط تقييمات المنصة</span>
          <div className="flex items-center justify-center gap-1">
            <span className="font-mono text-3xl font-black text-amber-500">{stats.average}</span>
            <Star className="size-6 text-amber-500 fill-amber-500" />
          </div>
          <span className="text-[10px] text-zinc-500">من إجمالي {stats.total} تقييم مقدم</span>
        </div>

        {/* Pending approvals */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-1">
          <span className="text-zinc-400 text-xs font-bold block">تقييمات بانتظار المراجعة</span>
          <span className="font-mono text-3xl font-black text-amber-500">{stats.pending}</span>
          <span className="text-[10px] text-amber-500 block">تتطلب تفعيل للظهور</span>
        </div>

        {/* Suspicious spam alerts */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-1">
          <span className="text-zinc-400 text-xs font-bold block">تقييمات مشبوهة / سبام</span>
          <span
            className={`font-mono text-3xl font-black ${stats.suspicious > 0 ? "text-red-400" : "text-zinc-500"}`}
          >
            {stats.suspicious}
          </span>
          <span className="text-[10px] text-zinc-500 block">
            تم رصدها تلقائياً بالذكاء الاصطناعي
          </span>
        </div>

        {/* Ratings distribution */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-1.5 text-xs">
          <span className="text-zinc-400 text-[10px] font-bold block text-center">
            توزيع تقييم النجوم
          </span>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = stats.distribution[stars - 1] || 0;
            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-2 justify-end">
                <span className="text-zinc-400 w-8 text-left">{count}</span>
                <div className="h-1.5 flex-1 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${pct}%` }}></div>
                </div>
                <span className="font-mono font-bold text-[10px] w-12 text-end flex items-center justify-end gap-0.5">
                  <span>{stars}</span>
                  <Star className="size-2.5 text-amber-500 fill-amber-500" />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-neutral-900/30 p-4 lg:flex-row">
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:border-amber-500 text-end font-bold"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="PENDING">بانتظار الموافقة</option>
            <option value="APPROVED">الموافقة والنشطة</option>
            <option value="SUSPICIOUS">المشبوهة (Spam Detections)</option>
            <option value="PINNED">المثبتة في القمة</option>
          </select>
          <Filter className="size-4 text-zinc-500" />
        </div>

        <div className="w-full flex-1 relative lg:max-w-md">
          <input
            type="search"
            placeholder="البحث باسم المدرس، الطالب، أو التعليق..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end"
          />
          <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((rev) => {
          const isVerified = (rev.student?.enrollments?.length || 0) > 0;
          const hasCompleted = rev.student?.enrollments?.some(
            (e: any) => e.progressPercent === 100,
          );

          return (
            <div
              key={rev.id}
              className={`relative rounded-3xl border p-5 space-y-4 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)] transition-all hover:scale-[1.01] ${
                rev.isSuspicious
                  ? "border-red-500/30 bg-red-950/5"
                  : rev.isPinned
                    ? "border-amber-500/40 bg-amber-500/[0.02]"
                    : rev.isApproved
                      ? "border-amber-500/10"
                      : "border-amber-500/20 bg-amber-500/[0.01]"
              }`}
            >
              {/* Suspicious Spam Label */}
              {rev.isSuspicious && (
                <div className="absolute top-4 left-4 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-0.5 text-[9px] font-black text-red-400 flex items-center gap-1">
                  <AlertTriangle className="size-3" /> تقييم مشبوه (Review Bombing)
                </div>
              )}

              {/* Pinned Label */}
              {rev.isPinned && !rev.isSuspicious && (
                <div className="absolute top-4 left-4 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-0.5 text-[9px] font-black text-amber-400 flex items-center gap-1">
                  <Bookmark className="size-3 fill-amber-400" /> مثبت في القمة
                </div>
              )}

              {/* Student & Teacher Info Header */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${
                        i < rev.rating ? "fill-amber-500 text-amber-400" : "text-zinc-800"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <h4 className="font-extrabold text-xs text-white">
                      {rev.student?.profile?.name || "طالب منصة ألتيورا"}
                    </h4>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">
                      تقييم للمدرس:{" "}
                      <span className="text-amber-500 font-bold">{rev.teacher?.profile?.name}</span>
                    </span>
                  </div>
                  <div className="size-9 bg-zinc-900 border border-zinc-850 rounded-full flex items-center justify-center overflow-hidden">
                    {rev.student?.profile?.avatarUrl ? (
                      <img
                        src={rev.student.profile.avatarUrl}
                        alt="Avatar"
                        className="size-full object-cover"
                      />
                    ) : (
                      <User className="size-4 text-zinc-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Comment text */}
              <div className="text-xs text-zinc-300 leading-relaxed min-h-12 bg-neutral-900/30 p-3 rounded-xl border border-zinc-900">
                {rev.comment || (
                  <span className="text-zinc-600 italic">
                    قام بالطالب بإدخال تقييم نجوم فقط بدون تعليق مكتوب.
                  </span>
                )}
              </div>

              {/* Student badges */}
              <div className="flex justify-end gap-1.5 flex-wrap">
                {hasCompleted && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-2 py-0.5 font-bold">
                    أكمل الدورة بنسبة 100%
                  </span>
                )}
                {isVerified && (
                  <span className="text-[9px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded px-2 py-0.5 font-bold">
                    طالب مسجل وحقيقي
                  </span>
                )}
                <span className="text-[9px] text-zinc-500 mr-auto self-center font-mono">
                  {new Date(rev.created_at).toLocaleDateString("ar-EG")}
                </span>
              </div>

              {/* Administrative actions */}
              <div className="flex gap-2 border-t border-zinc-900 pt-3">
                <button
                  onClick={() => handleModerate(rev.id, "DELETE")}
                  className="rounded-xl p-2 text-red-400 bg-red-950/20 border border-red-500/10 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                  title="حذف نهائياً"
                >
                  <Trash2 className="size-3.5" />
                </button>

                {rev.isApproved ? (
                  <button
                    onClick={() => handleModerate(rev.id, "HIDE")}
                    className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    إخفاء التعليق
                  </button>
                ) : (
                  <button
                    onClick={() => handleModerate(rev.id, "APPROVE")}
                    className="rounded-xl bg-amber-500 text-black px-3 py-1.5 text-xs font-extrabold hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 shadow-md"
                  >
                    <Check className="size-3" /> موافقة ونشر
                  </button>
                )}

                {rev.isPinned ? (
                  <button
                    onClick={() => handleModerate(rev.id, "UNPIN")}
                    className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer flex items-center gap-1 mr-auto"
                  >
                    <BookmarkMinus className="size-3" /> إلغاء التثبيت
                  </button>
                ) : (
                  <button
                    onClick={() => handleModerate(rev.id, "PIN")}
                    className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1 mr-auto"
                  >
                    <Bookmark className="size-3" /> تثبيت في الأعلى
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center text-zinc-500 text-xs">
            لا توجد تقييمات تطابق معايير البحث والتصفية المحددة.
          </div>
        )}
      </div>
    </div>
  );
}
