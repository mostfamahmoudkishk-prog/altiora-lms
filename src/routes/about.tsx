import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/InfoPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "عن المنصة | Altiora — نحو القمة" },
      {
        name: "description",
        content: "تعرّف على منصة ألتيورا التعليمية ورسالتنا في تقديم تجربة تعلم متميزة.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <InfoPage title="عن المنصة">
      <p className="text-foreground">افتح عقلك، امسك قلمك، واستعد للرحلة…</p>
      <p>
        <span className="font-semibold text-foreground">ألتيورا</span> منصة تعليمية مصرية حديثة
        هدفها تقديم العلم بشكل سهل وعصري، عبر برامج تدريبية متطوّرة تساعد الطالب على اكتساب مهارات
        علمية وتجريبية تُهيّئه للدخول إلى سوق العمل والاستعداد لكافة أنواع الاختبارات.
      </p>
      <p>
        نسعى في ألتيورا — التي تعني "نحو القمة" — إلى فتح آفاق جديدة داخل سراديب عقل كل طالب،
        والارتقاء به إلى أعلى مراتب التفكير والإبداع، عبر محتوى مُختار بعناية، ومدرّسين مميزين،
        وأدوات تعليمية تفاعلية.
      </p>
      <h2 className="pt-2 text-lg font-bold text-foreground">رؤيتنا</h2>
      <p>
        أن نكون المنصة التعليمية الأولى في الوطن العربي التي تدمج بين جودة المحتوى وسهولة التجربة،
        لنُمكّن كل طالب من الوصول إلى أعلى إمكاناته.
      </p>
      <h2 className="pt-2 text-lg font-bold text-foreground">رسالتنا</h2>
      <p>
        تقديم تعليم مرن ومتجدد لجميع المراحل الدراسية، يدعم الطالب أكاديميًا ومهاريًا، ويوفر له بيئة
        تعلم محفّزة في أي وقت ومن أي مكان.
      </p>
    </InfoPage>
  );
}
