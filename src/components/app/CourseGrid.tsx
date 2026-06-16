import { Star, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import epicGrammar from "@/assets/course-epic-grammar.jpg";
import iqIntermediate from "@/assets/course-iq-intermediate.jpg";
import iqBeginner from "@/assets/course-iq-beginner.jpg";
import iqBase from "@/assets/course-iq-base.jpg";

export type Course = {
  id: string;
  img: string;
  title: string;
  categories: string;
  price: string;
  lectures: number;
  featured?: boolean;
  grade?: string;
  category?: string;
  imgFit?: "contain" | "cover";
};

export const allCourses: Course[] = [
  {
    id: "1",
    img: epicGrammar,
    title: "Epic Grammer 2026",
    categories: "الثالث الإعدادي، الأول الثانوي، الثاني الثانوي، الثالث الثانوي",
    price: "500.00",
    lectures: 14,
    featured: true,
    imgFit: "contain",
    grade: "الثالث الثانوي",
    category: "English",
  },
  {
    id: "2",
    img: iqIntermediate,
    title: "PrePre IQ Intermediate ( 9 - 14 )",
    categories: "السادس الابتدائي، الخامس الابتدائي، الرابع الابتدائي، الثالث الابتدائي",
    price: "200.00",
    lectures: 13,
    featured: true,
    grade: "السادس الابتدائي",
    category: "IQ",
  },
  {
    id: "3",
    img: iqBeginner,
    title: "PrePre IQ Beginner ( 8 - 13 )",
    categories: "ولي أمر، الأول الإعدادي، الأول الابتدائي",
    price: "200.00",
    lectures: 13,
    featured: true,
    grade: "الأول الإعدادي",
    category: "IQ",
  },
  {
    id: "4",
    img: iqBase,
    title: "PrePre IQ Base ( 5 - 9 )",
    categories: "ولي أمر، KG",
    price: "200.00",
    lectures: 13,
    featured: true,
    grade: "KG",
    category: "IQ",
  },
  {
    id: "5",
    img: epicGrammar,
    title: "مراجعة نهائية العضوية",
    categories: "الثالث الثانوي",
    price: "200.00",
    lectures: 4,
    grade: "الثالث الثانوي",
    category: "Chemistry",
  },
  {
    id: "6",
    img: iqIntermediate,
    title: "ليالي الامتحان",
    categories: "الثالث الثانوي",
    price: "100.00",
    lectures: 0,
    grade: "الثالث الثانوي",
    category: "Chemistry",
  },
  {
    id: "7",
    img: iqBeginner,
    title: "إنجليزي معادلة هندسة — م/ ابرام",
    categories: "طالب جامعي",
    price: "1.00",
    lectures: 6,
    grade: "طالب جامعي",
    category: "English",
  },
  {
    id: "8",
    img: iqBase,
    title: "EGY STEM Arduino Course Level1",
    categories: "خريج، طالب جامعي، الثالث الثانوي",
    price: "1.00",
    lectures: 0,
    grade: "الثالث الثانوي",
    category: "Programming",
  },
  {
    id: "demo-math-2026",
    img: epicGrammar,
    title: "أساسيات الرياضيات للثانوية العامة 2026",
    categories: "الثالث الثانوي — شرح مبسط + تدريبات + امتحانات + واجبات + مراجعات نهائية",
    price: "250.00",
    lectures: 12,
    featured: true,
    imgFit: "contain",
    grade: "الثالث الثانوي",
    category: "Mathematics",
  },
];

export function CourseGrid({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        لا توجد دورات لعرضها
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {courses.map((c, i) => (
        <CourseCard key={c.id} c={c} index={i} />
      ))}
    </div>
  );
}

export function CourseCard({ c, index = 0 }: { c: Course; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-elevated"
    >
      <Link
        to="/app/courses/$courseId"
        params={{ courseId: c.id }}
        className="flex flex-1 flex-col"
      >
        <div
          className={`relative aspect-[16/10] overflow-hidden ${c.imgFit === "contain" ? "bg-card" : ""}`}
        >
          <img
            src={c.img}
            alt={c.title}
            loading="lazy"
            className={`size-full ${c.imgFit === "contain" ? "object-contain p-6" : "object-cover"} transition-transform duration-700 group-hover:scale-110`}
          />
        </div>
        <div className="flex flex-1 flex-col p-5 text-end">
          <h3 className="font-display text-base font-bold text-foreground transition-colors group-hover:text-primary">
            {c.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {c.categories}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            {c.featured && (
              <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
                <Star className="size-3 fill-accent" /> مميز
              </span>
            )}
            <div className="ms-auto text-sm font-bold text-primary">
              <span>{c.price}</span>
              <span className="ms-1 text-muted-foreground">جنيه</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span>{c.lectures} محاضرة</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
