import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { allCourses, CourseGrid } from "@/components/app/CourseGrid";
import { getEnrollments } from "@/lib/wallet";

export const Route = createFileRoute("/app/my-courses")({
  component: MyCourses,
});

function MyCourses() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(getEnrollments());
    const h = () => setIds(getEnrollments());
    window.addEventListener("altiora:wallet", h);
    return () => window.removeEventListener("altiora:wallet", h);
  }, []);

  const mine = allCourses.filter((c) => ids.includes(c.id));

  if (mine.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-end gap-3 text-end text-sm text-foreground">
          <span>لم تنضم إلى أي دورة حتى الآن</span>
          <Info className="size-5 text-primary" />
        </div>
        <Link
          to="/app/courses"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-95"
        >
          <PlayCircle className="size-4" /> تصفح الدورات
        </Link>
      </div>
    );
  }

  return <CourseGrid courses={mine} />;
}
