import { Star } from "lucide-react";
import { SectionTitle } from "./Categories";
import s1 from "@/assets/student-1.jpg";
import s2 from "@/assets/student-2.jpg";
import s3 from "@/assets/student-3.jpg";

const team = [
  { img: s3, name: "د. منى حسن", role: "الكيمياء العضوية", students: 3200, rating: 4.9 },
  { img: s2, name: "أ. أحمد محمود", role: "الرياضيات", students: 5400, rating: 4.8 },
  { img: s1, name: "أ. سارة عبدالله", role: "اللغة الإنجليزية", students: 4100, rating: 4.9 },
  { img: s3, name: "د. خالد فؤاد", role: "الفيزياء", students: 2800, rating: 4.7 },
];

export function Instructors() {
  return (
    <section id="instructors" className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <SectionTitle
          eyebrow="أفضل المدرسين"
          title="تعلّم من الخبراء"
          subtitle="نخبة من المدرسين والأكاديميين بخبرات حقيقية وأسلوب مبسّط."
          align="center"
        />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 md:grid-cols-4">
          {team.map((t) => (
            <div
              key={t.name}
              className="group rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="relative mx-auto size-24 overflow-hidden rounded-full ring-4 ring-secondary">
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  width={200}
                  height={200}
                  className="size-full object-cover"
                />
              </div>
              <h3 className="mt-4 font-display font-bold text-foreground">{t.name}</h3>
              <p className="text-sm text-muted-foreground">{t.role}</p>
              <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-accent text-accent" />
                  <span className="font-semibold text-foreground">{t.rating}</span>
                </span>
                <span>{t.students.toLocaleString("ar-EG")} طالب</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
