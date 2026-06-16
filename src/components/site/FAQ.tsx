import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionTitle } from "./Categories";

const faqs = [
  {
    q: "هل أقدر أبدأ مجاناً؟",
    a: "أيوه، عندك خطة مجانية كاملة تخليك تجرب جزء من الدروس قبل ما تشترك.",
  },
  {
    q: "هل الشهادات معتمدة؟",
    a: "كل دورة من دوراتنا بتنتهي بشهادة إتمام معتمدة تقدر تضيفها لـ CV أو لينكدإن.",
  },
  {
    q: "هل أقدر أتعلم من الموبايل؟",
    a: "المنصة مصممة موبايل أولاً، فتقدر تتعلم من أي جهاز في أي وقت.",
  },
  {
    q: "هل في دعم فني؟",
    a: "فريق الدعم متاح طول أيام الأسبوع للرد على استفساراتك خلال أقل من ساعة.",
  },
  {
    q: "أقدر ألغي اشتراكي في أي وقت؟",
    a: "طبعاً، تقدر تلغي أو تغير خطتك من إعدادات حسابك بدون أي تعقيد.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-secondary/40 py-16 md:py-24">
      <div className="container mx-auto max-w-3xl px-4 md:px-6">
        <SectionTitle eyebrow="الأسئلة الشائعة" title="كل اللي محتاج تعرفه" align="center" />
        <Accordion type="single" collapsible className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-2xl border border-border bg-card px-5 shadow-card"
            >
              <AccordionTrigger className="py-5 text-start font-semibold text-foreground hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
