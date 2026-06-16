import { Quote, Star } from "lucide-react";
import { SectionTitle } from "./Categories";
import s1 from "@/assets/student-1.jpg";
import s2 from "@/assets/student-2.jpg";
import s3 from "@/assets/student-3.jpg";

const list = [
  {
    img: s1,
    name: "ليلى أحمد",
    role: "طالبة ثانوية عامة",
    text: "المنصة غيّرت طريقة مذاكرتي. الشرح بسيط، والامتحانات عملية جدًا وحسّت بثقة قبل دخول الامتحان.",
  },
  {
    img: s2,
    name: "يوسف عمر",
    role: "طالب جامعي",
    text: "أحسن استثمار عملته في تعليمي. المدرسين محترفين والمحتوى مرتب خطوة بخطوة.",
  },
  {
    img: s3,
    name: "نور حسين",
    role: "طالبة إعدادي",
    text: "أحب الكورسات لأنها قصيرة ومركزة. باخد لايف وأسأل اللي محتاجاه على طول.",
  },
];

export function Testimonials() {
  return (
    <section className="bg-secondary/40 py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <SectionTitle eyebrow="آراء الطلاب" title="قصص نجاح حقيقية" align="center" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {list.map((t) => (
            <figure
              key={t.name}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-card"
            >
              <Quote className="absolute end-6 top-6 size-8 text-accent/30" />
              <div className="mb-3 flex gap-1 text-accent">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-foreground">
                "{t.text}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <img
                  src={t.img}
                  alt={t.name}
                  loading="lazy"
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover"
                />
                <div>
                  <div className="text-sm font-bold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
