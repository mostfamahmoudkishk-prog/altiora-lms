import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu,
  Brain,
  Sparkles,
  BookOpen,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/ai")({
  component: SuperAdminAI,
});

interface RiskStudent {
  name: string;
  course: string;
  riskLevel: "HIGH" | "MEDIUM";
  reason: string;
  aiAdvice: string;
}

const initialRiskStudents: RiskStudent[] = [
  {
    name: "فاطمة محمد علي",
    course: "أساسيات الرياضيات",
    riskLevel: "HIGH",
    reason: "لم تقم بتسجيل الدخول منذ 14 يوماً وتجاوزت 3 واجبات",
    aiAdvice: "أرسل لها تنبيهاً تشجيعياً يحتوي على شرح مبسط لأول درسين للبدء مجدداً.",
  },
  {
    name: "منى عبد الرحمن أحمد",
    course: "Epic Grammer 2026",
    riskLevel: "MEDIUM",
    reason: "نسبة إنجاز 64% لكن درجات الامتحان انخفضت 15%",
    aiAdvice: "ينصح المعلم بمراجعة نقاط ضعفها في امتحان الدرس الرابع.",
  },
];

function SuperAdminAI() {
  const [activeTool, setActiveTool] = useState<
    "exam" | "summaries" | "students" | "improvement" | "assistant"
  >("exam");

  // Exam generator states
  const [examCourse, setExamCourse] = useState("Epic Grammer 2026");
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Summary generator states
  const [summaryText, setSummaryText] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");

  // Assistant states
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState("");

  const handleGenerateExam = () => {
    setLoading(true);
    setTimeout(() => {
      setSuggestedQuestions([
        "سؤال 1: اختيار من متعدد (MCQ) - Choose the correct form of the verb: 'By next year, he ___ (finish) his degree.' (Options: will finish, will have finished, finishes)",
        "سؤال 2: صح أو خطأ (True/False) - The word 'Quickly' is an adjective. (Correct answer: False, it is an adverb)",
        "سؤال 3: ترتيب (Ordering) - Arrange: (English / speaks / fluent / he) (Answer: He speaks fluent English)",
      ]);
      setLoading(false);
      toast.success("تم توليد اقتراحات الامتحانات من Altiora AI");
    }, 1200);
  };

  const handleGenerateSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summaryText.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setGeneratedSummary(
        "الملخص التلقائي المقترح:\nيركز هذا الدرس على شرح أزمنة الحاضر المستمر والبسيط، مع توضيح الفروقات الأساسية في الاستخدام. Present Simple يعبر عن الحقائق والمواعيد الثابتة، بينما Present Continuous يعبر عن الأفعال التي تحدث الآن أثناء الكلام. ننصح الطلاب بالتركيز على الكلمات الدالة مثل now, at the moment.",
      );
      setLoading(false);
      toast.success("تم توليد ملخص الدرس");
    }, 1000);
  };

  const handleGenerateReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantPrompt.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setGeneratedEmail(
        "مسودة الإعلان المقترحة:\nمرحباً طلابي الأعزاء، أود تذكيركم بموعد الامتحان الشامل الأول غداً الساعة 6 مساءً. الامتحان يغطي كامل قواعد الوحدة الأولى. يرجى المراجعة وحل الواجبات المتبقية لضمان الاستعداد الكامل. بالتوفيق للجميع! أ. أحمد علي",
      );
      setLoading(false);
      toast.success("تمت صياغة نص الإعلان بنجاح");
    }, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-end bg-transparent font-display text-white"
      dir="rtl"
    >
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex items-center justify-between gap-4">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <Cpu className="size-10 text-amber-400 animate-pulse" />
        <div className="text-end">
          <h1 className="font-display text-2xl font-black flex items-center justify-end gap-2 text-amber-400">
            <span>Altiora AI الذكاء الاصطناعي</span>
            <Sparkles className="size-6 text-amber-400 fill-amber-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            توليد الأسئلة، التحليل الوقائي، تلخيص المناهج، وتوصيات مساعدة المعلم الذكية.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-end gap-2 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-1.5 max-w-4xl mr-auto">
        <button
          onClick={() => setActiveTool("assistant")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTool === "assistant"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          مساعد المعلم
        </button>
        <button
          onClick={() => setActiveTool("improvement")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTool === "improvement"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          توصيات تحسين المقررات
        </button>
        <button
          onClick={() => setActiveTool("students")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTool === "students"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          تحليل الطلاب والمخاطر
        </button>
        <button
          onClick={() => setActiveTool("summaries")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTool === "summaries"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          ملخصات المحاضرات
        </button>
        <button
          onClick={() => setActiveTool("exam")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTool === "exam"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          توليد اقتراحات الامتحانات
        </button>
      </div>

      {/* Tools Content */}
      <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] min-h-80">
        <AnimatePresence mode="wait">
          {activeTool === "exam" && (
            <motion.div
              key="exam-tool"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-amber-400">
                  توليد مقترحات الأسئلة للامتحانات
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  اختر الكورس المستهدف وسيتولى الذكاء الاصطناعي إنشاء أسئلة تدريبية فوراً وضخها لبنك الأسئلة.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end items-end gap-4 max-w-xl ml-auto">
                <button
                  onClick={handleGenerateExam}
                  disabled={loading}
                  className="h-10 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 disabled:opacity-40 flex items-center justify-center gap-1.5 w-full sm:w-auto cursor-pointer"
                >
                  {loading ? "جاري التوليد..." : "توليد الأسئلة المقترحة"}
                  <Wand2 className="size-4" />
                </button>

                <div className="flex-1 w-full text-end space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    الكورس المستهدف
                  </label>
                  <select
                    value={examCourse}
                    onChange={(e) => setExamCourse(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50"
                  >
                    <option value="Epic Grammer 2026" className="bg-neutral-950 text-white font-bold">Epic Grammer 2026</option>
                    <option value="أساسيات الرياضيات 2026" className="bg-neutral-950 text-white font-bold">أساسيات الرياضيات 2026</option>
                  </select>
                </div>
              </div>

              {suggestedQuestions.length > 0 && (
                <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 space-y-4">
                  <span className="block text-xs font-black text-amber-400">
                    الأسئلة المقترحة من Altiora AI:
                  </span>
                  <div className="space-y-3">
                    {suggestedQuestions.map((q, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-zinc-800 bg-zinc-950/50 p-4 rounded-xl text-xs sm:text-sm"
                      >
                        <button
                          onClick={() => {
                            toast.success("تم إضافة السؤال إلى بنك الأسئلة للدورة");
                          }}
                          className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer w-full sm:w-auto"
                        >
                          إضافة لبنك الأسئلة
                        </button>
                        <p className="flex-1 leading-relaxed text-right text-white font-bold w-full">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTool === "summaries" && (
            <motion.div
              key="summaries-tool"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-amber-400">
                  تلخيص المحاضرات والمناهج تلقائياً
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  اكتب نص الدرس أو محاضرة الفيديو وسنقوم بتوليد ملخص منظم وجاهز للنشر للطلاب.
                </p>
              </div>

              <form onSubmit={handleGenerateSummary} className="space-y-4 max-w-2xl ml-auto">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    محتوى الدرس أو المحاضرة النصي
                  </label>
                  <textarea
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    required
                    rows={4}
                    placeholder="أدخل النص هنا لتلخيصه..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري التلخيص..." : "توليد الملخص"}
                  <Wand2 className="size-4" />
                </button>
              </form>

              {generatedSummary && (
                <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 mt-4 text-xs sm:text-sm leading-relaxed max-w-2xl ml-auto space-y-4">
                  <p className="whitespace-pre-line text-zinc-300 font-medium">{generatedSummary}</p>
                  <button
                    onClick={() => toast.success("تم نشر الملخص لطلاب الدرس")}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-black hover:bg-amber-400 cursor-pointer"
                  >
                    نشر كملخص رسمي للدرس
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTool === "students" && (
            <motion.div
              key="students-tool"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-amber-400">
                  تحليل أداء ومخاطر الطلاب (Risk Analysis)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  رصد الطلاب المعرضين لعدم إكمال الكورسات أو انخفاض النتائج مع اقتراح الإجراءات المناسبة.
                </p>
              </div>

              <div className="space-y-4">
                {initialRiskStudents.map((st, idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-amber-500/10 bg-zinc-900/10 p-5 shadow-[0_0_40px_rgba(251,191,36,.04)] flex flex-col md:flex-row items-center justify-between gap-4 hover:scale-[1.01] transition-all"
                  >
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => toast.success(`تم إرسال تنبيه تشجيعي لـ ${st.name}`)}
                        className="w-full md:w-auto rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-black hover:bg-amber-400 transition-all cursor-pointer shadow-md"
                      >
                        إرسال التوصية
                      </button>
                    </div>

                    <div className="text-end flex-1 space-y-1 w-full">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${st.riskLevel === "HIGH" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}
                        >
                          مخاطرة {st.riskLevel === "HIGH" ? "عالية" : "متوسطة"}
                        </span>
                        <h4 className="font-bold text-white text-sm">{st.name}</h4>
                      </div>
                      <div className="text-xs text-zinc-400">
                        الكورس: {st.course} | السبب: {st.reason}
                      </div>
                      <p className="text-xs text-amber-400 font-bold mt-1">
                        توجيه AI: {st.aiAdvice}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTool === "improvement" && (
            <motion.div
              key="improvement-tool"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-amber-400">
                  توصيات تحسين نسب إنجاز المقررات
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  اقتراحات قائمة على الإحصائيات وهبوط معدلات مشاهدة الطلاب في دروس محددة.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border border-amber-500/10 p-5 rounded-2xl space-y-2 text-end bg-zinc-900/30">
                  <div className="flex items-center justify-end gap-2 text-xs font-bold text-amber-400">
                    <AlertTriangle className="size-4 text-amber-400" />
                    <span>دورة: Epic Grammer 2026 — الدرس الرابع</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    المشكلة: هبوط نسبة إكمال المحاضرة الفيديو من 85% إلى 38% في المنتصف.
                  </p>
                  <p className="text-xs font-semibold text-white leading-relaxed mt-2">
                    توصية AI: مدة الفيديو 55 دقيقة وهي طويلة جداً. نقترح تقسيم المحاضرة إلى درسين
                    منفصلين (أقل من 25 دقيقة لكل درس) وإضافة سؤال تفاعلي MCQ في المنتصف للحفاظ على
                    تفاعل الطالب.
                  </p>
                </div>

                <div className="border border-amber-500/10 p-5 rounded-2xl space-y-2 text-end bg-zinc-900/30">
                  <div className="flex items-center justify-end gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>دورة: أساسيات الرياضيات 2026 — الوحدة الأولى</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    الملاحظة: نسبة إكمال عالية جداً 94% للطلاب في درس الدوال ولكن درجات الواجب منخفضة.
                  </p>
                  <p className="text-xs font-semibold text-white leading-relaxed mt-2">
                    توصية AI: الكورس ممتاز وجذاب للطلاب، لكن الأسئلة تحتاج لتدرج أسهل أو توفير ملخص
                    إضافي مساعد لشرح الحلول بالفيديو.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTool === "assistant" && (
            <motion.div
              key="assistant-tool"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="font-display text-lg font-bold text-amber-400">
                  مساعد صياغة الرسائل والإعلانات للمعلم
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  اكتب فكرة عامة لتنبيه الطلاب أو التواصل معهم وسيتولى المساعد صياغتها بأسلوب أكاديمي جذاب.
                </p>
              </div>

              <form onSubmit={handleGenerateReply} className="space-y-4 max-w-2xl ml-auto">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    الفكرة أو الموضوع
                  </label>
                  <textarea
                    value={assistantPrompt}
                    onChange={(e) => setAssistantPrompt(e.target.value)}
                    required
                    rows={2}
                    placeholder="مثال: تذكير بالامتحان الشامل غداً كيمياء"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "جاري الصياغة..." : "صياغة التنبيه"}
                  <Wand2 className="size-4" />
                </button>
              </form>

              {generatedEmail && (
                <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-5 mt-4 text-xs sm:text-sm leading-relaxed max-w-2xl ml-auto text-end space-y-4 animate-fade-in">
                  <p className="whitespace-pre-line font-medium text-zinc-300">{generatedEmail}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedEmail);
                      toast.success("تم نسخ النص إلى الحافظة");
                    }}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer"
                  >
                    نسخ النص المصاغ
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
