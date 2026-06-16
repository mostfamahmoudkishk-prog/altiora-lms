import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "./Categories";

const plans = [
  {
    name: "المجاني",
    price: "0",
    desc: "ابدأ بدون أي التزام واستكشف المحتوى.",
    features: ["وصول لـ 10 دروس مجانية", "اختبار قصير واحد", "دعم عبر المجتمع"],
    cta: "ابدأ مجاناً",
  },
  {
    name: "الطالب",
    price: "199",
    desc: "للطلاب الجادين الذين يريدون نتائج حقيقية.",
    features: [
      "وصول كامل لكل الدورات",
      "شهادات إتمام معتمدة",
      "اختبارات ومراجعات غير محدودة",
      "دعم فني سريع",
    ],
    cta: "اشترك الآن",
    featured: true,
  },
  {
    name: "العائلة",
    price: "349",
    desc: "خطة مرنة لأكثر من طالب في نفس البيت.",
    features: [
      "حتى 4 حسابات طلاب",
      "كل مميزات خطة الطالب",
      "تقارير ولي الأمر",
      "خصومات على الكورسات الخاصة",
    ],
    cta: "اختر هذه الخطة",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <SectionTitle
          eyebrow="الأسعار"
          title="خطط بسيطة وواضحة"
          subtitle="اختر اللي يناسبك، وغيّر في أي وقت."
          align="center"
        />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl border bg-card p-7 shadow-card transition-all ${
                p.featured ? "border-primary/30 shadow-elevated md:-translate-y-3" : "border-border"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-glow">
                  الأكثر شيوعاً
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-foreground">{p.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
              <div className="my-6 flex items-end gap-1">
                <span className="font-display text-5xl font-extrabold text-primary">{p.price}</span>
                <span className="mb-2 text-sm text-muted-foreground">ج.م / شهر</span>
              </div>
              <ul className="space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15">
                      <Check className="size-3 text-accent" strokeWidth={3} />
                    </span>
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-8 h-11 w-full rounded-full ${
                  p.featured
                    ? "bg-accent text-accent-foreground hover:opacity-95"
                    : "bg-primary text-primary-foreground hover:opacity-95"
                }`}
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
