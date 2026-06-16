import {
  Calculator,
  Languages,
  Atom,
  FlaskConical,
  Code2,
  Palette,
  BookMarked,
  Globe,
} from "lucide-react";

const cats = [
  { icon: Calculator, label: "الرياضيات", count: 42, color: "bg-blue-50 text-blue-600" },
  { icon: Languages, label: "اللغات", count: 38, color: "bg-emerald-50 text-emerald-600" },
  { icon: Atom, label: "الفيزياء", count: 24, color: "bg-violet-50 text-violet-600" },
  { icon: FlaskConical, label: "الكيمياء", count: 19, color: "bg-rose-50 text-rose-600" },
  { icon: Code2, label: "البرمجة", count: 31, color: "bg-amber-50 text-amber-600" },
  { icon: Palette, label: "الفنون", count: 15, color: "bg-pink-50 text-pink-600" },
  { icon: BookMarked, label: "الأدب", count: 22, color: "bg-cyan-50 text-cyan-600" },
  { icon: Globe, label: "اجتماعيات", count: 17, color: "bg-orange-50 text-orange-600" },
];

export function Categories() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <SectionTitle eyebrow="تصفّح" title="استكشف التصنيفات" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {cats.map((c) => (
            <button
              key={c.label}
              className="group flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-5 text-start shadow-card transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-elevated"
            >
              <div className={`flex size-12 items-center justify-center rounded-xl ${c.color}`}>
                <c.icon className="size-6" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.count} دورة</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "start" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {eyebrow && (
        <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-brand-orange">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base text-muted-foreground md:text-lg">{subtitle}</p>}
    </div>
  );
}
