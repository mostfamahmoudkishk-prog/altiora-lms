import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/InfoPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام | Altiora — نحو القمة" },
      { name: "description", content: "شروط وأحكام استخدام منصة ألتيورا التعليمية." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <InfoPage title="شروط الاستخدام">
      <p>
        مرحبًا بك في منصة <span className="font-semibold text-foreground">ألتيورا</span>. باستخدامك
        للمنصة، فإنك توافق على الالتزام بالشروط والأحكام التالية. نرجو قراءتها بعناية قبل البدء في
        استخدام خدماتنا.
      </p>

      <h2 className="pt-2 text-lg font-bold text-foreground">الحساب وإنشاء العضوية</h2>
      <ul className="list-inside list-disc space-y-1.5">
        <li>يجب تقديم معلومات صحيحة ودقيقة عند إنشاء الحساب.</li>
        <li>يتحمل المستخدم مسؤولية الحفاظ على سرية بيانات الدخول الخاصة به.</li>
        <li>لا يحق مشاركة الحساب مع أي شخص آخر، ويُعد الحساب شخصيًا للمستخدم فقط.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-foreground">المحتوى التعليمي</h2>
      <ul className="list-inside list-disc space-y-1.5">
        <li>
          جميع الدورات والمواد التعليمية المعروضة محمية بحقوق الملكية الفكرية لصالح ألتيورا أو
          المدرّسين المعنيين.
        </li>
        <li>يُمنع تحميل أو إعادة نشر أو بيع أي محتوى من المنصة دون إذن خطي مسبق.</li>
        <li>أي محاولة لتسريب المحتوى تعرض الحساب للإيقاف الفوري واتخاذ الإجراءات القانونية.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-foreground">المدفوعات والاشتراكات</h2>
      <ul className="list-inside list-disc space-y-1.5">
        <li>الأسعار المعروضة شاملة، وتشمل الوصول إلى الدورة طوال فترة الاشتراك المحددة.</li>
        <li>سياسة الاسترداد تخضع للشروط الموضحة عند الشراء.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-foreground">سلوك المستخدم</h2>
      <p>
        نلتزم بتوفير بيئة تعلم محترمة وآمنة. أي سلوك مسيء أو مخالف للآداب العامة داخل تعليقات
        الدورات أو غرف النقاش يعرض الحساب للإيقاف.
      </p>

      <h2 className="pt-2 text-lg font-bold text-foreground">تعديل الشروط</h2>
      <p>
        تحتفظ ألتيورا بحق تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية عبر
        البريد الإلكتروني أو داخل المنصة.
      </p>

      <p className="pt-3 text-xs">آخر تحديث: يونيو 2026</p>
    </InfoPage>
  );
}
