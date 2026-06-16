import { Star, PlayCircle, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import epicGrammar from "@/assets/course-epic-grammar.jpg";
import iqIntermediate from "@/assets/course-iq-intermediate.jpg";
import iqBeginner from "@/assets/course-iq-beginner.jpg";
import iqBase from "@/assets/course-iq-base.jpg";

type Course = {
  img: string;
  title: string;
  categories: string;
  price: string;
  lectures: number;
  featured?: boolean;
  imgFit?: "contain" | "cover";
};

const suggested: Course[] = [
  {
    img: epicGrammar,
    title: "Epic Grammer 2026",
    categories: "الثالث الإعدادي، الأول الثانوي، الثاني الثانوي، الثالث الثانوي",
    price: "500.00",
    lectures: 14,
    featured: true,
    imgFit: "contain",
  },
  {
    img: iqIntermediate,
    title: "PrePre IQ Intermediate ( 9 - 14 )",
    categories:
      "السادس الابتدائي، الخامس الابتدائي، الرابع الابتدائي، الثالث الابتدائي، الثاني الابتدائي، الأول الابتدائي، الثاني الإعدادي، ولي أمر",
    price: "200.00",
    lectures: 13,
    featured: true,
  },
  {
    img: iqBeginner,
    title: "PrePre IQ Beginner ( 8 - 13 )",
    categories:
      "ولي أمر، الأول الإعدادي، الأول الابتدائي، الثاني الابتدائي، الثالث الابتدائي، الرابع الابتدائي، الخامس الابتدائي، السادس الابتدائي",
    price: "200.00",
    lectures: 13,
    featured: true,
  },
  {
    img: iqBase,
    title: "PrePre IQ Base ( 5 - 9 )",
    categories: "ولي أمر، KG",
    price: "200.00",
    lectures: 13,
    featured: true,
  },
];

const latest: Course[] = [
  {
    img: epicGrammar,
    title: "مراجعة نهائية العضوية",
    categories: "الثالث الثانوي",
    price: "200.00",
    lectures: 4,
  },
  {
    img: iqIntermediate,
    title: "ليالي الامتحان",
    categories: "الثالث الثانوي",
    price: "100.00",
    lectures: 0,
  },
  {
    img: iqBeginner,
    title: "إنجليزي معادلة هندسة — م/ ابرام",
    categories: "طالب جامعي",
    price: "1.00",
    lectures: 6,
  },
  {
    img: iqBase,
    title: "EGY STEM Arduino Course Level1",
    categories: "خريج، طالب جامعي، الثالث الثانوي، الثاني الثانوي، الأول الثانوي",
    price: "1.00",
    lectures: 0,
  },
];

export function FeaturedCourses() {
  return (
    <section id="courses" className="bg-background py-12 md:py-16">
      <div className="container mx-auto space-y-16 px-4 md:px-6">
        <CourseSection
          title="الدورات المقترحة"
          subtitle="قائمة الدورات المميزة المقترحة لك"
          courses={suggested}
        />
        <CourseSection
          title="الدورات الأحدث"
          subtitle="الدورات الجديدة أو التي تحتوي على محاضرات جديدة"
          courses={latest}
        />
      </div>
    </section>
  );
}

function CourseSection({
  title,
  subtitle,
  courses = [],
}: {
  title: string;
  subtitle: string;
  courses?: Course[];
}) {
  const safeCourses = courses || [];
  return (
    <div>
      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="text-start">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          to="/app/courses"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-card transition-all hover:opacity-95 hover:scale-105"
        >
          <PlayCircle className="size-4" />
          كل الدورات
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {safeCourses.map((c, i) => (
          <CourseCard key={i} {...c} index={i} />
        ))}
      </div>
    </div>
  );
}

function CourseCard({
  img,
  title = "دورة تعليمية غير مسماة",
  categories = "",
  price = "0.00",
  lectures = 0,
  featured,
  imgFit = "cover",
  index,
}: Partial<Course> & { index: number }) {
  const displayTitle = title || "دورة تعليمية غير مسماة";
  const displayCategories = categories || "";
  const displayPrice = price || "0.00";
  const displayLectures = lectures || 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-elevated"
    >
      <div
        className={`relative aspect-[16/10] overflow-hidden ${imgFit === "contain" ? "bg-card" : ""}`}
      >
        {img ? (
          <img
            src={img}
            alt={displayTitle}
            loading="lazy"
            width={800}
            height={500}
            className={`size-full ${imgFit === "contain" ? "object-contain p-6" : "object-cover"} transition-transform duration-700 group-hover:scale-110`}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center bg-secondary/50 text-muted-foreground font-display text-xs font-bold">
            لا توجد صورة متاحة
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 text-end">
        <h3 className="font-display text-base font-bold text-foreground">{displayTitle}</h3>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {displayCategories}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-[11px] font-bold text-accent">
              <Star className="size-3 fill-accent" />
              مميز
            </span>
          )}
          <div className="ms-auto text-sm font-bold text-primary">
            <span>{displayPrice}</span>
            <span className="ms-1 text-muted-foreground">جنيه</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <ChevronLeft className="size-3.5" />
          <span>{displayLectures} محاضرة</span>
        </div>
      </div>
    </motion.article>
  );
}
