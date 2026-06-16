import { createFileRoute } from "@tanstack/react-router";
import { Shield, Download, Monitor, AlertTriangle, Key, Cpu, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/app/downloads/player")({
  head: () => ({
    meta: [{ title: "تحميل مشغل ألتيورا الآمن | Altiora Player" }],
  }),
  component: PlayerDownloadPage,
});

function PlayerDownloadPage() {
  const handleDownload = () => {
    // Generate trigger download for setup file (mocked to public asset path/release)
    const link = document.createElement("a");
    link.href = "/downloads/AltioraPlayer-Setup.exe";
    link.download = "AltioraPlayer-Setup.exe";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 text-end p-6" dir="rtl">
      {/* Premium Title Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#020617] p-8 md:p-10 shadow-2xl text-center md:text-right flex flex-col md:flex-row-reverse items-center justify-between gap-8">
        <div className="relative shrink-0 flex items-center justify-center bg-amber-500/10 p-6 rounded-full border border-amber-500/30">
          <Shield className="size-20 md:size-24 text-amber-500 animate-pulse" />
          <div className="absolute inset-0 bg-amber-500/5 blur-2xl rounded-full" />
        </div>
        <div className="space-y-4 max-w-lg">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-[10px] text-amber-500 font-black tracking-widest uppercase">
            نظام الحماية المتقدم - DRM
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-white leading-tight">
            مشغل ألتيورا الآمن للكمبيوتر <br className="hidden md:inline"/>
            <span className="text-amber-500 font-display">Altiora Secure Player</span>
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
            للحصول على تجربة تعليمية متميزة وحماية متكاملة لمحتوى محاضرات الكورسات المشترك بها،
            يجب استخدام التطبيق المخصص لأجهزة الكمبيوتر لمشاهدة الفيديوهات.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Download Action Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-[#111827] p-6 space-y-6 shadow-xl">
            <h3 className="text-sm font-bold text-white border-r-2 border-amber-500 pr-2.5">روابط التحميل المباشرة</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Windows card */}
              <div className="border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all">
                <div className="flex flex-row-reverse items-start justify-between">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Monitor className="size-5" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white block">نسخة Windows</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5 block">ويندوز 10 / 11 (64-بت)</span>
                  </div>
                </div>
                
                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-all shadow-md mt-2"
                >
                  <Download className="size-4" />
                  <span>تحميل لويندوز (Setup.exe)</span>
                </button>
              </div>

              {/* macOS card */}
              <div className="border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 rounded-2xl p-5 flex flex-col justify-between gap-4 opacity-65 transition-all">
                <div className="flex flex-row-reverse items-start justify-between">
                  <div className="size-10 rounded-xl bg-neutral-850 text-neutral-450 flex items-center justify-center">
                    <Cpu className="size-5" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white block">نسخة macOS</span>
                    <span className="text-[10px] text-neutral-500 mt-0.5 block">إصدار Catalina أو أحدث</span>
                  </div>
                </div>
                
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-800 text-neutral-500 font-bold text-xs cursor-not-allowed mt-2 border border-neutral-700"
                >
                  <span>قريباً لنظام الماك</span>
                </button>
              </div>
            </div>
          </div>

          {/* Setup steps */}
          <div className="rounded-2xl border border-neutral-800 bg-[#111827] p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white border-r-2 border-amber-500 pr-2.5">خطوات التثبيت والتشغيل</h3>
            <div className="space-y-3.5 text-xs text-neutral-355">
              <div className="flex flex-row-reverse items-start gap-3">
                <div className="size-5 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center shrink-0">1</div>
                <p className="leading-relaxed">قم بتحميل ملف التثبيت الخاص بنظام تشغيلك بالضغط على زر التحميل بالأعلى.</p>
              </div>
              <div className="flex flex-row-reverse items-start gap-3">
                <div className="size-5 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center shrink-0">2</div>
                <p className="leading-relaxed">افتح ملف التثبيت <code>AltioraPlayer-Setup.exe</code> واتبع التعليمات الظاهرة على الشاشة لإتمام التثبيت.</p>
              </div>
              <div className="flex flex-row-reverse items-start gap-3">
                <div className="size-5 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center shrink-0">3</div>
                <p className="leading-relaxed">بعد فتح التطبيق، قم بتسجيل الدخول بنفس البريد الإلكتروني وكلمة المرور المسجل بهما في الموقع.</p>
              </div>
              <div className="flex flex-row-reverse items-start gap-3">
                <div className="size-5 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center shrink-0">4</div>
                <p className="leading-relaxed">الآن، عند النقر على "مشاهدة" لأي درس في المتصفح، سيتم توجيهك وفتح المحاضرة تلقائياً داخل المشغل الآمن.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Warning & Features sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-4 shadow-lg text-right">
            <div className="flex flex-row-reverse items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="size-5" />
              <span>ملاحظات هامة</span>
            </div>
            <ul className="space-y-2.5 text-neutral-400 text-xs leading-relaxed list-disc list-inside pr-1">
              <li>المشغل مخصص لمشاهدة الفيديو فقط، أما الواجبات والامتحانات والتعليقات فتتم عبر المتصفح بشكل طبيعي.</li>
              <li>يمتلك كل طالب رخصة لتشغيل التطبيق على <b>جهاز كمبيوتر واحد فقط</b> بشكل افتراضي لمنع تسريب الحسابات.</li>
              <li>يُحظر تشغيل برامج تصوير الشاشة (OBS، Camtasia، إلخ) أثناء تشغيل المحاضرات وسيقوم التطبيق بإيقاف الفيديو تلقائياً.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-[#111827] p-5 space-y-4 shadow-xl">
            <div className="flex flex-row-reverse items-center gap-2 text-amber-500 font-bold text-sm">
              <Key className="size-4.5" />
              <span>مزايا مشغل ألتيورا الآمن</span>
            </div>
            <div className="space-y-3 text-neutral-400 text-xs">
              <div className="flex flex-row-reverse items-center gap-2 justify-start">
                <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>حماية متطورة ضد سرقة وتسريب المحتوى</span>
              </div>
              <div className="flex flex-row-reverse items-center gap-2 justify-start">
                <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>علامات مائية ديناميكية مخصصة لكل طالب</span>
              </div>
              <div className="flex flex-row-reverse items-center gap-2 justify-start">
                <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>تقليل استهلاك الإنترنت وتسريع التحميل</span>
              </div>
              <div className="flex flex-row-reverse items-center gap-2 justify-start">
                <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>مزامنة مستمرة وفورية لتقدم مشاهدة المحاضرة</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
