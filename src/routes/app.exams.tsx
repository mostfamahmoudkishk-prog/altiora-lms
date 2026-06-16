import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Info,
  ShieldAlert,
  Clock,
  CheckCircle,
  AlertTriangle,
  Monitor,
  RotateCcw,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  PlaySquare,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getExamsFn,
  getExamAttemptsFn,
  submitExamAttemptFn,
  getExamCorrectionDetailsFn,
  logViolationServerFn,
} from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/app/exams")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      examId: typeof search.examId === "string" ? search.examId : undefined,
    };
  },
  head: () => ({
    meta: [{ title: "الامتحانات والتقييمات | Altiora" }],
  }),
  component: ExamsPage,
});

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  choiceText?: string | null;
}

interface Question {
  id: string;
  text: string;
  type: string;
  qType?: "MULTIPLE_CHOICE" | "ESSAY" | null;
  difficulty?: "VERY_EASY" | "EASY" | "MEDIUM" | "HARD" | "VERY_HARD" | null;
  explanation?: string | null;
  questionText?: string | null;
  mark?: number | null;
  points?: number;
  choices: Choice[];
}

interface Exam {
  id: string;
  title: string;
  durationLimit: number;
  passScore: number;
  maxAttempts: number;
  questions: Question[];
}

interface AttemptRecord {
  id: string;
  date: string;
  score: number;
  passed: boolean;
  violationsCount: number;
  created_at: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  VERY_EASY: "سهل جداً",
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  VERY_HARD: "صعب جداً",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  VERY_EASY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  EASY: "bg-green-500/10 text-green-500 border-green-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  HARD: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  VERY_HARD: "bg-red-500/10 text-red-500 border-red-500/20",
};

