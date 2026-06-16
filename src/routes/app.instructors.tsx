import { createFileRoute, Link } from "@tanstack/react-router";
import { User, Star, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getPublicInstructorsFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/app/instructors")({
  component: InstructorsPage,
});

function InstructorsPage() {
  const [instructors, setInstructors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // Load teachers from server
  useEffect(() => {
    getPublicInstructorsFn()
      .then((res: any) => {
        setInstructors(res || []);
      })
      .catch((err) => {
        toast.error("فشل تحميل قائمة المعلمين: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Filter & Sort list
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();

    // Filter
    const filtered = term
      ? instructors.filter((i) => i.name.toLowerCase().includes(term))
      : instructors;

    // Sort: Featured first (sorted by priority desc), then normal instructors
    return [...filtered].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      if (a.isFeatured && b.isFeatured) {
        if (a.featuredPriority !== b.featuredPriority) {
          return b.featuredPriority - a.featuredPriority; // highest priority first
        }
      }

      return a.name.localeCompare(b.name, "ar");
    });
  }, [instructors, q]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-xs font-bold text-muted-foreground">جاري تحميل قائمة المعلمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Search Bar */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن معلم بالاسم"
            className="h-11 w-full rounded-xl border border-border bg-background pr-10 pl-4 text-right text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Grid of Instructors */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {list.map((ins, i) => {
          const Card = (
            <article className="relative flex h-full flex-col items-center justify-between rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-all duration-300 hover:shadow-elevated hover:border-primary/20 scale-100 hover:scale-[1.02]">
              {/* Featured Badge overlay */}
              {ins.isFeatured && (
                <div className="absolute left-3 top-3">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-600 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                    ⭐ {ins.featuredBadgeLabel}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center">
                {/* Avatar */}
                <div className="flex size-20 items-center justify-center rounded-full border-2 border-primary/25 bg-secondary overflow-hidden shadow-sm">
                  {ins.avatarUrl ? (
                    <img src={ins.avatarUrl} alt={ins.name} className="size-full object-cover" />
                  ) : (
                    <User className="size-9 text-muted-foreground" />
                  )}
                </div>

                {/* Name */}
                <h3 className="mt-3 text-sm font-bold text-foreground line-clamp-1">{ins.name}</h3>

                {/* Bio snippet */}
                {ins.bio && (
                  <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 max-w-[160px] leading-relaxed">
                    {ins.bio}
                  </p>
                )}
              </div>

              {/* Profile Link Button */}
              <span className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-all">
                ملف المعلم
              </span>
            </article>
          );

          return (
            <Link
              key={ins.slug || i}
              to="/teacher-profile/$teacherId"
              params={{ teacherId: ins.slug }}
            >
              {Card}
            </Link>
          );
        })}

        {list.length === 0 && (
          <div className="col-span-full rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            لا يوجد معلم بهذا الاسم
          </div>
        )}
      </div>
    </div>
  );
}
