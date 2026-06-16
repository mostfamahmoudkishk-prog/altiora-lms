import { Users, BookOpen, Award, Star } from "lucide-react";

const items = [
  { icon: Users, value: "+12,000", label: "طالب نشط" },
  { icon: BookOpen, value: "+250", label: "دورة تعليمية" },
  { icon: Award, value: "+4,500", label: "شهادة معتمدة" },
  { icon: Star, value: "4.9/5", label: "متوسط التقييمات" },
];

export function Stats() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="gradient-primary relative overflow-hidden rounded-3xl px-6 py-10 shadow-elevated">
          <div className="absolute -end-10 -top-10 size-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-10 -start-10 size-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-6 md:grid-cols-4">
            {items.map((i) => (
              <div key={i.label} className="text-center text-primary-foreground">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                  <i.icon className="size-6 text-accent" />
                </div>
                <div className="font-display text-2xl font-extrabold md:text-3xl">{i.value}</div>
                <div className="mt-1 text-sm text-primary-foreground/70">{i.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
