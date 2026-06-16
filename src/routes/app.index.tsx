import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayCircle, ArrowUpDown } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { CourseGrid } from "@/components/app/CourseGrid";
import { getCoursesFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCoursesFn()
      .then((res) => {
        const mapped = (res || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          img:
            c.coverImage ||
            "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
          categories: c.category?.name || "عام",
          price: Number(c.price).toFixed(2),
          lectures: 0, // dynamic count if modules are included or default to 0
          featured: c.isFeatured,
          imgFit: "cover",
        }));
        setCourses(mapped);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const suggested = useMemo(() => courses.filter((c) => c.featured), [courses]);
  // "الدورات الأحدث" — sorted ascending (oldest → newest) or based on dates
  const [latestAsc, setLatestAsc] = useState(true);
  const latest = useMemo(() => {
    const list = courses.filter((c) => !c.featured);
    return [...list].sort((a, b) =>
      latestAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title),
    );
  }, [courses, latestAsc]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        جاري تحميل الدورات المقترحة والأحدث...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Section
        title="الدورات المقترحة"
        subtitle="قائمة الدورات المميزة المقترحة لك"
        action={
          <button
            onClick={() => navigate({ to: "/app/courses" })}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95"
          >
            <PlayCircle className="size-4" /> كل الدورات
          </button>
        }
      >
        <CourseGrid courses={suggested} />
      </Section>

      <div className="h-px w-full bg-border" />

      <Section
        title="الدورات الأحدث"
        subtitle="الدورات الجديدة أو التي تحتوي على محاضرات جديدة"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLatestAsc((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary"
              title="ترتيب من الأقدم للأحدث / العكس"
            >
              <ArrowUpDown className="size-3.5" />
              {latestAsc ? "الأقدم أولاً" : "الأحدث أولاً"}
            </button>
            <button
              onClick={() => navigate({ to: "/app/courses" })}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95"
            >
              <PlayCircle className="size-4" /> كل الدورات
            </button>
          </div>
        }
      >
        <CourseGrid courses={latest} />
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5 shadow-card md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        {action}
        <div className="text-end">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
