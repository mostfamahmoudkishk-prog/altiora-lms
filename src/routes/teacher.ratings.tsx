import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Star, MessageSquare, Reply, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/teacher/ratings")({
  component: TeacherRatings,
});

interface Review {
  id: string;
  studentName: string;
  courseTitle: string;
  rating: number;
  comment: string;
  date: string;
  reply?: string;
}

const mockReviews: Review[] = [
  {
    id: "r1",
    studentName: "أحمد محمود حسن",
    courseTitle: "Epic Grammer 2026",
    rating: 5,
    comment: "أفضل شرح لقواعد الإنجليزي واجهته على الإطلاق! التبسيط رائع والمذكرات ممتازة.",
    date: "2026-06-12",
    reply: "شكرًا لك أحمد! سعيد جدًا بمساعدتك في بلوغ التميز.",
  },
  {
    id: "r2",
    studentName: "منى عبد الرحمن أحمد",
    courseTitle: "Epic Grammer 2026",
    rating: 4,
    comment: "الشرح ممتاز ولكن أرجو إضافة المزيد من تدريبات بنك الأسئلة في الوحدات الأخيرة.",
    date: "2026-06-08",
  },
  {
    id: "r3",
    studentName: "يوسف خالد محمود",
    courseTitle: "أساسيات الرياضيات للثانوية العامة 2026",
    rating: 5,
    comment: "كورس متكامل شرح وأفكار مميزة وطرق سهلة لحل المسائل المعقدة.",
    date: "2026-06-05",
  },
  {
    id: "r4",
    studentName: "رانيا كمال مصطفى",
    courseTitle: "أساسيات الرياضيات للثانوية العامة 2026",
    rating: 3,
    comment: "الشرح مبسط ولكن جودة الصوت في الدرس الرابع تحتاج لبعض التحسين.",
    date: "2026-05-28",
  },
];

function TeacherRatings() {
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");

  // Filters & Pagination
  const [filterRating, setFilterRating] = useState<number | "ALL">("ALL");
  const [filterCourse, setFilterCourse] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => filterRating === "ALL" || r.rating === filterRating)
      .filter((r) => filterCourse === "ALL" || r.courseTitle === filterCourse);
  }, [reviews, filterRating, filterCourse]);

  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, page]);

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;

  // Open Reply Dialog
  const handleOpenReply = (r: Review) => {
    setActiveReview(r);
    setReplyText(r.reply || "");
  };

  // Save Reply
  const handleSaveReply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeReview) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === activeReview.id
          ? { ...r, reply: replyText.trim() !== "" ? replyText.trim() : undefined }
          : r,
      ),
    );

    toast.success(replyText.trim() !== "" ? "تم إرسال ردك على التقييم بنجاح" : "تم حذف الرد");
    setActiveReview(null);
  };

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          استعرض تقييمات الطلاب وتفاعل مع تعليقاتهم عبر إرسال الردود
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">تقييمات وآراء الطلاب</h2>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row">
        <select
          value={filterRating.toString()}
          onChange={(e) => {
            const val = e.target.value;
            setFilterRating(val === "ALL" ? "ALL" : parseInt(val));
            setPage(1);
          }}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary w-full sm:w-40"
        >
          <option value="ALL">جميع التقييمات</option>
          <option value="5">5 نجوم ⭐⭐⭐⭐⭐</option>
          <option value="4">4 نجوم ⭐⭐⭐⭐</option>
          <option value="3">3 نجوم ⭐⭐⭐</option>
          <option value="2">نجمتان ⭐⭐</option>
          <option value="1">نجمة واحدة ⭐</option>
        </select>

        <select
          value={filterCourse}
          onChange={(e) => {
            setFilterCourse(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary w-full sm:w-64"
        >
          <option value="ALL">جميع الدورات</option>
          <option value="Epic Grammer 2026">Epic Grammer 2026</option>
          <option value="أساسيات الرياضيات للثانوية العامة 2026">
            أساسيات الرياضيات للثانوية العامة 2026
          </option>
        </select>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {paginatedReviews.map((rev) => (
          <div
            key={rev.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4"
          >
            {/* Student metadata */}
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-muted-foreground">{rev.date}</span>
              <div className="flex gap-3">
                <div className="text-end">
                  <div className="text-sm font-bold text-foreground">{rev.studentName}</div>
                  <div className="text-xs text-primary font-semibold">{rev.courseTitle}</div>
                </div>
                {/* Stars container */}
                <div className="flex items-center gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`size-3.5 ${
                        idx < rev.rating ? "text-amber-500 fill-amber-500" : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Comment */}
            <p className="text-sm text-foreground leading-relaxed text-end bg-secondary/20 p-3 rounded-xl">
              {rev.comment}
            </p>

            {/* Teacher Reply */}
            {rev.reply ? (
              <div className="border-r-2 border-primary bg-primary/5 p-4 rounded-l-xl flex flex-col gap-1 text-end">
                <div className="flex items-center justify-between text-xs text-primary font-bold">
                  <button
                    onClick={() => handleOpenReply(rev)}
                    className="text-xs text-muted-foreground underline hover:text-primary"
                  >
                    تعديل الرد
                  </button>
                  <span>ردك كمعلم:</span>
                </div>
                <p className="text-sm text-foreground/90 mt-1">{rev.reply}</p>
              </div>
            ) : (
              <div className="flex justify-start">
                <button
                  onClick={() => handleOpenReply(rev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
                >
                  <Reply className="size-3.5" /> إضافة رد كمعلم
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            لا توجد تقييمات مطابقة للفلترة
          </div>
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

      {/* Reply Dialog */}
      <Dialog open={!!activeReview} onOpenChange={() => setActiveReview(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              رد المدرس على التقييم
            </DialogTitle>
          </DialogHeader>
          {activeReview && (
            <form onSubmit={handleSaveReply} className="mt-4 space-y-4">
              <div className="rounded-lg bg-secondary/30 p-3 text-xs">
                <span className="font-bold">{activeReview.studentName}</span>:{" "}
                {activeReview.comment}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  نص الرد
                </label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="اكتب ردك هنا..."
                  className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                >
                  إرسال الرد
                </button>
                {activeReview.reply && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyText("");
                      // Form submit requires a trigger or manual save
                    }}
                    className="rounded-xl border border-border bg-card px-4 text-xs font-bold text-destructive hover:bg-destructive/10"
                  >
                    حذف الرد الحالي
                  </button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
