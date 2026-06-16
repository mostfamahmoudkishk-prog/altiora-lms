import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Search, GraduationCap, Tag } from "lucide-react";
import { CourseGrid } from "@/components/app/CourseGrid";
import { getCoursesFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/app/courses")({
  component: CoursesPage,
});

const GRADES = [
  "الثالث الاعدادي",
  "الأول الثانوي",
  "ولي أمر",
  "الثاني الاعدادي",
  "الأول الاعدادي",
  "الثاني الثانوي",
  "الثالث الثانوي",
  "الأول الابتدائي",
  "الثاني الابتدائي",
  "الثالث الابتدائي",
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
  "ERU Student",
  "طالب جامعي",
  "خريج",
  "KG",
];
const CATEGORIES = [
  "علوم - Science",
  "رياضيات - Math",
  "IQ",
  "English",
  "Biology",
  "Nursing",
  "Chemistry",
  "Geology",
  "Russian",
  "Graphic Design",
  "Physics",
  "Medical School",
  "Anatomy",
  "لغة عربية",
  "التربية الاسلامية",
  "Pharmacy",
  "Programming",
];

function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => {
    getCoursesFn()
      .then((res) => {
        const mapped = res.map((c: any) => ({
          id: c.id,
          title: c.title,
          img:
            c.coverImage ||
            "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
          categories: c.category?.name || "عام",
          price: Number(c.price).toFixed(2),
          lectures: 0,
          featured: c.isFeatured,
          imgFit: "cover",
          grade: "الثالث الثانوي", // default/fallback
          category: c.category?.name,
        }));
        setCourses(mapped);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (grade && c.grade !== grade) return false;
      if (cat && c.category !== cat) return false;
      return true;
    });
  }, [courses, q, grade, cat]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            جاري تحميل كتالوج الدورات...
          </div>
        ) : (
          <CourseGrid courses={filtered} />
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن دورة"
              className="h-11 w-full rounded-xl border border-border bg-background pe-10 ps-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>

        <FilterCard
          title="الصفوف الدراسية"
          icon={GraduationCap}
          items={GRADES}
          active={grade}
          onSelect={(v) => setGrade(v === grade ? null : v)}
        />
        <FilterCard
          title="الفئات"
          icon={Tag}
          items={CATEGORIES}
          active={cat}
          onSelect={(v) => setCat(v === cat ? null : v)}
        />
      </aside>
    </div>
  );
}

function FilterCard({
  title,
  icon: Icon,
  items,
  active,
  onSelect,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  active: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="border-b border-border bg-secondary/50 px-4 py-3 text-end text-sm font-bold text-foreground">
        {title}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {items.map((it) => (
          <button
            key={it}
            onClick={() => onSelect(it)}
            className={`flex w-full items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-end text-sm transition-colors last:border-b-0 ${
              active === it ? "bg-secondary text-primary" : "text-foreground hover:bg-secondary/40"
            }`}
          >
            <Icon
              className={`size-4 ${active === it ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className="flex-1 text-end">{it}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
