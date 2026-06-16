import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/site/InfoPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية | Altiora — نحو القمة" },
      { name: "description", content: "سياسة الخصوصية الخاصة بمنصة ألتيورا التعليمية." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <InfoPage title="سياسة الخصوصية">
      <p>
        نحن في منصة <span className="font-semibold text-foreground">ألتيورا</span> نحرص على حماية
        بياناتك الشخصية واحترام خصوصيتك. توضح هذه السياسة كيفية جمع واستخدام وحماية المعلومات التي
        تشاركها معنا.
      </p>

      <h2 className="pt-2 text-lg font-bold text-foreground">المعلومات التي نجمعها</h2>
      <ul className="list-inside list-disc space-y-1.5">
        <li>بيانات التسجيل: الاسم، البريد الإلكتروني، رقم الهاتف، المرحلة الدراسية والصف.</li>
        <li>بيانات الاستخدام: الدورات التي تتابعها، تقدمك التعليمي، والاختبارات التي تجريها.</li>
        <li>بيانات تقنية: نوع الجهاز، المتصفح، وعنوان IP لأغراض الأمان وتحسين الخدمة.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-foreground">كيف نستخدم بياناتك</h2>
      <ul className="list-inside list-disc space-y-1.5">
        <li>تقديم خدماتنا التعليمية وتخصيص تجربتك داخل المنصة.</li>
        <li>التواصل معك بخصوص الدورات والتحديثات والإشعارات المهمة.</li>
        <li>تحسين أداء المنصة وتطوير محتوى تعليمي يناسب احتياجاتك.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-foreground">حماية البيانات</h2>
      <p>
        نستخدم تقنيات تشفير حديثة وإجراءات أمان صارمة لحماية بياناتك من الوصول غير المصرح به. لا
        نشارك معلوماتك مع أي طرف ثالث دون موافقتك الصريحة، إلا في الحالات التي يفرضها القانون.
      </p>

      <h2 className="pt-2 text-lg font-bold text-foreground">حقوقك</h2>
      <p>
        يحق لك في أي وقت طلب الاطلاع على بياناتك، أو تعديلها، أو حذف حسابك بالكامل. للتواصل بهذا
        الشأن يمكنك مراسلتنا عبر صفحة الدعم الفني.
      </p>

      <p className="pt-3 text-xs">آخر تحديث: يونيو 2026</p>
    </InfoPage>
  );
}