function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examRunning, setExamRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [loadingCorrection, setLoadingCorrection] = useState(false);
  const [correctionDetails, setCorrectionDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"exams" | "attempts" | "review">("exams");

  // Timer & Answers state
  const [timeLeft, setTimeLeft] = useState(900); // default 15 mins
  const [answers, setAnswers] = useState<
    Record<string, { selectedChoiceId?: string; essayAnswerText?: string }>
  >({});
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [violations, setViolations] = useState<string[]>([]);
  const [violationReason, setViolationReason] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { examId } = Route.useSearch();

  // Auto-select exam from URL search query
  useEffect(() => {
    if (examId && exams.length > 0) {
      const target = exams.find((e) => e.id === examId);
      if (target) {
        setSelectedExam(target);
        setShowConfirm(true);
      }
    }
  }, [examId, exams]);

  // Load Exams and Attempts
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      getExamsFn()
        .then((res: any) => {
          console.log("getExamsFn resolved:", res);
          setExams(res || []);
        })
        .catch((err) => {
          console.error("Error loading exams in ExamsPage:", err);
          toast.error("حدث خطأ أثناء تحميل الامتحانات");
          setExams([]);
        });

      const isPreview = sessionStorage.getItem("student_preview_mode") === "true";
      if (isPreview) {
        try {
          const mockAtts = JSON.parse(sessionStorage.getItem("preview_attempts") || "[]");
          setAttempts(mockAtts);
        } catch {
          setAttempts([]);
        }
      } else {
        getExamAttemptsFn({ data: { email: user.email } })
          .then((res: any) => {
            console.log("getExamAttemptsFn resolved:", res);
            setAttempts(res || []);
          })
          .catch((err) => {
            console.error("Error loading attempts in ExamsPage:", err);
            toast.error("حدث خطأ أثناء تحميل سجل المحاولات");
            setAttempts([]);
          });
      }
    }
  }, []);

  useEffect(() => {
    const handleSync = () => {
      const isPreview = sessionStorage.getItem("student_preview_mode") === "true";
      if (isPreview) {
        try {
          const mockAtts = JSON.parse(sessionStorage.getItem("preview_attempts") || "[]");
          setAttempts(mockAtts);
        } catch {
          setAttempts([]);
        }
      }
    };

    window.addEventListener("preview_attempts_updated", handleSync);
    return () => {
      window.removeEventListener("preview_attempts_updated", handleSync);
    };
  }, []);

  // Timer interval
  useEffect(() => {
    if (examRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleFinishExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examRunning, timeLeft]);

  // Anti-Cheat Event Listeners
  useEffect(() => {
    if (!examRunning) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("تغيير التبويب أو تصغير المتصفح (Visibility Hidden)");
      }
    };

    const handleWindowBlur = () => {
      triggerViolation("الخروج من نافذة الامتحان أو فتح نافذة جديدة (Window Focus Lost)");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && examRunning && !examFinished) {
        triggerViolation("الخروج من وضع ملء الشاشة (Fullscreen Exited)");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [examRunning, examFinished]);

  const triggerViolation = (reason: string) => {
    if (showViolationDialog || examFinished) return;
    setViolationReason(reason);
    setViolations((prev) => [...prev, `${new Date().toLocaleTimeString("ar-EG")} - ${reason}`]);
    setShowViolationDialog(true);
    toast.error("تنبيه مكافحة الغش: تم رصد محاولة مغادرة صفحة الامتحان!");
  };

  const handleStartExam = async () => {
    if (!selectedExam) return;
    setShowConfirm(false);
    setViolations([]);
    setAnswers({});
    setTimeLeft(selectedExam.durationLimit * 60);
    setExamFinished(false);

    // Request Full Screen Mode
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.warning("تعذر الدخول في ملء الشاشة تلقائياً، يرجى تفعيل ملء الشاشة يدوياً.");
    }

    setExamRunning(true);
  };

  const handleReturnToExam = async () => {
    setShowViolationDialog(false);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* no-op */
    }
  };

  const handleFinishExam = (autoSubmit = false) => {
    if (!selectedExam) return;
    setExamRunning(false);
    setExamFinished(true);
    setShowViolationDialog(false);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const user = getCurrentUser();
    if (user) {
      const isPreview = sessionStorage.getItem("student_preview_mode") === "true";

      if (isPreview) {
        // Sandboxed grading for Preview Mode
        let totalPoints = 0;
        let earnedPoints = 0;

        (selectedExam.questions || []).forEach((q) => {
          const points = q.points || q.mark || 1;
          totalPoints += points;

          const ans = answers[q.id];
          const qType = q.qType || q.type || "MULTIPLE_CHOICE";
          if (qType === "MULTIPLE_CHOICE" || qType === "MCQ") {
            const correctChoice = q.choices.find((c) => c.isCorrect);
            if (correctChoice && ans?.selectedChoiceId === correctChoice.id) {
              earnedPoints += points;
            }
          } else {
            // Essay auto-passed in preview mode
            earnedPoints += points;
          }
        });

        const pctScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        const passed = pctScore >= selectedExam.passScore;
        const mockAttemptId = `preview-${selectedExam.id}-${Date.now()}`;

        const mockCorrection = {
          id: mockAttemptId,
          isPublished: true,
          passed,
          score: pctScore,
          violationsCount: violations.length,
          reviewedBy: {
            profile: { name: "معلم افتراضي" },
            email: "teacher@altiora.edu",
          },
          reviewedAt: new Date().toISOString(),
          exam: {
            id: selectedExam.id,
            title: selectedExam.title,
            passScore: selectedExam.passScore,
            courseId: (selectedExam as any).courseId || "demo-math-2026",
            questions: selectedExam.questions,
          },
          attemptAnswers: Object.entries(answers).map(([qId, ans]) => {
            const q = selectedExam.questions.find((qy) => qy.id === qId);
            const correctChoice = q?.choices.find((c) => c.isCorrect);
            return {
              questionId: qId,
              selectedChoiceId: ans.selectedChoiceId || null,
              isCorrect: correctChoice && ans?.selectedChoiceId === correctChoice.id,
            };
          }),
          essayAnswers: Object.entries(answers)
            .filter(([qId]) => {
              const q = selectedExam.questions.find((qy) => qy.id === qId);
              return q && q.qType !== "MULTIPLE_CHOICE" && q.type !== "MCQ";
            })
            .map(([qId, ans]) => {
              const q = selectedExam.questions.find((qy) => qy.id === qId);
              return {
                questionId: qId,
                answerText: ans.essayAnswerText || null,
                score: q?.points || q?.mark || 1,
                feedback: "إجابة ممتازة (معاينة كطالب)",
              };
            }),
          aiRecommendation: !passed
            ? {
                weakTopics: ["مواضيع المراجعة العامة"],
                recommendedLessons: [],
              }
            : null,
        };

        try {
          // Store mock correction details
          sessionStorage.setItem(`preview_correction_${mockAttemptId}`, JSON.stringify(mockCorrection));

          // Store mock attempt record
          const mockAtts = JSON.parse(sessionStorage.getItem("preview_attempts") || "[]");
          mockAtts.unshift({
            id: mockAttemptId,
            examId: selectedExam.id,
            date: new Date().toISOString(),
            score: pctScore,
            passed,
            violationsCount: violations.length,
            created_at: new Date().toISOString(),
          });
          sessionStorage.setItem("preview_attempts", JSON.stringify(mockAtts));

          toast.success("وضع المعاينة: تم تسليم الامتحان وحساب النتيجة محلياً بنجاح.");
          
          // Trigger events to notify other routes
          window.dispatchEvent(new Event("preview_attempts_updated"));
          window.dispatchEvent(new Event("preview_progress_updated"));
          
          handleReviewAttempt(mockAttemptId);
        } catch (err: any) {
          console.error("Failed to save mock exam attempt:", err);
          toast.error("فشل حفظ محاولة الامتحان الافتراضية");
        }
      } else {
        const answersPayload = Object.entries(answers).map(([qId, ans]) => ({
          questionId: qId,
          selectedChoiceId: ans.selectedChoiceId || null,
          essayAnswerText: ans.essayAnswerText || null,
        }));

        submitExamAttemptFn({
          data: {
            email: user.email,
            examId: selectedExam.id,
            answers: answersPayload,
            violationsCount: violations.length,
          },
        })
          .then((res: any) => {
            toast.success(
              autoSubmit
                ? "انتهى وقت الامتحان وتم تسليم الإجابات."
                : "تم تسليم الامتحان وحساب النتيجة.",
            );
            handleReviewAttempt(res.attemptId);
            getExamAttemptsFn({ data: { email: user.email } })
              .then((attRes: any) => {
                setAttempts(attRes || []);
              })
              .catch((err) => {
                console.error("Error refreshing attempts in handleFinishExam:", err);
              });
          })
          .catch((err) => {
            toast.error("حدث خطأ أثناء حفظ النتيجة: " + err.message);
          });

        if (violations.length > 0) {
          violations.forEach((v) => {
            logViolationServerFn({
              data: {
                email: user.email,
                examTitle: selectedExam.title,
                type: "EXAM_VIOLATION",
                details: v,
              },
            }).catch(() => {});
          });
        }
      }
    }
  };

  const handleReviewAttempt = async (attemptId: string) => {
    setLoadingCorrection(true);
    setActiveTab("review");

    if (attemptId.startsWith("preview-")) {
      try {
        const mockData = sessionStorage.getItem(`preview_correction_${attemptId}`);
        if (mockData) {
          setCorrectionDetails(JSON.parse(mockData));
        } else {
          toast.error("فشل تحميل تفاصيل الإجابة الافتراضية.");
        }
      } catch (err) {
        console.error("Failed to load mock correction details:", err);
      } finally {
        setLoadingCorrection(false);
      }
      return;
    }

    try {
      const res = await getExamCorrectionDetailsFn({ data: { attemptId } });
      setCorrectionDetails(res);
    } catch (err: any) {
      toast.error("فشل تحميل تفاصيل الإجابة: " + err.message);
    } finally {
      setLoadingCorrection(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-end" dir="rtl">
      {/* Page Title */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card sm:flex-row sm:items-center">
        <h2 className="font-display text-xl font-bold text-foreground">الامتحانات والتقييمات</h2>
        <span className="text-xs text-muted-foreground">الصف الثاني الثانوي • لغة إنجليزية</span>
      </div>

      {!examRunning && !examFinished && (
        <div className="space-y-6">
          {/* Tabs bar */}
          <div className="flex justify-start border-b border-border">
            <button
              onClick={() => setActiveTab("exams")}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === "exams"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              الامتحانات المتاحة
            </button>
            <button
              onClick={() => setActiveTab("attempts")}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                activeTab === "attempts"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              سجل المحاولات ({attempts.length})
            </button>
            {correctionDetails && (
              <button
                onClick={() => setActiveTab("review")}
                className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === "review"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                مراجعة إجابة الامتحان
              </button>
            )}
          </div>

          {activeTab === "exams" && (
            <div className="grid gap-6 md:grid-cols-[1fr_320px]">
              {/* Main info card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
                <h3 className="font-display text-lg font-bold text-foreground">
                  الامتحانات المتاحة
                </h3>

                {exams.length > 0 ? (
                  <div className="space-y-4">
                    {exams.map((ex) => (
                      <div
                        key={ex.id}
                        className="rounded-xl border border-border bg-card p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
                            مستمر
                          </span>
                          <div className="text-end">
                            <h4 className="font-bold text-foreground">{ex.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              الأسئلة: {ex.questions?.length || 0}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <div className="font-bold text-primary">{ex.durationLimit} دقيقة</div>
                            <div className="text-[10px] text-muted-foreground">المدة الزمنية</div>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <div className="font-bold text-primary">{ex.passScore}%</div>
                            <div className="text-[10px] text-muted-foreground">درجة النجاح</div>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <div className="font-bold text-primary">{ex.maxAttempts} محاولات</div>
                            <div className="text-[10px] text-muted-foreground">الحد الأقصى</div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => {
                              setSelectedExam(ex);
                              setShowConfirm(true);
                            }}
                            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-95 transition-all"
                          >
                            بدء الامتحان
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    لا توجد اختبارات مضافة حالياً في قاعدة البيانات.
                  </div>
                )}
              </div>

              {/* Sidebar stats */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
                <h3 className="font-display text-sm font-bold text-foreground flex items-center justify-end gap-2">
                  <span>آخر المحاولات</span>
                  <Award className="size-4 text-primary" />
                </h3>

                {attempts.length > 0 ? (
                  <div className="space-y-3">
                    {attempts.slice(0, 5).map((att) => (
                      <div
                        key={att.id}
                        className="rounded-xl border border-border bg-secondary/20 p-3 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-bold ${att.passed ? "text-success" : "text-destructive"}`}
                          >
                            {att.score}% ({att.passed ? "ناجح" : "راسب"})
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(att.created_at || Date.now()).toLocaleDateString("ar-EG")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted-foreground">
                            المخالفات: {att.violationsCount}
                          </span>
                          <button
                            onClick={() => handleReviewAttempt(att.id)}
                            className="text-primary hover:underline font-bold"
                          >
                            عرض نموذج الإجابة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    لم تخض أي محاولات للاختبارات حتى الآن.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "attempts" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
              <h3 className="font-display text-lg font-bold text-foreground">
                جميع محاولات الامتحانات
              </h3>
              {attempts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-end text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20 text-xs font-bold text-muted-foreground">
                        <th className="px-4 py-3">الامتحان</th>
                        <th className="px-4 py-3">التاريخ</th>
                        <th className="px-4 py-3 text-center">النتيجة</th>
                        <th className="px-4 py-3 text-center">الحالة</th>
                        <th className="px-4 py-3 text-center">المخالفات</th>
                        <th className="px-4 py-3 text-left">التصحيح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attempts.map((att: any) => (
                        <tr key={att.id} className="hover:bg-secondary/10">
                          <td className="px-4 py-3 font-bold">{att.exam?.title || "اختبار عام"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(att.created_at || Date.now()).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">
                            {att.isPublished ? `${att.score}%` : "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {att.isPublished ? (
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${att.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                              >
                                {att.passed ? "ناجح" : "راسب"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-500">
                                قيد التصحيح
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-amber-500 font-semibold">
                            {att.violationsCount}
                          </td>
                          <td className="px-4 py-3 text-left">
                            <button
                              onClick={() => handleReviewAttempt(att.id)}
                              className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                            >
                              <Eye className="size-3" /> {att.isPublished ? "عرض التصحيح" : "متابعة حالة التصحيح"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  لم يتم العثور على أي محاولات سابقة.
                </div>
              )}
            </div>
          )}

          {activeTab === "review" && (
            <div className="space-y-6">
              {loadingCorrection ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  جارٍ تحميل تفاصيل الإجابة والتصحيح…
                </div>
              ) : correctionDetails ? (
                !correctionDetails.isPublished ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.02] p-8 text-center shadow-card my-6">
                    <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-6">
                      <AlertTriangle className="size-8 animate-pulse" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">النتيجة قيد التصحيح والمراجعة اليدوية</h3>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                      يتم حالياً تصحيح وتقييم الأسئلة المقالية الخاصة بك من قبل المعلم. سيتم نشر النتيجة النهائية وتفاصيل الإجابة الصحيحة فور الانتهاء من المراجعة والتدقيق.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 print-report-container">
                    {/* Style for print layout */}
                    <style>{`
                      @media print {
                        body {
                          background: white !important;
                          color: black !important;
                          direction: rtl !important;
                          font-family: system-ui, sans-serif !important;
                        }
                        aside, header, nav, footer, button, .print-hidden {
                          display: none !important;
                        }
                        .print-report-container {
                          width: 100% !important;
                          max-width: 100% !important;
                          margin: 0 !important;
                          padding: 20px !important;
                          border: none !important;
                          box-shadow: none !important;
                        }
                        .print-page-break {
                          page-break-inside: avoid !important;
                        }
                      }
                    `}</style>

                    {/* Attempt Summary */}
                    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                      <div className="flex justify-between items-center mb-4 print-hidden">
                        <button
                          onClick={() => window.print()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white cursor-pointer"
                        >
                          <Printer className="size-4" />
                          <span>طباعة تقرير النتيجة (PDF)</span>
                        </button>
                        
                        <h3 className="font-display text-lg font-bold text-foreground">
                          نموذج إجابة وتصحيح: {correctionDetails.exam?.title}
                        </h3>
                      </div>

                      <h3 className="hidden print:block font-display text-xl font-bold text-foreground text-center mb-6">
                        تقرير نتيجة اختبار: {correctionDetails.exam?.title}
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-3 text-center">
                        <div className="bg-secondary/40 rounded-xl p-3">
                          <div className="text-xs text-muted-foreground font-semibold">النتيجة النهائية</div>
                          <div
                            className={`text-2xl font-black ${correctionDetails.passed ? "text-success" : "text-destructive"}`}
                          >
                            {correctionDetails.score}%
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            درجة النجاح المطلوبة: {correctionDetails.exam?.passScore}%
                          </div>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-3">
                          <div className="text-xs text-muted-foreground font-semibold">حالة الامتحان</div>
                          <div
                            className={`text-lg font-black mt-1 ${correctionDetails.passed ? "text-success" : "text-destructive"}`}
                          >
                            {correctionDetails.passed ? "ناجح" : "راسب"}
                          </div>
                        </div>
                        <div className="bg-secondary/40 rounded-xl p-3">
                          <div className="text-xs text-muted-foreground font-semibold">مخالفات الغش</div>
                          <div
                            className={`text-2xl font-black ${correctionDetails.violationsCount > 0 ? "text-amber-500" : "text-success"}`}
                          >
                            {correctionDetails.violationsCount}
                          </div>
                          <div className="text-[10px] text-muted-foreground">محاولات خروج مسجلة</div>
                        </div>

                        {correctionDetails.reviewedBy && (
                          <div className="bg-secondary/40 rounded-xl p-3 sm:col-span-3 text-right">
                            <div className="text-xs text-muted-foreground font-semibold">المصحح والمراجع</div>
                            <div className="text-sm font-bold text-foreground mt-0.5">
                              المعلم: {correctionDetails.reviewedBy?.profile?.name || correctionDetails.reviewedBy?.email}
                            </div>
                            {correctionDetails.reviewedAt && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                تاريخ وتوقيت نشر النتيجة: {new Date(correctionDetails.reviewedAt).toLocaleString("ar-EG")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Study Assistant Smart Box (AI Recommendation) */}
                    {!correctionDetails.passed && correctionDetails.aiRecommendation && (
                      <div className="rounded-2xl border border-primary/25 bg-primary/[0.02] p-5 shadow-card space-y-4 print-hidden">
                        <h4 className="font-display text-sm font-bold text-primary flex items-center justify-end gap-2">
                          <span>مساعد الدراسة الذكي (الذكاء الاصطناعي)</span>
                          <Sparkles className="size-4 text-primary animate-pulse" />
                        </h4>
                        <div className="text-xs space-y-3 leading-relaxed">
                          <div className="bg-secondary/40 p-3 rounded-xl">
                            <span className="font-bold text-foreground block mb-1">نقاط الضعف المحددة التي تحتاج للتحسين:</span>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              {(correctionDetails.aiRecommendation.weakTopics || []).map((topic: string, i: number) => (
                                <span key={i} className="bg-destructive/10 text-destructive rounded px-2.5 py-1 font-semibold text-[10px]">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="bg-secondary/40 p-3 rounded-xl">
                            <span className="font-bold text-foreground block mb-2">المحاضرات المقترحة لمراجعتها الآن:</span>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {(correctionDetails.aiRecommendation.recommendedLessons || []).map((lesson: any) => (
                                <Link
                                  key={lesson.id}
                                  to={`/app/courses/${correctionDetails.exam?.courseId}` as any}
                                  className="flex items-center justify-between rounded-lg bg-card border border-border/60 p-2 text-right transition-all hover:bg-secondary hover:text-primary font-semibold text-[10px] text-muted-foreground"
                                >
                                  <span>{lesson.title}</span>
                                  <PlaySquare className="size-3.5 text-primary shrink-0" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Correction details of each question */}
                    <div className="space-y-6">
                      {(correctionDetails.exam?.questions || []).map((q: any, idx: number) => {
                        const qType = q.qType || "MULTIPLE_CHOICE";
                        const studentMcqAns = correctionDetails.attemptAnswers?.find(
                          (a: any) => a.questionId === q.id,
                        );
                        const studentEssayAns = correctionDetails.essayAnswers?.find(
                          (a: any) => a.questionId === q.id,
                        );
                        const difficulty = q.difficulty || "MEDIUM";

                        return (
                          <div
                            key={q.id}
                            className="rounded-xl border border-border bg-card p-5 space-y-4 text-right print-page-break"
                          >
                            <div className="flex items-center justify-between border-b border-border pb-3">
                              <span
                                className={`rounded-xl border px-3 py-1 text-xs font-bold ${DIFFICULTY_COLORS[difficulty]}`}
                              >
                                الصعوبة: {DIFFICULTY_LABELS[difficulty]}
                              </span>
                              <div className="text-end font-bold text-foreground">
                                <span>
                                  السؤال {idx + 1} ({q.mark || q.points} درجة)
                                </span>
                              </div>
                            </div>

                            <p className="text-foreground font-semibold text-sm leading-relaxed">
                              {q.questionText || q.text}
                            </p>

                            {/* MCQ Choice review */}
                            {(qType === "MULTIPLE_CHOICE" || q.type === "MCQ") && (
                              <div className="grid gap-2 sm:grid-cols-2 pt-2">
                                {(q.choices || []).map((choice: any) => {
                                  const isSelected = studentMcqAns?.selectedChoiceId === choice.id;
                                  const isCorrect = choice.isCorrect;

                                  let styleClass = "border-border bg-card text-foreground";
                                  let icon: React.ReactNode = null;

                                  if (isSelected) {
                                    if (isCorrect) {
                                      styleClass = "border-success bg-success/10 text-success";
                                      icon = <CheckCircle2 className="size-4 shrink-0" />;
                                    } else {
                                      styleClass =
                                        "border-destructive bg-destructive/10 text-destructive";
                                      icon = <XCircle className="size-4 shrink-0" />;
                                    }
                                  } else if (isCorrect) {
                                    styleClass =
                                      "border-success bg-success/5 text-success opacity-90";
                                    icon = <CheckCircle2 className="size-4 shrink-0" />;
                                  }

                                  return (
                                    <div
                                      key={choice.id}
                                      className={`flex items-center justify-between rounded-xl border p-3.5 text-right text-xs font-semibold transition-all ${styleClass}`}
                                    >
                                      <span>{choice.choiceText || choice.text}</span>
                                      {icon}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Essay response review */}
                            {qType === "ESSAY" && (
                              <div className="space-y-3 pt-2">
                                <div className="rounded-xl bg-secondary/30 p-3 border border-border">
                                  <span className="block text-xs font-bold text-muted-foreground mb-1">
                                    إجابة الطالب:
                                  </span>
                                  <p className="text-xs text-foreground whitespace-pre-wrap">
                                    {studentEssayAns?.answerText || "لم يتم تقديم إجابة."}
                                  </p>
                                </div>

                                {studentEssayAns?.teacherGrade !== null ? (
                                  <div className="rounded-xl bg-success/5 border border-success/20 p-3 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-bold text-success">
                                        درجة التقييم: {studentEssayAns?.teacherGrade} من{" "}
                                        {q.mark || q.points}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        تم التصحيح بواسطة المعلم
                                      </span>
                                    </div>
                                    {studentEssayAns?.teacherFeedback && (
                                      <p className="text-xs text-foreground leading-relaxed">
                                        <span className="font-bold block text-muted-foreground text-[10px]">
                                          ملاحظات المعلم:
                                        </span>
                                        {studentEssayAns.teacherFeedback}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-center">
                                    <p className="text-xs text-amber-500 font-semibold">
                                      بانتظار تصحيح المعلم للأسئلة المقالية
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5 mt-2">
                                <span className="block text-xs font-bold text-primary mb-1">
                                  تفسير نموذج الإجابة:
                                </span>
                                <p className="text-xs text-foreground leading-relaxed">
                                  {q.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  لم يتم العثور على تفاصيل لهذه المحاولة.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* EXAM PLAYING SCREEN */}
      {examRunning && selectedExam && (
        <div className="rounded-2xl border border-destructive bg-card p-6 shadow-card space-y-6">
          {/* Header row with Branding */}
          <div className="flex flex-col gap-4 border-b border-border pb-4">
            <div className="flex items-center justify-between">
              {/* Altiora Logo */}
              <div className="flex items-center gap-1.5">
                <img
                  src="/src/assets/altiora-logo-transparent.png"
                  alt="Altiora"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              {/* Teacher Branding */}
              {(selectedExam as any)?.allowCustomBranding !== false &&
              (selectedExam as any)?.course?.courseInstructors?.[0]?.instructor?.instructorBranding
                ?.logoUrl ? (
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-xs"
                    style={{
                      color:
                        (selectedExam as any)?.course?.courseInstructors?.[0]?.instructor
                          ?.instructorBranding?.primaryColor || undefined,
                    }}
                  >
                    {(selectedExam as any)?.course?.courseInstructors?.[0]?.instructor
                      ?.instructorBranding?.brandName ||
                      (selectedExam as any)?.course?.courseInstructors?.[0]?.instructor?.profile
                        ?.name}
                  </span>
                  <img
                    src={
                      (selectedExam as any)?.course?.courseInstructors?.[0]?.instructor
                        ?.instructorBranding?.logoUrl
                    }
                    alt="Instructor Logo"
                    className="h-8 w-auto object-contain"
                  />
                </div>
              ) : (
                <span className="font-bold text-xs text-muted-foreground">
                  {(selectedExam as any)?.course?.courseInstructors?.[0]?.instructor?.profile
                    ?.name ||
                    (selectedExam as any)?.course?.courseInstructors?.[0]?.instructor?.email?.split(
                      "@",
                    )[0] ||
                    ""}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive font-bold text-sm bg-destructive/10 px-3 py-1.5 rounded-lg">
                <Clock className="size-4" />
                <span>الوقت المتبقي: {formatTime(timeLeft)}</span>
              </div>

              <div className="text-end">
                <h3 className="font-display text-base font-bold text-foreground">
                  {selectedExam.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  تنبيه: لا تغادر وضع ملء الشاشة أو التبويب الحالي لتفادي تسجيل مخالفة غش.
                </p>
              </div>
            </div>
          </div>

          {/* Violation warning row */}
          {violations.length > 0 && (
            <div className="flex items-center justify-end gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-amber-500 text-xs font-bold">
              <span>تم رصد ({violations.length}) مخالفات غش أثناء محاولتك الحالية.</span>
              <AlertTriangle className="size-4" />
            </div>
          )}

          {/* Questions list */}
          <div className="space-y-6">
            {(selectedExam.questions || []).map((q, qidx) => {
              const qType = q.qType || "MULTIPLE_CHOICE";
              const qText = q.questionText || q.text;
              const difficulty = q.difficulty || "MEDIUM";

              return (
                <div
                  key={q.id}
                  className="space-y-3 p-4 rounded-xl bg-secondary/30 border border-border/60 text-right"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold border ${DIFFICULTY_COLORS[difficulty]}`}
                    >
                      {DIFFICULTY_LABELS[difficulty]}
                    </span>
                    <h4 className="font-bold text-foreground text-sm flex items-start gap-1 justify-end">
                      <span>
                        {qidx + 1}. {qText} ({q.mark || q.points} درجة)
                      </span>
                    </h4>
                  </div>

                  {/* Render MCQ Option choices */}
                  {(qType === "MULTIPLE_CHOICE" || q.type === "MCQ") && (
                    <div className="grid gap-2 sm:grid-cols-2">
                    {(q.choices || []).map((choice) => {
                        const isSelected = answers[q.id]?.selectedChoiceId === choice.id;
                        return (
                          <button
                            key={choice.id}
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: { selectedChoiceId: choice.id },
                              }))
                            }
                            className={`rounded-xl border p-3.5 text-right text-xs font-semibold transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card hover:bg-secondary/40 text-foreground"
                            }`}
                          >
                            {choice.choiceText || choice.text}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Render Essay Input Area */}
                  {qType === "ESSAY" && (
                    <div className="space-y-2">
                      <textarea
                        value={answers[q.id]?.essayAnswerText || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: { essayAnswerText: e.target.value },
                          }))
                        }
                        placeholder="اكتب إجابتك المقالية بالتفصيل هنا..."
                        rows={5}
                        className="w-full text-right rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => {
                if (window.confirm("هل أنت متأكد من تسليم الإجابات وإنهاء الامتحان؟")) {
                  handleFinishExam();
                }
              }}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-95 transition-all shadow-card"
            >
              تسليم الإجابات وإنهاء الامتحان
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION BEFORE START MODAL */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-2xl border border-border bg-card text-end"
        >
          <DialogHeader>
            <DialogTitle className="text-end">تأكيد بدء الامتحان</DialogTitle>
            <DialogDescription className="text-end">
              يرجى قراءة التعليمات الأمنية لمكافحة الغش بعناية قبل البدء:
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-secondary/50 p-4 text-xs text-foreground space-y-3 leading-relaxed">
            <div className="flex items-start justify-end gap-2 font-bold text-destructive">
              <span>سيتم قفل الامتحان عند مغادرة وضع ملء الشاشة أو تبديل النافذة.</span>
              <ShieldAlert className="size-4 shrink-0" />
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground pr-4">
              <li>يجب البقاء في وضع ملء الشاشة طوال فترة الامتحان.</li>
              <li>ممنوع تبديل التبويبات أو تصغير المتصفح.</li>
              <li>سيتم تسجيل كافة المحاولات وإرسالها فوراً للمدرس ومسؤول الأمان.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 justify-end">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
            >
              إلغاء
            </button>
            <button
              onClick={handleStartExam}
              className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-95"
            >
              موافق، ابدأ الامتحان الآن
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ANTI-CHEAT DETECTION WARNING MODAL */}
      <Dialog open={showViolationDialog} onOpenChange={() => {}}>
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-2xl border border-destructive bg-card text-end"
          closeButton={false}
        >
          <DialogHeader className="space-y-2">
            <div className="flex justify-center text-destructive">
              <ShieldAlert className="size-12 animate-bounce" />
            </div>
            <DialogTitle className="text-center text-destructive font-black text-lg">
              ⚠️ تم رصد محاولة مغادرة الامتحان!
            </DialogTitle>
            <DialogDescription className="text-center font-bold text-foreground text-xs leading-relaxed">
              لقد قمت بتبديل التبويب، تصغير المتصفح، أو فقدان وضع ملء الشاشة.
              <br />
              <span className="text-destructive font-semibold">({violationReason})</span>
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive leading-relaxed text-center font-bold">
            تم تسجيل هذه المخالفة تلقائياً وإدراجها في سجلات الأمان الخاصة بالمدرس والأدمن.
          </div>

          <div className="flex flex-col gap-2 pt-3">
            <button
              onClick={handleReturnToExam}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-95 transition-all shadow-card"
            >
              العودة للامتحان (أنا ملتزم بالتعليمات)
            </button>
            <button
              onClick={() => handleFinishExam()}
              className="w-full rounded-xl border border-destructive bg-destructive/5 py-3 text-sm font-bold text-destructive hover:bg-destructive/10 transition-all"
            >
              إنهاء الامتحان وتسليمه الآن
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
