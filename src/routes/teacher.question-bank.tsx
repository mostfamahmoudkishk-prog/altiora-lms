import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Check,
  Play,
  Copy,
  Activity,
  Calendar,
  Layers,
  Settings,
  MoveUp,
  MoveDown,
  Clock,
  Award,
  Paperclip,
  Database,
  BookOpen,
  Maximize2,
  Minimize2,
  Flag,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getExamsFn,
  getPendingEssayAttemptsFn,
  gradeEssayAnswerFn,
  getTeacherGradingDashboardDataFn,
  publishExamAttemptResultFn,
  unpublishExamAttemptResultFn,
  getFeedbackTemplatesFn,
  createFeedbackTemplateFn,
  deleteFeedbackTemplateFn,
  getExamCorrectionDetailsFn,
  downloadExamTemplateFn,
  importExamFromExcelFn,
  exportExamToExcelFn,
  createExamFn,
  updateExamFn,
  deleteExamFn,
  duplicateExamFn,
  publishExamFn,
  createQuestionFn,
  updateQuestionFn,
  deleteQuestionFn,
  getCoursesFn,
  uploadFileFn,
  createExamSectionFn,
  updateExamSectionFn,
  deleteExamSectionFn,
  createExamVersionFn,
  getExamVersionsFn,
  restoreExamVersionFn,
} from "@/lib/api/db.functions";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/teacher/question-bank")({
  component: TeacherQuestionBank,
});

type QuestionDifficulty = "VERY_EASY" | "EASY" | "MEDIUM" | "HARD" | "VERY_HARD";
type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";

interface Question {
  id: string;
  examId?: string;
  type: string;
  qType: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  difficulty: QuestionDifficulty;
  mark: number;
  explanation: string;
  choices?: { id: string; text: string; isCorrect: boolean }[];
  imageUrl?: string | null;
  pdfUrl?: string | null;
  sectionId?: string | null;
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

function TeacherQuestionBank() {
  const [activeTab, setActiveTab] = useState<"questions" | "grading" | "exams">("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("ALL");
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Question Manual CRUD states
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Manual Question Form States
  const [formType, setFormType] = useState<
    "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY"
  >("MULTIPLE_CHOICE");
  const [formText, setFormText] = useState("");
  const [formOptions, setFormOptions] = useState<string[]>(["", "", "", ""]);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState("");
  const [formDifficulty, setFormDifficulty] = useState<QuestionDifficulty>("MEDIUM");
  const [formMark, setFormMark] = useState(1);
  const [formExplanation, setFormExplanation] = useState("");

  // Exam CRUD states
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [isAddExamMode, setIsAddExamMode] = useState(false);
  const [formExamTitle, setFormExamTitle] = useState("");
  const [formExamDescription, setFormExamDescription] = useState("");
  const [formExamCourseId, setFormExamCourseId] = useState("");
  const [formExamDurationLimit, setFormExamDurationLimit] = useState(30);
  const [formExamPassScore, setFormExamPassScore] = useState(50);
  const [formExamMaxAttempts, setFormExamMaxAttempts] = useState(2);
  const [formExamPublished, setFormExamPublished] = useState(false);
  const [formExamShuffleQuestions, setFormExamShuffleQuestions] = useState(false);
  const [formExamShowResults, setFormExamShowResults] = useState(true);
  const [titleTouched, setTitleTouched] = useState(false);
  const [examBuilderTab, setExamBuilderTab] = useState<"manual" | "excel">("manual");
  const [formQuestionImageUrl, setFormQuestionImageUrl] = useState("");
  const [formQuestionPdfUrl, setFormQuestionPdfUrl] = useState("");
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingQuestionPdf, setUploadingQuestionPdf] = useState(false);
  const [previewExamDetails, setPreviewExamDetails] = useState<any | null>(null);

  // Builder Enhancements & Simulator states
  const [formQuestionSectionId, setFormQuestionSectionId] = useState<string>("");
  const [formExamShuffleChoices, setFormExamShuffleChoices] = useState(false);
  const [formExamUseRandomSubset, setFormExamUseRandomSubset] = useState(false);
  const [formExamSubsetQuestionCount, setFormExamSubsetQuestionCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"IDLE" | "SAVING" | "SAVED">("IDLE");
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");
  const [isImportLibraryOpen, setIsImportLibraryOpen] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [librarySelectedQuestions, setLibrarySelectedQuestions] = useState<string[]>([]);
  const [simulateExamDetails, setSimulateExamDetails] = useState<any | null>(null);
  const [simAnswers, setSimAnswers] = useState<Record<string, string>>({});
  const [simTimeRemaining, setSimTimeRemaining] = useState<number>(0);
  const [simStarted, setSimStarted] = useState<boolean>(false);
  const [simSubmitted, setSimSubmitted] = useState<boolean>(false);
  const [simQuestions, setSimQuestions] = useState<any[]>([]);
  const [activeSimIdx, setActiveSimIdx] = useState<number>(0);

  // Excel Preview states
  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false);
  const [excelPreviewRows, setExcelPreviewRows] = useState<any[]>([]);
  const [excelValidationErrors, setExcelValidationErrors] = useState<string[]>([]);

  // Grading states
  const [pendingAttempts, setPendingAttempts] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [gradeInputs, setGradeInputs] = useState<
    Record<string, { grade: number; feedback: string }>
  >({});

  // Grading Overhaul States
  const [allAttempts, setAllAttempts] = useState<any[]>([]);
  const [selectedAttemptDetails, setSelectedAttemptDetails] = useState<any>(null);
  const [gradingFilter, setGradingFilter] = useState<"unreviewed" | "under_review" | "published" | "edited_post_publish">("unreviewed");
  const [feedbackTemplates, setFeedbackTemplates] = useState<any[]>([]);
  const [newTemplateText, setNewTemplateText] = useState("");
  const [loadingAttemptDetails, setLoadingAttemptDetails] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [filterSectionId, setFilterSectionId] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL"); // "ALL" | "IMPORTED" | "MANUAL"
  const [filterMinMark, setFilterMinMark] = useState<number | "">("");
  const [filterMaxMark, setFilterMaxMark] = useState<number | "">("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [page, setPage] = useState(1);

  // Bulk Operations
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Undo / Redo Command History
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Exam Versioning History
  const [examVersions, setExamVersions] = useState<any[]>([]);
  const [versionTimelineOpen, setVersionTimelineOpen] = useState(false);

  // Validation Warnings
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());

  // Additional Simulator States
  const [simScore, setSimScore] = useState<number>(0);
  const [simPercentage, setSimPercentage] = useState<number>(0);
  const [simPassed, setSimPassed] = useState<boolean>(false);
  const [simTimeSpent, setSimTimeSpent] = useState<number>(0);
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [fullscreenEnabled, setFullscreenEnabled] = useState<boolean>(false);
  const [reviewModeEnabled, setReviewModeEnabled] = useState<boolean>(false);

  // Auto-Save Status Hardening
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<"IDLE" | "SAVING" | "SAVED" | "FAILED">("IDLE");
  const itemsPerPage = 6;

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoadingQuestions(true);
    getExamsFn()
      .then((res: any) => {
        console.log("loadData getExamsFn resolved:", res);
        const examsList = res || [];
        setExams(examsList);
        const allQuestions: Question[] = [];
        examsList.forEach((ex: any) => {
          if (ex.questions) {
            ex.questions.forEach((q: any) => {
              allQuestions.push({
                id: q.id,
                examId: ex.id,
                type: q.type || "MCQ",
                qType: q.qType || "MULTIPLE_CHOICE",
                text: q.questionText || q.text || "",
                difficulty: q.difficulty || "MEDIUM",
                mark: q.mark || q.points || 1,
                explanation: q.explanation || "",
                options: q.choices?.map((c: any) => c.text) || [],
                correctAnswer: q.choices?.find((c: any) => c.isCorrect)?.text || "",
                choices: q.choices || [],
                imageUrl: q.imageUrl || null,
                pdfUrl: q.pdfUrl || null,
                sectionId: q.sectionId || null,
              });
            });
          }
        });
        setQuestions(allQuestions);
      })
      .catch((err) => {
        console.error("Error loading exams in QuestionBank:", err);
        toast.error("خطأ في تحميل الامتحانات: " + (err.message || String(err)));
        setExams([]);
        setQuestions([]);
      })
      .finally(() => setLoadingQuestions(false));

    getPendingEssayAttemptsFn()
      .then((res: any) => {
        console.log("getPendingEssayAttemptsFn resolved:", res);
        setPendingAttempts(res || []);
      })
      .catch((err) => {
        console.error("Error loading pending attempts in QuestionBank:", err);
        setPendingAttempts([]);
      });

    getTeacherGradingDashboardDataFn()
      .then((res: any) => {
        console.log("getTeacherGradingDashboardDataFn resolved:", res);
        setAllAttempts(res || []);
      })
      .catch((err) => {
        console.error("Error loading all attempts:", err);
        setAllAttempts([]);
      });

    getFeedbackTemplatesFn()
      .then((res: any) => {
        console.log("getFeedbackTemplatesFn resolved:", res);
        setFeedbackTemplates(res || []);
      })
      .catch((err) => {
        console.error("Error loading feedback templates:", err);
        setFeedbackTemplates([]);
      });

    getCoursesFn()
      .then((res: any) => {
        console.log("getCoursesFn resolved:", res);
        setCourses(res || []);
      })
      .catch((err) => {
        console.error("Error loading courses in QuestionBank:", err);
        setCourses([]);
      });
  };

  const filteredQuestions = useMemo(() => {
    return questions
      .filter((q) => selectedExamId === "ALL" || q.examId === selectedExamId)
      .filter((q) => filterType === "ALL" || q.qType === filterType)
      .filter((q) => filterDifficulty === "ALL" || q.difficulty === filterDifficulty)
      .filter((q) => filterSectionId === "ALL" || q.sectionId === filterSectionId)
      .filter((q) => {
        if (filterSource === "ALL") return true;
        if (filterSource === "IMPORTED") return q.sectionId !== null;
        return q.sectionId === null;
      })
      .filter((q) => {
        if (filterMinMark !== "" && q.mark < filterMinMark) return false;
        if (filterMaxMark !== "" && q.mark > filterMaxMark) return false;
        return true;
      })
      .filter((q) => {
        if (!filterTag.trim()) return true;
        return (
          q.text.toLowerCase().includes(filterTag.toLowerCase()) ||
          (q.explanation && q.explanation.toLowerCase().includes(filterTag.toLowerCase()))
        );
      })
      .filter((q) => {
        const query = search.toLowerCase();
        return (
          q.text.toLowerCase().includes(query) ||
          (q.explanation && q.explanation.toLowerCase().includes(query)) ||
          (q.options && q.options.some((opt: string) => opt.toLowerCase().includes(query)))
        );
      });
  }, [
    questions,
    selectedExamId,
    filterType,
    filterDifficulty,
    filterSectionId,
    filterSource,
    filterMinMark,
    filterMaxMark,
    filterTag,
    search,
  ]);

  const paginatedQuestions = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredQuestions.slice(start, start + itemsPerPage);
  }, [filteredQuestions, page]);

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage) || 1;

  // Manual Question Add
  const handleOpenAdd = () => {
    if (exams.length === 0) {
      toast.error("يرجى إنشاء اختبار أولاً قبل إضافة الأسئلة.");
      return;
    }
    setFormType("MULTIPLE_CHOICE");
    setFormText("");
    setFormOptions(["", "", "", ""]);
    setFormCorrectAnswer("");
    setFormDifficulty("MEDIUM");
    setFormMark(1);
    setFormExplanation("");
    setFormQuestionSectionId("");
    setIsAddMode(true);
    setActiveQuestion({
      id: "",
      type: "MCQ",
      qType: "MULTIPLE_CHOICE",
      text: "",
      difficulty: "MEDIUM",
      mark: 1,
      explanation: "",
    });
  };

  // Manual Question Edit
  const handleOpenEdit = (q: Question) => {
    const isTF =
      q.qType === "MULTIPLE_CHOICE" &&
      q.options?.length === 2 &&
      q.options.includes("صح") &&
      q.options.includes("خطأ");
    setFormType(isTF ? "TRUE_FALSE" : q.qType);
    setFormText(q.text);
    setFormDifficulty(q.difficulty);
    setFormMark(q.mark);
    setFormExplanation(q.explanation);
    setFormQuestionSectionId(q.sectionId || "");

    if (q.qType === "MULTIPLE_CHOICE") {
      setFormOptions(q.options || ["", "", "", ""]);
      setFormCorrectAnswer(q.correctAnswer || "");
    }

    setIsAddMode(false);
    setActiveQuestion(q);
  };

  // Manual Question Save handler
  const handleSaveQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formText.trim()) {
      toast.error("يرجى إدخال نص السؤال.");
      return;
    }

    const targetExamId = selectedExamId === "ALL" ? exams[0]?.id : selectedExamId;
    if (!targetExamId) {
      toast.error("يرجى اختيار امتحان محدد لإضافة السؤال إليه.");
      return;
    }

    try {
      let choicesList: { text: string; isCorrect: boolean }[] = [];
      let mappedType: "MULTIPLE_CHOICE" | "ESSAY" = "MULTIPLE_CHOICE";

      if (formType === "MULTIPLE_CHOICE") {
        mappedType = "MULTIPLE_CHOICE";
        const cleanOptions = formOptions.map((o) => o.trim()).filter((o) => o !== "");
        if (cleanOptions.length < 2) {
          toast.error("يجب إدخال خيارين على الأقل.");
          return;
        }
        if (!formCorrectAnswer) {
          toast.error("يرجى تحديد الإجابة الصحيحة.");
          return;
        }
        choicesList = cleanOptions.map((opt) => ({
          text: opt,
          isCorrect: opt === formCorrectAnswer,
        }));
      } else if (formType === "TRUE_FALSE") {
        mappedType = "MULTIPLE_CHOICE";
        if (!formCorrectAnswer || (formCorrectAnswer !== "صح" && formCorrectAnswer !== "خطأ")) {
          toast.error("يرجى تحديد الإجابة الصحيحة (صح أو خطأ).");
          return;
        }
        choicesList = [
          { text: "صح", isCorrect: formCorrectAnswer === "صح" },
          { text: "خطأ", isCorrect: formCorrectAnswer === "خطأ" },
        ];
      } else {
        mappedType = "ESSAY";
      }

      if (isAddMode) {
        await createQuestionFn({
          data: {
            examId: targetExamId,
            text: formText,
            type: mappedType,
            difficulty: formDifficulty,
            explanation: formExplanation,
            mark: formMark,
            choices: choicesList,
            imageUrl: formQuestionImageUrl || null,
            pdfUrl: formQuestionPdfUrl || null,
            sectionId: formQuestionSectionId || null,
          },
        });
        toast.success("تمت إضافة السؤال بنجاح!");
      } else {
        await updateQuestionFn({
          data: {
            id: activeQuestion!.id,
            text: formText,
            type: mappedType,
            difficulty: formDifficulty,
            explanation: formExplanation,
            mark: formMark,
            choices: choicesList,
            imageUrl: formQuestionImageUrl || null,
            pdfUrl: formQuestionPdfUrl || null,
            sectionId: formQuestionSectionId || null,
          },
        });
        toast.success("تم تحديث السؤال بنجاح!");
      }

      setActiveQuestion(null);
      loadData();
    } catch (err: any) {
      toast.error("فشل حفظ السؤال: " + err.message);
    }
  };

  // Manual Question Delete
  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا السؤال نهائياً؟")) return;
    try {
      await deleteQuestionFn({ data: { id: qId } });
      toast.success("تم حذف السؤال بنجاح!");
      loadData();
    } catch (err: any) {
      toast.error("خطأ في حذف السؤال: " + err.message);
    }
  };

  // Bulk Operations Handlers
  const handleToggleSelectQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allIds = filteredQuestions.map((q) => q.id);
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      const allSelected = allIds.every((id) => next.has(id));
      if (allSelected) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من رغبتك في حذف ${selectedQuestionIds.size} أسئلة نهائياً؟`)) return;
    try {
      setLoadingQuestions(true);
      const ids = Array.from(selectedQuestionIds);
      for (const id of ids) {
        await deleteQuestionFn({ data: { id } });
      }
      toast.success("تم حذف الأسئلة المحددة بنجاح!");
      setSelectedQuestionIds(new Set());
      loadData();
    } catch (err: any) {
      toast.error("خطأ أثناء الحذف الجماعي: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleBulkChangeDifficulty = async (difficulty: QuestionDifficulty) => {
    if (selectedQuestionIds.size === 0) return;
    try {
      setLoadingQuestions(true);
      const ids = Array.from(selectedQuestionIds);
      for (const id of ids) {
        const original = questions.find((q) => q.id === id);
        if (!original) continue;
        await updateQuestionFn({
          data: {
            id,
            difficulty,
            text: original.text,
            type: original.qType === "ESSAY" ? "ESSAY" : "MULTIPLE_CHOICE",
            explanation: original.explanation || "",
            mark: original.mark,
            choices: original.choices,
            imageUrl: original.imageUrl,
            pdfUrl: original.pdfUrl,
            sectionId: original.sectionId,
          },
        });
      }
      toast.success("تم تحديث صعوبة الأسئلة بنجاح!");
      setSelectedQuestionIds(new Set());
      loadData();
    } catch (err: any) {
      toast.error("خطأ أثناء التعديل الجماعي: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleBulkChangeMark = async (mark: number) => {
    if (selectedQuestionIds.size === 0) return;
    try {
      setLoadingQuestions(true);
      const ids = Array.from(selectedQuestionIds);
      for (const id of ids) {
        const original = questions.find((q) => q.id === id);
        if (!original) continue;
        await updateQuestionFn({
          data: {
            id,
            mark,
            text: original.text,
            type: original.qType === "ESSAY" ? "ESSAY" : "MULTIPLE_CHOICE",
            difficulty: original.difficulty,
            explanation: original.explanation || "",
            choices: original.choices,
            imageUrl: original.imageUrl,
            pdfUrl: original.pdfUrl,
            sectionId: original.sectionId,
          },
        });
      }
      toast.success("تم تحديث درجات الأسئلة بنجاح!");
      setSelectedQuestionIds(new Set());
      loadData();
    } catch (err: any) {
      toast.error("خطأ أثناء التعديل الجماعي: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleBulkMoveSection = async (sectionId: string | null) => {
    if (selectedQuestionIds.size === 0) return;
    try {
      setLoadingQuestions(true);
      const ids = Array.from(selectedQuestionIds);
      for (const id of ids) {
        const original = questions.find((q) => q.id === id);
        if (!original) continue;
        await updateQuestionFn({
          data: {
            id,
            sectionId,
            text: original.text,
            type: original.qType === "ESSAY" ? "ESSAY" : "MULTIPLE_CHOICE",
            difficulty: original.difficulty,
            explanation: original.explanation || "",
            mark: original.mark,
            choices: original.choices,
            imageUrl: original.imageUrl,
            pdfUrl: original.pdfUrl,
          },
        });
      }
      toast.success("تم نقل الأسئلة إلى القسم المختار بنجاح!");
      setSelectedQuestionIds(new Set());
      loadData();
    } catch (err: any) {
      toast.error("خطأ أثناء نقل الأسئلة: " + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Exam Versioning Logic
  const handleFetchVersions = async (examId: string) => {
    try {
      const list = await getExamVersionsFn({ data: { examId } });
      setExamVersions(list || []);
    } catch (e: any) {
      toast.error("فشل تحميل نسخ الاختبار: " + e.message);
    }
  };

  const handleCreateVersion = async (name: string) => {
    if (!activeExam?.id) return;
    if (!name.trim()) {
      toast.error("يرجى إدخال اسم للنسخة.");
      return;
    }
    try {
      toast.loading("جاري إنشاء نسخة احتياطية...");
      await createExamVersionFn({
        data: {
          examId: activeExam.id,
          changeDescription: name.trim(),
        },
      });
      toast.dismiss();
      toast.success("تم إنشاء النسخة بنجاح!");
      handleFetchVersions(activeExam.id);
    } catch (e: any) {
      toast.dismiss();
      toast.error("فشل إنشاء نسخة احتياطية: " + e.message);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!activeExam?.id) return;
    if (!confirm("هل أنت متأكد من استعادة هذه النسخة؟ سيتم استبدال الأسئلة والإعدادات الحالية بالنسخة المحددة.")) return;
    try {
      toast.loading("جاري استعادة النسخة...");
      await restoreExamVersionFn({
        data: {
          versionId: versionId,
        },
      });
      toast.dismiss();
      toast.success("تم استعادة النسخة بنجاح!");
      loadData();
      setActiveExam(null); // Close builder to force refresh
    } catch (e: any) {
      toast.dismiss();
      toast.error("فشل استعادة النسخة: " + e.message);
    }
  };

  // Undo / Redo Command History
  const pushToHistory = (command: any) => {
    setHistoryStack((prev) => [...prev, command]);
    setRedoStack([]); // Clear redo stack on new action
  };

  const handleUndo = async () => {
    if (historyStack.length === 0) return;
    const command = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, command]);

    try {
      toast.loading("جاري التراجع عن آخر إجراء...");
      if (command.type === "ADD") {
        await deleteQuestionFn({ data: { id: command.question.id } });
      } else if (command.type === "DELETE") {
        await createQuestionFn({
          data: {
            examId: activeExam.id,
            text: command.question.text,
            type: command.question.type,
            difficulty: command.question.difficulty,
            explanation: command.question.explanation,
            mark: command.question.mark,
            choices: command.question.choices,
            imageUrl: command.question.imageUrl,
            pdfUrl: command.question.pdfUrl,
            sectionId: command.question.sectionId,
          },
        });
      } else if (command.type === "EDIT") {
        await updateQuestionFn({
          data: {
            id: command.previous.id,
            text: command.previous.text,
            type: command.previous.type,
            difficulty: command.previous.difficulty,
            explanation: command.previous.explanation,
            mark: command.previous.mark,
            choices: command.previous.choices,
            imageUrl: command.previous.imageUrl,
            pdfUrl: command.previous.pdfUrl,
            sectionId: command.previous.sectionId,
          },
        });
      } else if (command.type === "REORDER") {
        for (const item of command.previousOrders) {
          await updateQuestionFn({ data: { id: item.id, order: item.order } });
        }
      }
      toast.dismiss();
      toast.success("تم التراجع بنجاح!");
      loadData();
    } catch (err: any) {
      toast.dismiss();
      toast.error("فشل التراجع: " + err.message);
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const command = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setHistoryStack((prev) => [...prev, command]);

    try {
      toast.loading("جاري إعادة الإجراء الملغي...");
      if (command.type === "ADD") {
        await createQuestionFn({
          data: {
            examId: activeExam.id,
            text: command.question.text,
            type: command.question.type,
            difficulty: command.question.difficulty,
            explanation: command.question.explanation,
            mark: command.question.mark,
            choices: command.question.choices,
            imageUrl: command.question.imageUrl,
            pdfUrl: command.question.pdfUrl,
            sectionId: command.question.sectionId,
          },
        });
      } else if (command.type === "DELETE") {
        await deleteQuestionFn({ data: { id: command.question.id } });
      } else if (command.type === "EDIT") {
        await updateQuestionFn({
          data: {
            id: command.current.id,
            text: command.current.text,
            type: command.current.type,
            difficulty: command.current.difficulty,
            explanation: command.current.explanation,
            mark: command.current.mark,
            choices: command.current.choices,
            imageUrl: command.current.imageUrl,
            pdfUrl: command.current.pdfUrl,
            sectionId: command.current.sectionId,
          },
        });
      } else if (command.type === "REORDER") {
        for (const item of command.newOrders) {
          await updateQuestionFn({ data: { id: item.id, order: item.order } });
        }
      }
      toast.dismiss();
      toast.success("تمت الإعادة بنجاح!");
      loadData();
    } catch (err: any) {
      toast.dismiss();
      toast.error("فشل الإعادة: " + err.message);
    }
  };

  const validateExamQuestions = useMemo(() => {
    const warnings: Record<string, string[]> = {};
    if (!activeExam?.id) return warnings;
    const currentExam = exams.find((e) => e.id === activeExam.id);
    const examQuestions = currentExam?.questions || [];

    examQuestions.forEach((q: any) => {
      const qWarnings: string[] = [];
      if (!(q.questionText || q.text || "").trim()) {
        qWarnings.push("نص السؤال فارغ.");
      }
      if (q.qType === "MULTIPLE_CHOICE" || q.type === "MULTIPLE_CHOICE") {
        if (!q.choices || q.choices.length < 2) {
          qWarnings.push("أسئلة الاختيار من متعدد تتطلب خيارين على الأقل.");
        } else {
          const hasCorrect = q.choices.some((c: any) => c.isCorrect);
          if (!hasCorrect) {
            qWarnings.push("لم يتم تحديد إجابة صحيحة.");
          }
          const hasEmpty = q.choices.some((c: any) => !(c.text || "").trim());
          if (hasEmpty) {
            qWarnings.push("يوجد خيار واحد أو أكثر فارغ.");
          }
        }
      }
      if (qWarnings.length > 0) {
        warnings[q.id] = qWarnings;
      }
    });

    return warnings;
  }, [exams, activeExam]);

  // Exam Add Modal Open
  const handleOpenAddExam = () => {
    if (courses.length === 0) {
      toast.error("يرجى إنشاء دورة تعليمية واحدة على الأقل أولاً.");
      return;
    }
    setFormExamTitle("");
    setFormExamDescription("");
    setFormExamCourseId(courses[0]?.id || "");
    setFormExamDurationLimit(30);
    setFormExamPassScore(50);
    setFormExamMaxAttempts(2);
    setFormExamPublished(false);
    setFormExamShuffleQuestions(false);
    setFormExamShowResults(true);
    setFormExamShuffleChoices(false);
    setFormExamUseRandomSubset(false);
    setFormExamSubsetQuestionCount(0);
    setAutoSaveStatus("IDLE");
    setTitleTouched(false);
    setExamBuilderTab("manual");
    setIsAddExamMode(true);
    setActiveExam({ id: "" });
  };

  // Exam Edit Modal Open
  const handleOpenEditExam = (ex: any) => {
    setFormExamTitle(ex.title);
    setFormExamDescription(ex.description || "");
    setFormExamCourseId(ex.courseId);
    setFormExamDurationLimit(ex.durationLimit || 0);
    setFormExamPassScore(Number(ex.passScore) || 50);
    setFormExamMaxAttempts(ex.maxAttempts || 1);
    setFormExamPublished(ex.published || false);
    setFormExamShuffleQuestions(ex.shuffleQuestions || false);
    setFormExamShowResults(ex.showResults !== false);
    setFormExamShuffleChoices(ex.shuffleChoices || false);
    setFormExamUseRandomSubset(ex.useRandomSubset || false);
    setFormExamSubsetQuestionCount(ex.subsetQuestionCount || 0);
    setAutoSaveStatus("IDLE");
    setTitleTouched(false);
    setExamBuilderTab("manual");

    // Clear question sub-form state
    setFormType("MULTIPLE_CHOICE");
    setFormText("");
    setFormOptions(["", "", "", ""]);
    setFormCorrectAnswer("");
    setFormDifficulty("MEDIUM");
    setFormMark(1);
    setFormExplanation("");
    setFormQuestionImageUrl("");
    setFormQuestionPdfUrl("");
    setFormQuestionSectionId("");
    setIsAddMode(true);

    setIsAddExamMode(false);
    setActiveExam(ex);
  };

  // Helper to parse stringified Zod errors returned from TanStack Start
  const parseZodError = (err: any): string => {
    if (!err) return "حدث خطأ غير معروف";
    const msg = err.message || String(err);
    try {
      if (msg.includes("[") && msg.includes("]")) {
        const startIdx = msg.indexOf("[");
        const endIdx = msg.lastIndexOf("]") + 1;
        const jsonStr = msg.substring(startIdx, endIdx);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].message || "خطأ في التحقق من البيانات";
        }
      }
    } catch (e) {
      // fallback
    }
    return msg.replace("ERR_INTERNAL_SERVER_ERROR:", "").trim();
  };

  // Exam Save handler
  const handleSaveExam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTitle = formExamTitle.trim();
    setFormExamTitle(trimmedTitle);

    if (!trimmedTitle) {
      toast.error("يرجى إدخال اسم الاختبار");
      setTitleTouched(true);
      return;
    }
    if (trimmedTitle.length < 2) {
      toast.error("يجب أن يحتوي اسم الاختبار على حرفين على الأقل");
      setTitleTouched(true);
      return;
    }

    try {
      if (isAddExamMode) {
        const newExam = await createExamFn({
          data: {
            courseId: formExamCourseId,
            title: trimmedTitle,
            durationLimit: Number(formExamDurationLimit),
            passScore: Number(formExamPassScore),
            maxAttempts: Number(formExamMaxAttempts),
            description: formExamDescription,
            published: false, // Force draft-only from Question Bank
            shuffleQuestions: formExamShuffleQuestions,
            shuffleChoices: formExamShuffleChoices,
            useRandomSubset: formExamUseRandomSubset,
            subsetQuestionCount: Number(formExamSubsetQuestionCount),
            showResults: formExamShowResults,
          },
        });
        toast.success("تم إنشاء الاختبار بنجاح!");
        setIsAddExamMode(false);
        setActiveExam(newExam);
      } else {
        const updated = await updateExamFn({
          data: {
            id: activeExam.id,
            title: trimmedTitle,
            durationLimit: Number(formExamDurationLimit),
            passScore: Number(formExamPassScore),
            maxAttempts: Number(formExamMaxAttempts),
            description: formExamDescription,
            published: false, // Force draft-only from Question Bank
            isPublished: false,
            shuffleQuestions: formExamShuffleQuestions,
            shuffleChoices: formExamShuffleChoices,
            useRandomSubset: formExamUseRandomSubset,
            subsetQuestionCount: Number(formExamSubsetQuestionCount),
            showResults: formExamShowResults,
          },
        });
        toast.success("تم تحديث بيانات الاختبار بنجاح!");
        setActiveExam(updated);
      }

      loadData();
    } catch (err: any) {
      toast.error(parseZodError(err));
    }
  };

  // Auto-Save effect for Exam Settings
  useEffect(() => {
    if (!activeExam || isAddExamMode || !activeExam.id) return;

    const hasChanged =
      formExamTitle !== activeExam.title ||
      formExamDescription !== (activeExam.description || "") ||
      formExamDurationLimit !== (activeExam.durationLimit || 0) ||
      formExamPassScore !== (Number(activeExam.passScore) || 50) ||
      formExamMaxAttempts !== (activeExam.maxAttempts || 1) ||
      formExamShuffleQuestions !== (activeExam.shuffleQuestions || false) ||
      formExamShuffleChoices !== (activeExam.shuffleChoices || false) ||
      formExamUseRandomSubset !== (activeExam.useRandomSubset || false) ||
      formExamSubsetQuestionCount !== (activeExam.subsetQuestionCount || 0) ||
      formExamShowResults !== (activeExam.showResults !== false);

    if (!hasChanged || formExamTitle.trim().length < 2) return;

    setAutoSaveStatus("SAVING");
    const timer = setTimeout(async () => {
      try {
        const updated = await updateExamFn({
          data: {
            id: activeExam.id,
            title: formExamTitle.trim(),
            description: formExamDescription,
            durationLimit: Number(formExamDurationLimit),
            passScore: Number(formExamPassScore),
            maxAttempts: Number(formExamMaxAttempts),
            shuffleQuestions: formExamShuffleQuestions,
            shuffleChoices: formExamShuffleChoices,
            useRandomSubset: formExamUseRandomSubset,
            subsetQuestionCount: Number(formExamSubsetQuestionCount),
            showResults: formExamShowResults,
            published: false,
            isPublished: false,
          },
        });
        setExams((prev) => prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)));
        setActiveExam(updated);
        setAutoSaveStatus("SAVED");
        setTimeout(() => setAutoSaveStatus("IDLE"), 2000);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setAutoSaveStatus("IDLE");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    formExamTitle,
    formExamDescription,
    formExamDurationLimit,
    formExamPassScore,
    formExamMaxAttempts,
    formExamShuffleQuestions,
    formExamShuffleChoices,
    formExamUseRandomSubset,
    formExamSubsetQuestionCount,
    formExamShowResults,
  ]);

  // Section CRUD logic
  const handleAddSection = async (sectionName: string) => {
    if (!sectionName.trim() || !activeExam?.id) return;
    try {
      toast.loading("جاري إضافة القسم...");
      await createExamSectionFn({
        data: {
          examId: activeExam.id,
          name: sectionName.trim(),
        },
      });
      toast.dismiss();
      toast.success("تم إضافة القسم بنجاح!");
      loadData();
    } catch (err: any) {
      toast.dismiss();
      toast.error("فشل إضافة القسم: " + err.message);
    }
  };

  const handleUpdateSectionName = async (sectionId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateExamSectionFn({
        data: {
          id: sectionId,
          name: newName.trim(),
        },
      });
      loadData();
    } catch (err: any) {
      toast.error("فشل تحديث اسم القسم: " + err.message);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القسم؟ لن تُحذف الأسئلة داخله، بل ستصبح غير مصنفة.")) return;
    try {
      await deleteExamSectionFn({
        data: {
          id: sectionId,
        },
      });
      toast.success("تم حذف القسم بنجاح!");
      loadData();
    } catch (err: any) {
      toast.error("فشل حذف القسم: " + err.message);
    }
  };

  const handleMoveSection = async (sectionId: string, direction: "up" | "down", sections: any[]) => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const currentSec = sections[idx];
    const targetSec = sections[targetIdx];

    try {
      await updateExamSectionFn({
        data: { id: currentSec.id, order: targetSec.order },
      });
      await updateExamSectionFn({
        data: { id: targetSec.id, order: currentSec.order },
      });
      toast.success("تم تغيير ترتيب القسم!");
      loadData();
    } catch (e: any) {
      toast.error("فشل تعديل ترتيب الأقسام.");
    }
  };

  // Reusable question pool logic
  const libraryQuestions = useMemo(() => {
    if (!activeExam) return [];
    const questionsList: any[] = [];
    exams.forEach((ex) => {
      if (ex.id !== activeExam.id && ex.questions) {
        ex.questions.forEach((q: any) => {
          questionsList.push({
            ...q,
            examTitle: ex.title,
            courseTitle: ex.course?.title,
          });
        });
      }
    });
    return questionsList;
  }, [exams, activeExam]);

  const filteredLibraryQuestions = useMemo(() => {
    const query = librarySearchQuery.toLowerCase();
    if (!query) return libraryQuestions;
    return libraryQuestions.filter((q) =>
      (q.questionText || q.text || "").toLowerCase().includes(query)
    );
  }, [libraryQuestions, librarySearchQuery]);

  const handleImportFromLibrary = async () => {
    if (librarySelectedQuestions.length === 0) return;
    try {
      toast.loading(`جاري استيراد ${librarySelectedQuestions.length} سؤال...`);
      for (const qId of librarySelectedQuestions) {
        const targetQ = libraryQuestions.find((q) => q.id === qId);
        if (targetQ) {
          await createQuestionFn({
            data: {
              examId: activeExam.id,
              text: targetQ.questionText || targetQ.text,
              type: targetQ.type || targetQ.qType || "MULTIPLE_CHOICE",
              difficulty: targetQ.difficulty || "MEDIUM",
              explanation: targetQ.explanation || "",
              mark: targetQ.mark || targetQ.points || 1,
              choices: targetQ.choices?.map((c: any) => ({
                text: c.text,
                isCorrect: c.isCorrect,
              })) || [],
              imageUrl: targetQ.imageUrl || null,
              pdfUrl: targetQ.pdfUrl || null,
              sectionId: formQuestionSectionId || null,
            },
          });
        }
      }
      toast.dismiss();
      toast.success("تم استيراد الأسئلة بنجاح!");
      setIsImportLibraryOpen(false);
      setLibrarySelectedQuestions([]);
      loadData();
    } catch (err: any) {
      toast.dismiss();
      toast.error("فشل استيراد الأسئلة: " + err.message);
    }
  };

  // Student exam simulator logic
  const handleStartSimulator = (ex: any) => {
    let preparedQs = [...(ex.questions || [])];

    if (ex.shuffleQuestions) {
      preparedQs.sort(() => Math.random() - 0.5);
    }

    if (ex.useRandomSubset && ex.subsetQuestionCount > 0 && ex.subsetQuestionCount < preparedQs.length) {
      preparedQs = preparedQs.slice(0, ex.subsetQuestionCount);
    }

    preparedQs = preparedQs.map((q) => {
      if (q.choices && q.choices.length > 0 && ex.shuffleChoices) {
        return {
          ...q,
          choices: [...q.choices].sort(() => Math.random() - 0.5),
        };
      }
      return q;
    });

    setSimQuestions(preparedQs);
    setSimulateExamDetails(ex);
    setSimAnswers({});
    setSimTimeRemaining(ex.durationLimit > 0 ? ex.durationLimit * 60 : 0);
    setSimStarted(false);
    setSimSubmitted(false);
    setActiveSimIdx(0);
  };

  const handleSimSubmit = () => {
    setSimSubmitted(true);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (num: number) => String(num).padStart(2, "0");
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  useEffect(() => {
    if (!simulateExamDetails || !simStarted || simSubmitted) return;
    
    const interval = setInterval(() => {
      setSimTimeRemaining((prev) => {
        if (simulateExamDetails.durationLimit > 0) {
          if (prev <= 1) {
            clearInterval(interval);
            handleSimSubmit();
            return 0;
          }
          return prev - 1;
        } else {
          return prev + 1;
        }
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [simulateExamDetails, simStarted, simSubmitted]);

  // Exam Actions: Duplicate, Publish, Delete
  const handleDuplicateExam = async (examId: string) => {
    try {
      await duplicateExamFn({ data: { id: examId } });
      toast.success("تم تكرار الاختبار بنجاح!");
      loadData();
    } catch (err: any) {
      toast.error("فشل تكرار الاختبار: " + err.message);
    }
  };

  const handlePublishExam = async (examId: string) => {
    try {
      await publishExamFn({ data: { id: examId } });
      toast.success("تم نشر الاختبار بنجاح!");
      loadData();
    } catch (err: any) {
      toast.error("فشل نشر الاختبار: " + err.message);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار وجميع الأسئلة المرتبطة به؟")) return;
    try {
      await deleteExamFn({ data: { id: examId } });
      toast.success("تم حذف الاختبار بنجاح!");
      loadData();
    } catch (err: any) {
      toast.error("خطأ في حذف الاختبار: " + err.message);
    }
  };

  const handleSelectAttempt = async (att: any) => {
    setSelectedAttempt(att);
    setSelectedAttemptDetails(null);
    setLoadingAttemptDetails(true);
    try {
      const details = await getExamCorrectionDetailsFn({ data: { attemptId: att.id } });
      setSelectedAttemptDetails(details);
      
      const newInputs = { ...gradeInputs };
      details.essayAnswers?.forEach((ans: any) => {
        newInputs[ans.id] = {
          grade: ans.teacherGrade !== null ? Number(ans.teacherGrade) : 0,
          feedback: ans.teacherFeedback || "",
        };
      });
      setGradeInputs(newInputs);
    } catch (err: any) {
      toast.error("فشل تحميل تفاصيل إجابات الطالب: " + err.message);
    } finally {
      setLoadingAttemptDetails(false);
    }
  };

  // Essay Grading Handler
  const handleGradeEssay = async (essayAnswerId: string, maxMark: number) => {
    const inputs = gradeInputs[essayAnswerId];
    if (!inputs || inputs.grade === undefined) {
      toast.error("يرجى إدخال الدرجة أولاً.");
      return;
    }

    if (inputs.grade < 0 || inputs.grade > maxMark) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${maxMark}.`);
      return;
    }

    try {
      await gradeEssayAnswerFn({
        data: {
          essayAnswerId,
          grade: Number(inputs.grade),
          feedback: inputs.feedback || "",
        },
      });
      toast.success("تم رصد وتصحيح الإجابة بنجاح!");
      loadData();
      if (selectedAttempt) {
        handleSelectAttempt(selectedAttempt);
      }
    } catch (err: any) {
      toast.error("فشل حفظ التقييم: " + err.message);
    }
  };

  const handlePublishAttempt = async (attemptId: string) => {
    try {
      await publishExamAttemptResultFn({ data: { attemptId } });
      toast.success("تم نشر نتيجة هذا الطالب بنجاح!");
      loadData();
      if (selectedAttempt) {
        handleSelectAttempt(selectedAttempt);
      }
    } catch (err: any) {
      toast.error("فشل نشر النتيجة: " + err.message);
    }
  };

  const handleUnpublishAttempt = async (attemptId: string) => {
    try {
      await unpublishExamAttemptResultFn({ data: { attemptId } });
      toast.success("تم سحب وإعادة فتح تصحيح الامتحان بنجاح.");
      loadData();
      if (selectedAttempt) {
        handleSelectAttempt(selectedAttempt);
      }
    } catch (err: any) {
      toast.error("فشل إلغاء النشر: " + err.message);
    }
  };

  const handleCreateFeedbackTemplate = async () => {
    if (!newTemplateText.trim()) return;
    try {
      await createFeedbackTemplateFn({ data: { text: newTemplateText } });
      toast.success("تمت إضافة قالب التعليق الجديد.");
      setNewTemplateText("");
      const res = await getFeedbackTemplatesFn();
      setFeedbackTemplates(res || []);
    } catch (err: any) {
      toast.error("فشل إضافة القالب: " + err.message);
    }
  };

  const handleDeleteFeedbackTemplate = async (id: string) => {
    try {
      await deleteFeedbackTemplateFn({ data: { id } });
      toast.success("تم حذف القالب.");
      setFeedbackTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      toast.error("فشل حذف القالب: " + err.message);
    }
  };

  // Excel Templates & Exports
  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadExamTemplateFn();
      const binaryString = window.atob(res.fileBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "قالب_استيراد_الأسئلة.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("تم تحميل قالب Excel بنجاح!");
    } catch (err: any) {
      toast.error("فشل تحميل قالب Excel: " + err.message);
    }
  };

  const handleExportExam = async () => {
    const targetExamId = selectedExamId === "ALL" ? null : selectedExamId;
    if (!targetExamId) {
      toast.error("يرجى اختيار امتحان محدد من قائمة التصفية أولاً لتصديره.");
      return;
    }

    try {
      const res = await exportExamToExcelFn({ data: { examId: targetExamId } });
      const binaryString = window.atob(res.fileBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const examTitle = exams.find((e) => e.id === targetExamId)?.title || "Exam";
      link.download = `أسئلة_${examTitle}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("تم تصدير الامتحان إلى Excel بنجاح!");
    } catch (err: any) {
      toast.error("فشل تصدير الامتحان: " + err.message);
    }
  };

  // Excel Parse client side & Open Preview
  const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (exams.length === 0) {
      toast.error("يرجى إنشاء امتحان أولاً قبل استيراد الأسئلة.");
      return;
    }

    const targetExamId = selectedExamId === "ALL" ? exams[0]?.id : selectedExamId;
    if (!targetExamId) {
      toast.error("يرجى اختيار امتحان محدد لاستيراد الأسئلة إليه.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const mappedRows = rows.map((r, index) => {
          const rawType = r["Type"] || r["النوع"] || "MULTIPLE_CHOICE";
          let cleanType = "MULTIPLE_CHOICE";
          const lower = rawType.toString().toLowerCase().trim();
          if (lower === "essay" || lower === "مقال") {
            cleanType = "ESSAY";
          } else if (lower === "true_false" || lower === "صح_خطأ") {
            cleanType = "TRUE_FALSE";
          }

          return {
            id: String(index),
            question: r["Question"] || r["السؤال"] || "",
            type: cleanType,
            choiceA: r["Choice A"] || r["الخيار أ"] || "",
            choiceB: r["Choice B"] || r["الخيار ب"] || "",
            choiceC: r["Choice C"] || r["الخيار ج"] || "",
            choiceD: r["Choice D"] || r["الخيار د"] || "",
            correctAnswer: r["Correct Answer"] || r["الإجابة الصحيحة"] || "",
            difficulty: r["Difficulty"] || r["الصعوبة"] || "MEDIUM",
            explanation: r["Explanation"] || r["الشرح"] || "",
          };
        });

        setExcelPreviewRows(mappedRows);
        validateExcelRows(mappedRows);
        setExcelPreviewOpen(true);
      } catch (err: any) {
        toast.error("فشل قراءة ملف Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const validateExcelRows = (rows: any[]) => {
    const errors: string[] = [];
    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      if (!r.question.toString().trim()) {
        errors.push(`السطر ${rowNum}: نص السؤال مفقود.`);
      }
      if (r.type === "MULTIPLE_CHOICE") {
        if (!r.choiceA.toString().trim() || !r.choiceB.toString().trim()) {
          errors.push(`السطر ${rowNum}: الخيارات A و B مطلوبة لأسئلة الاختيار من متعدد.`);
        }
        const ans = r.correctAnswer.toString().toUpperCase().trim();
        if (!["A", "B", "C", "D"].includes(ans) && !ans) {
          errors.push(`السطر ${rowNum}: الإجابة الصحيحة يجب أن تكون A أو B أو C أو D.`);
        }
      } else if (r.type === "TRUE_FALSE") {
        const ans = r.correctAnswer.toString().trim().toUpperCase();
        const validTF = ["A", "B", "صح", "خطأ", "TRUE", "FALSE"].includes(ans);
        if (!validTF) {
          errors.push(
            `السطر ${rowNum}: الإجابة الصحيحة لأسئلة صح/خطأ يجب أن تكون A (صح) أو B (خطأ).`,
          );
        }
      }
    });
    setExcelValidationErrors(errors);
  };

  const handleCellEdit = (index: number, field: string, value: string) => {
    const updated = [...excelPreviewRows];
    updated[index] = { ...updated[index], [field]: value };
    setExcelPreviewRows(updated);
    validateExcelRows(updated);
  };

  const handleSaveExcelImport = async () => {
    if (excelValidationErrors.length > 0) {
      toast.error("يرجى تصحيح أخطاء التحقق أولاً قبل الحفظ.");
      return;
    }

    try {
      const targetExamId = selectedExamId === "ALL" ? exams[0]?.id : selectedExamId;
      const exportData = excelPreviewRows.map((r) => ({
        Question: r.question,
        Type: r.type,
        "Choice A": r.choiceA,
        "Choice B": r.choiceB,
        "Choice C": r.choiceC,
        "Choice D": r.choiceD,
        "Correct Answer": r.correctAnswer,
        Difficulty: r.difficulty,
        Explanation: r.explanation,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Questions");
      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });

      const binary = new Uint8Array(wbout);
      let binaryString = "";
      for (let i = 0; i < binary.length; i++) {
        binaryString += String.fromCharCode(binary[i]);
      }
      const base64 = window.btoa(binaryString);

      await importExamFromExcelFn({
        data: {
          examId: targetExamId,
          fileBase64: base64,
        },
      });

      toast.success("تم استيراد وحفظ جميع الأسئلة بنجاح!");
      setExcelPreviewOpen(false);
      loadData();
    } catch (err: any) {
      toast.error("فشل حفظ الأسئلة المستوردة: " + err.message);
    }
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* Page Title & Add Exam */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-foreground">بنك الأسئلة والتقييمات</h2>
          <span className="text-xs text-muted-foreground">
            إنشاء وإدارة بنك الاختبارات والأسئلة التعليمية
          </span>
        </div>
        <button
          onClick={handleOpenAddExam}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 hover:from-primary/95 hover:via-indigo-600/95 hover:to-indigo-700/95 text-white h-14 px-7 text-base font-extrabold shadow-[0_8px_30px_rgb(99,102,241,0.3)] hover:shadow-[0_8px_30px_rgb(99,102,241,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          <Plus className="size-5" />
          <span>إضافة اختبار جديد</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex justify-start border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("questions")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === "questions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          إدارة الأسئلة ({filteredQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab("exams")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === "exams"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          إدارة الاختبارات ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab("grading")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
            activeTab === "grading"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          }`}
        >
          تصحيح الإجابات المقالية ({pendingAttempts.length})
        </button>
      </div>

      {activeTab === "questions" && (
        <div className="space-y-6">
          {/* Top tools bar */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:flex-row">
            {/* Actions left */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
              >
                <FileSpreadsheet className="size-4 text-emerald-500" /> تحميل قالب Excel
              </button>

              <label className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all cursor-pointer">
                <FileSpreadsheet className="size-4 text-primary" /> استيراد الأسئلة من Excel
                <input type="file" accept=".xlsx" onChange={handleImportXLSX} className="hidden" />
              </label>

              <button
                onClick={handleExportExam}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
              >
                <FileSpreadsheet className="size-4 text-amber-500" /> تصدير الامتحان لـ Excel
              </button>

              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow hover:opacity-95 transition-all"
              >
                <Plus className="size-4" /> إضافة سؤال
              </button>
            </div>

            {/* Filters right */}
            <div className="flex w-full flex-1 items-center justify-end gap-3 lg:w-auto">
              <select
                value={selectedExamId}
                onChange={(e) => {
                  setSelectedExamId(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
              >
                <option value="ALL">جميع الاختبارات</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title}
                  </option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
              >
                <option value="ALL">جميع الأنواع</option>
                <option value="MULTIPLE_CHOICE">اختيار من متعدد (MCQ)</option>
                <option value="ESSAY">سؤال مقالي</option>
              </select>

              <input
                type="search"
                placeholder="البحث في الأسئلة..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
              />
            </div>
          </div>

          {/* Questions Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            {loadingQuestions ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                جارٍ تحميل الأسئلة من بنك البيانات…
              </div>
            ) : (
              <table className="w-full border-collapse text-end text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                    <th className="px-5 py-4">الخيارات</th>
                    <th className="px-5 py-4">الدرجة</th>
                    <th className="px-5 py-4">درجة الصعوبة</th>
                    <th className="px-5 py-4">السؤال</th>
                    <th className="px-5 py-4">النوع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedQuestions.map((q) => (
                    <tr key={q.id} className="transition-colors hover:bg-secondary/20">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(q)}
                            className="rounded-lg p-1.5 text-primary hover:bg-secondary"
                            title="تعديل"
                          >
                            <Edit className="size-4" />
                          </button>
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                            title="معاينة"
                          >
                            <Eye className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                            title="حذف"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-primary">{q.mark} درجات</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${DIFFICULTY_COLORS[q.difficulty]}`}
                        >
                          {DIFFICULTY_LABELS[q.difficulty]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground max-w-sm truncate">
                        {q.text}
                      </td>
                      <td className="px-5 py-3">
                        {q.qType === "MULTIPLE_CHOICE" ? "اختيار من متعدد" : "سؤال مقالي"}
                      </td>
                    </tr>
                  ))}
                  {paginatedQuestions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        لا توجد أسئلة مضافة حالياً في هذا الاختيار.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={page === totalPages}
                onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                صفحة {page} من {totalPages}
              </span>
              <button
                disabled={page === 1}
                onClick={() => setPage((v) => Math.max(v - 1, 1))}
                className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "exams" && (
        <div className="space-y-6">
          {/* Exams Table */}
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full border-collapse text-end text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
                  <th className="px-5 py-4">الخيارات</th>
                  <th className="px-5 py-4">الحالة</th>
                  <th className="px-5 py-4">عدد المحاولات</th>
                  <th className="px-5 py-4">المدة الزمنية</th>
                  <th className="px-5 py-4">عدد الأسئلة</th>
                  <th className="px-5 py-4">الدورة التعليمية</th>
                  <th className="px-5 py-4">عنوان الاختبار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exams.map((ex) => (
                  <tr key={ex.id} className="transition-colors hover:bg-secondary/20">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 justify-start">
                        <button
                          onClick={() => handleStartSimulator(ex)}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="محاكاة تجربة الطالب"
                        >
                          <Play className="size-4" />
                        </button>
                        <button
                          onClick={() => setPreviewExamDetails(ex)}
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="معاينة نموذج الإجابة والدرجات"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateExam(ex.id)}
                          className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 transition-colors"
                          title="تكرار الاختبار كنسخة"
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditExam(ex)}
                          className="rounded-lg p-1.5 text-primary hover:bg-indigo-50 transition-colors"
                          title="منشئ الاختبارات"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(ex.id)}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                          title="حذف الاختبار"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                          ex.published
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}
                      >
                        {ex.published ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold">{ex.maxAttempts} محاولات</td>
                    <td className="px-5 py-3 font-semibold">
                      {ex.durationLimit || "لا يوجد حد"} دقيقة
                    </td>
                    <td className="px-5 py-3 font-semibold text-primary">
                      {ex.questions?.length || 0} أسئلة
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{ex.course?.title}</td>
                    <td className="px-5 py-3 font-bold text-foreground">{ex.title}</td>
                  </tr>
                ))}
                {exams.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      لا توجد اختبارات مضافة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Memoized states for grading */}
      {(() => {
        // We define helper calculations inside an IIFE to place them at render-time
        const gradingCounters = {
          unreviewed: allAttempts.filter(att => att.isPendingManualReview && (att.essayAnswers || []).every((ans: any) => ans.teacherGrade === null)).length,
          under_review: allAttempts.filter(att => att.isPendingManualReview && (att.essayAnswers || []).some((ans: any) => ans.teacherGrade !== null)).length,
          published: allAttempts.filter(att => att.isPublished).length,
          edited_post_publish: allAttempts.filter(att => att.isPublished && att.essayReviewLogs && att.essayReviewLogs.length > 0).length
        };

        const filteredAttemptsForGrading = allAttempts.filter((att) => {
          if (gradingFilter === "published") return att.isPublished;
          if (gradingFilter === "edited_post_publish") return att.isPublished && att.essayReviewLogs && att.essayReviewLogs.length > 0;
          if (gradingFilter === "unreviewed") return att.isPendingManualReview && (att.essayAnswers || []).every((ans: any) => ans.teacherGrade === null);
          if (gradingFilter === "under_review") return att.isPendingManualReview && (att.essayAnswers || []).some((ans: any) => ans.teacherGrade !== null);
          return false;
        });

        // Calculate selected attempt metrics
        let metrics: any = null;
        if (selectedAttemptDetails) {
          const exam = selectedAttemptDetails.exam;
          const questions = exam?.questions || [];
          const attemptAnswers = selectedAttemptDetails.attemptAnswers || [];
          const essayAnswers = selectedAttemptDetails.essayAnswers || [];

          let totalMcqPossible = 0;
          let totalMcqEarned = 0;
          let totalEssayPossible = 0;
          let totalEssayEarned = 0;

          questions.forEach((q: any) => {
            const qType = q.qType || "MULTIPLE_CHOICE";
            const qMark = q.mark || q.points || 1;

            if (qType === "MULTIPLE_CHOICE" || q.type === "MCQ" || q.type === "TRUE_FALSE") {
              totalMcqPossible += qMark;
              const ans = attemptAnswers.find((a: any) => a.questionId === q.id);
              if (ans?.selectedChoiceId) {
                const choice = q.choices?.find((c: any) => c.id === ans.selectedChoiceId);
                if (choice?.isCorrect) {
                  totalMcqEarned += qMark;
                }
              }
            } else {
              totalEssayPossible += qMark;
              const ans = essayAnswers.find((a: any) => a.questionId === q.id);
              if (ans && ans.teacherGrade !== null) {
                totalEssayEarned += Number(ans.teacherGrade);
              }
            }
          });

          const totalPossible = totalMcqPossible + totalEssayPossible;
          const totalEarned = totalMcqEarned + totalEssayEarned;
          const finalPercentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 100;
          const passed = finalPercentage >= (exam?.passScore ? Number(exam.passScore) : 60);

          metrics = {
            totalMcqPossible,
            totalMcqEarned,
            totalEssayPossible,
            totalEssayEarned,
            totalPossible,
            totalEarned,
            finalPercentage,
            passed,
          };
        }

        return activeTab === "grading" && (
          <div className="space-y-6 text-right" dir="rtl">
            {/* Dashboard Header */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  لوحة تصحيح ورصد درجات الامتحانات المقالية
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  صنف إجابات الطلاب وقم بتصحيحها يدويًا أو أضف تعليقات ونماذج إجابة.
                </p>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-border pb-2">
              {[
                { id: "unreviewed", label: "غير مصحح", count: gradingCounters.unreviewed, color: "text-red-500 bg-red-500/10" },
                { id: "under_review", label: "قيد المراجعة", count: gradingCounters.under_review, color: "text-amber-500 bg-amber-500/10" },
                { id: "published", label: "تم نشره", count: gradingCounters.published, color: "text-emerald-500 bg-emerald-500/10" },
                { id: "edited_post_publish", label: "تم التعديل بعد النشر", count: gradingCounters.edited_post_publish, color: "text-purple-500 bg-purple-500/10" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setGradingFilter(tab.id as any);
                    setSelectedAttempt(null);
                    setSelectedAttemptDetails(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border cursor-pointer ${
                    gradingFilter === tab.id
                      ? "bg-primary border-primary text-primary-foreground shadow"
                      : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${gradingFilter === tab.id ? "bg-primary-foreground/20 text-primary-foreground" : tab.color}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid gap-6 md:grid-cols-[1fr_420px]">
              {/* List of attempts */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
                <h4 className="font-display text-base font-bold text-foreground">
                  المحاولات المستهدفة ({filteredAttemptsForGrading.length})
                </h4>
                
                {filteredAttemptsForGrading.length > 0 ? (
                  <div className="space-y-3">
                    {filteredAttemptsForGrading.map((att: any) => (
                      <div
                        key={att.id}
                        className={`rounded-xl border p-4 space-y-3 cursor-pointer transition-all hover:bg-secondary/20 ${
                          selectedAttempt?.id === att.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        }`}
                        onClick={() => handleSelectAttempt(att)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(att.created_at).toLocaleString("ar-EG")}
                          </span>
                          <span className="font-bold text-sm text-foreground">
                            {att.student?.profile?.name || att.student?.email}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-primary font-semibold">{att.exam?.title}</span>
                          <div className="flex items-center gap-2">
                            {att.isPublished ? (
                              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                منشور
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                                مسودة
                              </span>
                            )}
                            {att.essayReviewLogs && att.essayReviewLogs.length > 0 && (
                              <span className="text-[10px] text-purple-500 font-bold bg-purple-500/10 px-2 py-0.5 rounded-full">
                                معدل
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    لا توجد محاولات في هذا القسم حاليًا.
                  </div>
                )}
              </div>

              {/* Grading panel */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
                {selectedAttempt ? (
                  loadingAttemptDetails ? (
                    <div className="text-center py-16 text-muted-foreground text-sm animate-pulse">
                      جاري تحميل إجابات وتفاصيل الطالب...
                    </div>
                  ) : selectedAttemptDetails ? (
                    <div className="space-y-4 text-right">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div>
                          <h4 className="font-bold text-foreground text-sm leading-snug">
                            {selectedAttemptDetails.student?.profile?.name}
                          </h4>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedAttemptDetails.student?.email}
                          </span>
                        </div>
                        
                        <div className="text-left">
                          {selectedAttemptDetails.isPublished ? (
                            <button
                              onClick={() => handleUnpublishAttempt(selectedAttemptDetails.id)}
                              className="rounded-xl border border-destructive bg-destructive/5 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              سحب وإعادة فتح النتيجة
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublishAttempt(selectedAttemptDetails.id)}
                              disabled={selectedAttemptDetails.essayAnswers?.some((ans: any) => ans.teacherGrade === null)}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow cursor-pointer transition-all ${
                                selectedAttemptDetails.essayAnswers?.some((ans: any) => ans.teacherGrade === null)
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                            >
                              نشر النتيجة للطالب
                            </button>
                          )}
                        </div>
                      </div>

                      {/* UI Metrics */}
                      {metrics && (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <div className="font-bold text-primary">{metrics.totalMcqEarned} / {metrics.totalMcqPossible}</div>
                            <div className="text-[10px] text-muted-foreground">التصحيح التلقائي</div>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <div className="font-bold text-primary">{metrics.totalEssayEarned} / {metrics.totalEssayPossible}</div>
                            <div className="text-[10px] text-muted-foreground">التصحيح المقالي</div>
                          </div>
                          <div className="rounded-lg bg-secondary/50 p-2">
                            <div className={`font-bold ${metrics.passed ? "text-emerald-500" : "text-red-500"}`}>
                              {metrics.finalPercentage}%
                            </div>
                            <div className="text-[10px] text-muted-foreground">الدرجة الكلية (النجاح {selectedAttemptDetails.exam?.passScore || 60}%)</div>
                          </div>
                        </div>
                      )}

                      {/* Essay questions list */}
                      <div className="space-y-5 pt-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {selectedAttemptDetails.essayAnswers?.map((ans: any) => (
                          <div key={ans.id} className="space-y-3 border-b border-border/50 pb-4">
                            <div className="rounded bg-secondary/50 p-3 text-xs leading-relaxed">
                              <span className="font-bold block text-muted-foreground mb-1">
                                السؤال المقالي:
                              </span>
                              <p className="text-foreground font-semibold">
                                {ans.question?.questionText || ans.question?.text}
                              </p>
                            </div>

                            <div className="rounded bg-primary/5 p-3 text-xs leading-relaxed">
                              <span className="font-bold block text-primary mb-1">
                                إجابة الطالب المقدمة:
                              </span>
                              <p className="text-foreground font-semibold whitespace-pre-wrap">
                                {ans.answerText || "لم يكتب إجابة."}
                              </p>
                            </div>

                            <div className="space-y-2 pt-1">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">
                                  أقصى درجة: {ans.question?.mark || ans.question?.points || 5}
                                </span>
                                <label className="text-xs font-bold text-foreground">
                                  الدرجة المستحقة
                                </label>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={ans.question?.mark || ans.question?.points || 5}
                                placeholder="الدرجة الرقمية..."
                                value={gradeInputs[ans.id]?.grade ?? ""}
                                onChange={(e) =>
                                  setGradeInputs({
                                    ...gradeInputs,
                                    [ans.id]: {
                                      ...gradeInputs[ans.id],
                                      grade: Number(e.target.value),
                                    },
                                  })
                                }
                                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-foreground">
                                ملاحظات وتقييم المدرس
                              </label>
                              <textarea
                                placeholder="أدخل ملاحظات التقييم هنا..."
                                value={gradeInputs[ans.id]?.feedback ?? ""}
                                onChange={(e) =>
                                  setGradeInputs({
                                    ...gradeInputs,
                                    [ans.id]: {
                                      ...gradeInputs[ans.id],
                                      feedback: e.target.value,
                                    },
                                  })
                                }
                                rows={3}
                                className="w-full text-right rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                              />
                            </div>

                            {/* Template comments */}
                            <div className="space-y-2 pt-1 bg-secondary/25 p-2.5 rounded-xl border">
                              <span className="block text-[10px] font-bold text-muted-foreground">
                                قوالب التعليقات السريعة المتاحة:
                              </span>
                              
                              {feedbackTemplates.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {feedbackTemplates.map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        setGradeInputs({
                                          ...gradeInputs,
                                          [ans.id]: {
                                            ...gradeInputs[ans.id],
                                            feedback: (gradeInputs[ans.id]?.feedback || "") + " " + t.text,
                                          },
                                        });
                                      }}
                                      className="text-[10px] bg-card hover:bg-secondary border border-border rounded px-2 py-1 text-foreground font-semibold cursor-pointer truncate max-w-[150px]"
                                      title={t.text}
                                    >
                                      {t.text}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground">لا توجد قوالب تعليقات بعد.</p>
                              )}

                              {/* Create comment template form */}
                              <div className="flex gap-1.5 pt-1.5 border-t border-border/40 mt-1.5">
                                <input
                                  type="text"
                                  placeholder="أضف قالب تعليق جديد..."
                                  value={newTemplateText}
                                  onChange={(e) => setNewTemplateText(e.target.value)}
                                  className="h-8 flex-1 rounded bg-card border border-border px-2 text-[10px] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleCreateFeedbackTemplate}
                                  className="h-8 rounded bg-primary text-white text-[10px] px-3 font-bold cursor-pointer"
                                >
                                  إضافة
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() =>
                                handleGradeEssay(ans.id, ans.question?.mark || ans.question?.points || 5)
                              }
                              className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:opacity-95 shadow cursor-pointer"
                            >
                              حفظ درجة هذا السؤال
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-xs leading-relaxed">
                      حدث خطأ أثناء تحميل إجابة الطالب.
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-xs leading-relaxed">
                    حدد محاولة طالب من القائمة الجانبية لبدء تصحيح أسئلته المقالية وإدخال الملاحظات.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Exam Dialog (Overhauled to premium Exam Builder Modal) */}
      <Dialog
        open={!!activeExam}
        onOpenChange={() => {
          setActiveExam(null);
          setTitleTouched(false);
        }}
      >
        <DialogContent
          className="max-w-5xl rounded-3xl text-end flex flex-col h-[90vh] p-0 overflow-hidden"
          dir="rtl"
        >
          {activeExam && (
            <>
              <DialogHeader className="px-6 pt-5 pb-3 border-b border-border bg-card">
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              {isAddExamMode ? "إضافة اختبار جديد" : `منشئ الاختبارات: ${formExamTitle}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Exam Details Section */}
            <div className="rounded-2xl border border-border bg-secondary/10 p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground border-b border-border/50 pb-2 flex items-center justify-between">
                <span>⚙ إعدادات الاختبار الأساسية</span>
                {autoSaveStatus === "SAVING" && (
                  <span className="text-xs text-indigo-500 font-bold animate-pulse">✓ جاري الحفظ تلقائياً...</span>
                )}
                {autoSaveStatus === "SAVED" && (
                  <span className="text-xs text-emerald-500 font-bold">✓ تم الحفظ تلقائياً</span>
                )}
              </h3>
              <form onSubmit={handleSaveExam} className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    اسم الاختبار
                  </label>
                  <input
                    type="text"
                    value={formExamTitle}
                    onBlur={() => setTitleTouched(true)}
                    onChange={(e) => {
                      setFormExamTitle(e.target.value);
                      setTitleTouched(true);
                    }}
                    placeholder="أدخل اسم الاختبار بالتفصيل..."
                    className={`h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none ${
                      titleTouched && formExamTitle.trim().length < 2
                        ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                        : "border-border focus:border-primary"
                    }`}
                  />
                  {titleTouched && formExamTitle.trim().length === 0 && (
                    <span className="text-[10px] text-red-500 block mt-1 text-right">
                      يرجى إدخال اسم الاختبار
                    </span>
                  )}
                  {titleTouched &&
                    formExamTitle.trim().length > 0 &&
                    formExamTitle.trim().length < 2 && (
                      <span className="text-[10px] text-red-500 block mt-1 text-right">
                        يجب أن يحتوي اسم الاختبار على حرفين على الأقل
                      </span>
                    )}
                </div>

                {isAddExamMode && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      الدورة التعليمية
                    </label>
                    <select
                      value={formExamCourseId}
                      onChange={(e) => setFormExamCourseId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    وصف الاختبار
                  </label>
                  <textarea
                    value={formExamDescription}
                    onChange={(e) => setFormExamDescription(e.target.value)}
                    rows={2}
                    placeholder="تفاصيل تعليمية أو إرشادات للطلاب..."
                    className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    المدة (بالدقائق)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formExamDurationLimit}
                    onChange={(e) => setFormExamDurationLimit(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                  <span className="text-[9px] text-muted-foreground block mt-0.5 text-right">
                    0 تعني بدون حد زمني
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    نسبة النجاح (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formExamPassScore}
                    onChange={(e) => setFormExamPassScore(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    أقصى عدد للمحاولات
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formExamMaxAttempts}
                    onChange={(e) => setFormExamMaxAttempts(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-6">
                    <input
                      type="checkbox"
                      checked={formExamShuffleChoices}
                      onChange={(e) => setFormExamShuffleChoices(e.target.checked)}
                      className="size-4 rounded border-border bg-card text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      ترتيب عشوائي للخيارات
                    </span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-6">
                    <input
                      type="checkbox"
                      checked={formExamUseRandomSubset}
                      onChange={(e) => setFormExamUseRandomSubset(e.target.checked)}
                      className="size-4 rounded border-border bg-card text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      استخدام عينة عشوائية من الأسئلة
                    </span>
                  </label>
                </div>

                {formExamUseRandomSubset && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      عدد أسئلة العينة العشوائية
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formExamSubsetQuestionCount}
                      onChange={(e) => setFormExamSubsetQuestionCount(Number(e.target.value))}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                )}

                <div className="sm:col-span-3 flex flex-wrap gap-4 items-center justify-end border-t border-border/50 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-semibold text-muted-foreground">
                      ترتيب عشوائي للأسئلة
                    </span>
                    <input
                      type="checkbox"
                      checked={formExamShuffleQuestions}
                      onChange={(e) => setFormExamShuffleQuestions(e.target.checked)}
                      className="size-4 rounded border-border bg-card text-primary focus:ring-primary"
                    />
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs font-semibold text-muted-foreground">
                      إظهار النتيجة للطالب
                    </span>
                    <input
                      type="checkbox"
                      checked={formExamShowResults}
                      onChange={(e) => setFormExamShowResults(e.target.checked)}
                      className="size-4 rounded border-border bg-card text-primary focus:ring-primary"
                    />
                  </label>

                  <div className="flex items-center gap-1.5 ml-auto text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/50">
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-bold">مسودة: يتم النشر والربط بالطلاب من داخل إعدادات الدروس والمحاضرات فقط.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={formExamTitle.trim().length < 2}
                    className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isAddExamMode ? "حفظ وإنشاء الاختبار للبدء" : "حفظ إعدادات الاختبار"}
                  </button>
                </div>
              </form>
            </div>

            {/* Questions Builder tabs (Only visible if the exam has been created/saved) */}
            {!isAddExamMode && (
              <div className="space-y-4">
                {/* Tabs Selector */}
                <div className="flex justify-start border-b border-border gap-4">
                  <button
                    onClick={() => setExamBuilderTab("manual")}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                      examBuilderTab === "manual"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ✍ إضافة الأسئلة يدوياً
                  </button>
                  <button
                    onClick={() => setExamBuilderTab("excel")}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
                      examBuilderTab === "excel"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📥 استيراد من Excel / CSV
                  </button>
                </div>

                {/* Tab 1: إضافة الأسئلة يدوياً */}
                {examBuilderTab === "manual" && (
                  <div className="grid gap-6 lg:grid-cols-[1fr_380px] text-right">
                    {/* Left Panel: Questions List inside this exam */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                      <div className="flex flex-col gap-2 border-b border-border/50 pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                            <span>الأسئلة الحالية في الاختبار</span>
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                              {exams.find((e) => e.id === activeExam.id)?.questions?.length || 0} سؤال
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setLibrarySearchQuery("");
                              setLibrarySelectedQuestions([]);
                              setIsImportLibraryOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm"
                          >
                            <span>📚 استيراد سؤال موجود</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={questionSearchQuery}
                          onChange={(e) => setQuestionSearchQuery(e.target.value)}
                          placeholder="ابحث في نص الأسئلة أو الخيارات أو النوع..."
                          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary mt-1"
                        />
                      </div>

                      {(() => {
                        const currentExam = exams.find((e) => e.id === activeExam.id);
                        const examQuestions = currentExam?.questions || [];
                        const examSections = [...(currentExam?.sections || [])].sort(
                          (a, b) => (a.order || 0) - (b.order || 0),
                        );

                        // Group questions by sectionId
                        const questionsBySection: Record<string, any[]> = {};
                        examSections.forEach((sec) => {
                          questionsBySection[sec.id] = [];
                        });
                        questionsBySection["uncategorized"] = [];

                        // Filter questions based on questionSearchQuery
                        const query = questionSearchQuery.toLowerCase();
                        const filteredExamQs = examQuestions.filter((q: any) => {
                          if (!query) return true;
                          const textMatch = (q.questionText || q.text || "").toLowerCase().includes(query);
                          const typeMatch = (q.qType || q.type || "").toLowerCase().includes(query);
                          const choicesMatch =
                            q.choices?.some((c: any) => (c.text || "").toLowerCase().includes(query)) || false;
                          return textMatch || typeMatch || choicesMatch;
                        });

                        filteredExamQs.forEach((q: any) => {
                          if (q.sectionId && questionsBySection[q.sectionId]) {
                            questionsBySection[q.sectionId].push(q);
                          } else {
                            questionsBySection["uncategorized"].push(q);
                          }
                        });

                        const renderQuestionCard = (q: any, qIdx: number, list: any[]) => {
                          return (
                            <div
                              key={q.id}
                              className="rounded-xl border border-border bg-secondary/5 p-3 space-y-2 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between gap-2">
                                {/* Action operations: Duplicate, Delete, Reorder */}
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Edit question: load into form
                                      const isTF =
                                        q.qType === "MULTIPLE_CHOICE" &&
                                        q.choices?.length === 2 &&
                                        q.choices.some((c: any) => c.text === "صح") &&
                                        q.choices.some((c: any) => c.text === "خطأ");
                                      setFormType(isTF ? "TRUE_FALSE" : q.qType || "MULTIPLE_CHOICE");
                                      setFormText(q.questionText || q.text);
                                      setFormDifficulty(q.difficulty || "MEDIUM");
                                      setFormMark(q.mark || q.points || 1);
                                      setFormExplanation(q.explanation || "");
                                      setFormQuestionImageUrl(q.imageUrl || "");
                                      setFormQuestionPdfUrl(q.pdfUrl || "");
                                      setFormQuestionSectionId(q.sectionId || "");
                                      if (q.qType === "MULTIPLE_CHOICE" && !isTF) {
                                        setFormOptions(q.choices?.map((c: any) => c.text) || ["", "", "", ""]);
                                        setFormCorrectAnswer(q.choices?.find((c: any) => c.isCorrect)?.text || "");
                                      } else if (isTF) {
                                        setFormCorrectAnswer(q.choices?.find((c: any) => c.isCorrect)?.text || "");
                                      }
                                      setIsAddMode(false);
                                      setActiveQuestion({
                                        id: q.id,
                                        examId: activeExam.id,
                                        type: q.type,
                                        qType: q.qType,
                                        text: q.questionText || q.text,
                                        difficulty: q.difficulty,
                                        mark: q.mark || q.points || 1,
                                        explanation: q.explanation || "",
                                        imageUrl: q.imageUrl,
                                        pdfUrl: q.pdfUrl,
                                        sectionId: q.sectionId,
                                      });
                                    }}
                                    className="rounded-lg p-1 text-primary hover:bg-secondary"
                                    title="تعديل"
                                  >
                                    <Edit className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      // Duplicate question
                                      try {
                                        toast.loading("جاري تكرار السؤال...");
                                        const created = await createQuestionFn({
                                          data: {
                                            examId: activeExam.id,
                                            text: q.questionText || q.text,
                                            type: q.type || q.qType || "MULTIPLE_CHOICE",
                                            difficulty: q.difficulty || "MEDIUM",
                                            explanation: q.explanation || "",
                                            mark: q.mark || q.points || 1,
                                            choices:
                                              q.choices?.map((c: any) => ({
                                                text: c.text,
                                                isCorrect: c.isCorrect,
                                              })) || [],
                                            imageUrl: q.imageUrl || null,
                                            pdfUrl: q.pdfUrl || null,
                                            sectionId: q.sectionId || null,
                                          },
                                        });
                                        pushToHistory({ type: "ADD", question: created });
                                        toast.dismiss();
                                        toast.success("تم تكرار السؤال بنجاح!");
                                        loadData();
                                      } catch (err: any) {
                                        toast.dismiss();
                                        toast.error("فشل تكرار السؤال: " + err.message);
                                      }
                                    }}
                                    className="rounded-lg p-1 text-amber-600 hover:bg-secondary"
                                    title="تكرار"
                                  >
                                    <Copy className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm("هل تريد حذف هذا السؤال نهائياً؟")) {
                                        try {
                                          await deleteQuestionFn({ data: { id: q.id } });
                                          pushToHistory({ type: "DELETE", question: q });
                                          toast.success("تم حذف السؤال!");
                                          loadData();
                                        } catch (err: any) {
                                          toast.error("فشل حذف السؤال: " + err.message);
                                        }
                                      }
                                    }}
                                    className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                                    title="حذف"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>

                                  {/* Reorder actions */}
                                  <button
                                    type="button"
                                    disabled={qIdx === 0}
                                    onClick={async () => {
                                      const prevQ = list[qIdx - 1];
                                      try {
                                        const currentOrder = q.order || 0;
                                        const prevOrder = prevQ.order || 0;
                                        await updateQuestionFn({
                                          data: { id: q.id, order: prevOrder },
                                        });
                                        await updateQuestionFn({
                                          data: { id: prevQ.id, order: currentOrder },
                                        });
                                        pushToHistory({
                                          type: "REORDER",
                                          previousOrders: [
                                            { id: q.id, order: currentOrder },
                                            { id: prevQ.id, order: prevOrder },
                                          ],
                                          newOrders: [
                                            { id: q.id, order: prevOrder },
                                            { id: prevQ.id, order: currentOrder },
                                          ],
                                        });
                                        toast.success("تم تغيير الترتيب للأعلى!");
                                        loadData();
                                      } catch (e: any) {
                                        toast.error("فشل تعديل الترتيب.");
                                      }
                                    }}
                                    className="rounded-lg p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                                    title="نقل للأعلى"
                                  >
                                    <MoveUp className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={qIdx === list.length - 1}
                                    onClick={async () => {
                                      const nextQ = list[qIdx + 1];
                                      try {
                                        const currentOrder = q.order || 0;
                                        const nextOrder = nextQ.order || 0;
                                        await updateQuestionFn({
                                          data: { id: q.id, order: nextOrder },
                                        });
                                        await updateQuestionFn({
                                          data: { id: nextQ.id, order: currentOrder },
                                        });
                                        pushToHistory({
                                          type: "REORDER",
                                          previousOrders: [
                                            { id: q.id, order: currentOrder },
                                            { id: nextQ.id, order: nextOrder },
                                          ],
                                          newOrders: [
                                            { id: q.id, order: nextOrder },
                                            { id: nextQ.id, order: currentOrder },
                                          ],
                                        });
                                        toast.success("تم تغيير الترتيب للأسفل!");
                                        loadData();
                                      } catch (e: any) {
                                        toast.error("فشل تعديل الترتيب.");
                                      }
                                    }}
                                    className="rounded-lg p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                                    title="نقل للأسفل"
                                  >
                                    <MoveDown className="size-3.5" />
                                  </button>
                                </div>

                                {/* Question details */}
                                <div className="flex-1 text-end">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                                      {DIFFICULTY_LABELS[q.difficulty || "MEDIUM"]}
                                    </span>
                                    <span className="text-[10px] bg-primary/5 px-1.5 py-0.5 rounded text-primary font-bold">
                                      {q.mark || q.points || 1} درجات
                                    </span>
                                    <span className="text-[11px] font-bold text-foreground">
                                      سؤال {qIdx + 1} ({q.qType === "ESSAY" ? "مقالي" : "MCQ"})
                                    </span>
                                  </div>
                                  <p className="text-xs text-foreground/90 mt-1 font-semibold line-clamp-2">
                                    {q.questionText || q.text}
                                  </p>

                                  {/* Image / PDF thumbnails */}
                                  <div className="flex justify-end gap-2 mt-2 flex-wrap">
                                    {q.pdfUrl && (
                                      <a
                                        href={q.pdfUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[9px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 hover:underline"
                                      >
                                        📄 ملف PDF مرفق
                                      </a>
                                    )}
                                    {q.imageUrl && (
                                      <div className="relative size-8 border rounded overflow-hidden">
                                        <img src={q.imageUrl} alt="attached" className="size-full object-cover" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        };

                        if (examQuestions.length === 0) {
                          return (
                            <div className="text-center py-12 text-muted-foreground text-xs leading-relaxed border border-dashed rounded-xl">
                              لا توجد أسئلة مضافة في هذا الاختبار بعد.
                              <br />
                              استخدم النموذج الجانبي لإضافة سؤالك الأول.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                            {/* Section Creator */}
                            <div className="flex gap-2 items-center bg-secondary/20 p-2.5 rounded-xl border border-border">
                              <input
                                id="new-section-input"
                                type="text"
                                placeholder="اسم القسم الجديد (مثال: القراءة المتحررة)..."
                                className="h-8 flex-1 rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = e.currentTarget.value;
                                    if (val.trim()) {
                                      handleAddSection(val);
                                      e.currentTarget.value = "";
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.getElementById("new-section-input") as HTMLInputElement;
                                  if (input && input.value.trim()) {
                                    handleAddSection(input.value);
                                    input.value = "";
                                  }
                                }}
                                className="h-8 rounded-lg bg-primary text-white px-3 text-xs font-bold hover:opacity-90 transition-all"
                              >
                                إضافة قسم
                              </button>
                            </div>

                            {/* Render Sections */}
                            {examSections.map((sec: any, secIdx: number) => {
                              const secQs = questionsBySection[sec.id] || [];
                              secQs.sort((a, b) => (a.order || 0) - (b.order || 0));
                              return (
                                <div
                                  key={sec.id}
                                  className="border border-border/80 rounded-xl bg-card overflow-hidden"
                                >
                                  <div className="bg-secondary/40 px-3 py-2 flex items-center justify-between border-b border-border/50">
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        defaultValue={sec.name}
                                        onBlur={(e) => handleUpdateSectionName(sec.id, e.target.value)}
                                        className="bg-transparent font-bold text-xs text-foreground focus:bg-card focus:px-2 focus:py-0.5 rounded outline-none border-b border-transparent focus:border-primary transition-all w-40"
                                      />
                                      <span className="text-[10px] text-muted-foreground font-semibold">
                                        ({secQs.length} أسئلة)
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={secIdx === 0}
                                        onClick={() => handleMoveSection(sec.id, "up", examSections)}
                                        className="p-1 rounded text-muted-foreground hover:bg-secondary disabled:opacity-30"
                                        title="نقل القسم للأعلى"
                                      >
                                        <MoveUp className="size-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={secIdx === examSections.length - 1}
                                        onClick={() => handleMoveSection(sec.id, "down", examSections)}
                                        className="p-1 rounded text-muted-foreground hover:bg-secondary disabled:opacity-30"
                                        title="نقل القسم للأسفل"
                                      >
                                        <MoveDown className="size-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSection(sec.id)}
                                        className="p-1 rounded text-red-500 hover:bg-red-50"
                                        title="حذف القسم"
                                      >
                                        <Trash2 className="size-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="p-2.5 space-y-2">
                                    {secQs.length === 0 ? (
                                      <div className="text-center py-4 text-[10px] text-muted-foreground italic border border-dashed rounded-lg">
                                        لا توجد أسئلة في هذا القسم بعد.
                                      </div>
                                    ) : (
                                      secQs.map((q, qIdx) => renderQuestionCard(q, qIdx, secQs))
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Uncategorized Questions */}
                            {(() => {
                              const uncategorizedQs = questionsBySection["uncategorized"] || [];
                              uncategorizedQs.sort((a, b) => (a.order || 0) - (b.order || 0));
                              if (uncategorizedQs.length === 0 && examSections.length > 0) return null;
                              return (
                                <div className="border border-border/80 rounded-xl bg-card overflow-hidden">
                                  <div className="bg-amber-500/5 px-3 py-2 flex items-center justify-between border-b border-border/50">
                                    <span className="font-bold text-xs text-amber-600">
                                      أسئلة غير مصنفة ({uncategorizedQs.length})
                                    </span>
                                  </div>
                                  <div className="p-2.5 space-y-2">
                                    {uncategorizedQs.length === 0 ? (
                                      <div className="text-center py-4 text-[10px] text-muted-foreground italic border border-dashed rounded-lg">
                                        لا توجد أسئلة غير مصنفة.
                                      </div>
                                    ) : (
                                      uncategorizedQs.map((q, qIdx) => renderQuestionCard(q, qIdx, uncategorizedQs))
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right Panel: Add / Edit Question Sub-form */}
                    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                      <h4 className="font-bold text-sm text-primary border-b border-border/50 pb-2">
                        {isAddMode ? "✍ إضافة سؤال جديد" : "📝 تعديل سؤال محدد"}
                      </h4>
                      <div className="space-y-3 text-right">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">
                            نوع السؤال
                          </label>
                          <select
                            value={formType}
                            onChange={(e) => {
                              setFormType(e.target.value as any);
                              setFormOptions(["", "", "", ""]);
                              setFormCorrectAnswer("");
                            }}
                            className="h-9 w-full rounded-xl border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                          >
                            <option value="MULTIPLE_CHOICE">اختيار من متعدد (MCQ)</option>
                            <option value="TRUE_FALSE">صح / خطأ (True / False)</option>
                            <option value="ESSAY">سؤال مقالي (Essay)</option>
                            <option value="SHORT_ANSWER">سؤال إجابة قصيرة (Short Answer)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">
                            القسم (Section)
                          </label>
                          <select
                            value={formQuestionSectionId}
                            onChange={(e) => setFormQuestionSectionId(e.target.value)}
                            className="h-9 w-full rounded-xl border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                          >
                            <option value="">بدون قسم (سؤال عام)</option>
                            {(() => {
                              const currentExam = exams.find((e) => e.id === activeExam.id);
                              return (currentExam?.sections || []).map((sec: any) => (
                                <option key={sec.id} value={sec.id}>
                                  {sec.name}
                                </option>
                              ));
                            })()}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                              الصعوبة
                            </label>
                            <select
                              value={formDifficulty}
                              onChange={(e) =>
                                setFormDifficulty(e.target.value as QuestionDifficulty)
                              }
                              className="h-9 w-full rounded-xl border border-border bg-card px-2 text-xs outline-none focus:border-primary"
                            >
                              <option value="VERY_EASY">سهل جداً</option>
                              <option value="EASY">سهل</option>
                              <option value="MEDIUM">متوسط</option>
                              <option value="HARD">صعب</option>
                              <option value="VERY_HARD">صعب جداً</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                              الدرجة
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={formMark}
                              onChange={(e) => setFormMark(Number(e.target.value))}
                              className="h-9 w-full rounded-xl border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">
                            نص السؤال
                          </label>
                          <textarea
                            value={formText}
                            onChange={(e) => setFormText(e.target.value)}
                            required
                            rows={3}
                            placeholder="اكتب هنا نص السؤال بالتفصيل..."
                            className="w-full rounded-xl border border-border bg-card p-3 text-xs outline-none focus:border-primary"
                          />
                        </div>

                        {/* Image Upload for manual question */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-muted-foreground">
                              صورة للسؤال
                            </label>
                            <div className="flex gap-1.5 items-center">
                              {formQuestionImageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setFormQuestionImageUrl("")}
                                  className="text-[9px] bg-red-50 text-red-500 rounded border border-red-100 p-1"
                                >
                                  حذف
                                </button>
                              )}
                              <label className="h-8 flex-1 rounded border border-border bg-secondary/15 flex items-center justify-center text-[10px] font-semibold cursor-pointer hover:bg-secondary/30 transition-all">
                                {uploadingQuestionImage ? "جاري الرفع..." : "اختر صورة"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      setUploadingQuestionImage(true);
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        const base64 = ev.target?.result as string;
                                        const res = await uploadFileFn({
                                          data: { name: file.name, base64, category: "cover" },
                                        });
                                        if (res.success && res.data?.url) {
                                          setFormQuestionImageUrl(
                                            window.location.origin + res.data.url,
                                          );
                                          toast.success("تم رفع صورة السؤال!");
                                        } else {
                                          toast.error("فشل رفع الصورة.");
                                        }
                                        setUploadingQuestionImage(false);
                                      };
                                      reader.readAsDataURL(file);
                                    } catch (err: any) {
                                      setUploadingQuestionImage(false);
                                      toast.error("حدث خطأ أثناء الرفع.");
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {formQuestionImageUrl && (
                              <div className="relative size-12 border rounded overflow-hidden mt-1">
                                <img
                                  src={formQuestionImageUrl}
                                  alt="attachment"
                                  className="size-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          {/* PDF Upload for manual question */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold text-muted-foreground">
                              ملف PDF مرفق
                            </label>
                            <div className="flex gap-1.5 items-center">
                              {formQuestionPdfUrl && (
                                <button
                                  type="button"
                                  onClick={() => setFormQuestionPdfUrl("")}
                                  className="text-[9px] bg-red-50 text-red-500 rounded border border-red-100 p-1"
                                >
                                  حذف
                                </button>
                              )}
                              <label className="h-8 flex-1 rounded border border-border bg-secondary/15 flex items-center justify-center text-[10px] font-semibold cursor-pointer hover:bg-secondary/30 transition-all">
                                {uploadingQuestionPdf ? "جاري الرفع..." : "اختر PDF"}
                                <input
                                  type="file"
                                  accept=".pdf"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      setUploadingQuestionPdf(true);
                                      const reader = new FileReader();
                                      reader.onload = async (ev) => {
                                        const base64 = ev.target?.result as string;
                                        const res = await uploadFileFn({
                                          data: { name: file.name, base64, category: "pdf" },
                                        });
                                        if (res.success && res.data?.url) {
                                          setFormQuestionPdfUrl(
                                            window.location.origin + res.data.url,
                                          );
                                          toast.success("تم رفع ملف PDF المرفق!");
                                        } else {
                                          toast.error("فشل الرفع.");
                                        }
                                        setUploadingQuestionPdf(false);
                                      };
                                      reader.readAsDataURL(file);
                                    } catch (err: any) {
                                      setUploadingQuestionPdf(false);
                                      toast.error("حدث خطأ أثناء الرفع.");
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {formQuestionPdfUrl && (
                              <p className="text-[8px] text-muted-foreground truncate max-w-[150px] mt-1">
                                {formQuestionPdfUrl.split("/").pop()}
                              </p>
                            )}
                          </div>
                        </div>

                        {formType === "MULTIPLE_CHOICE" && (
                          <div className="space-y-2 border-t border-border/30 pt-2">
                            <label className="block text-xs font-semibold text-muted-foreground">
                              خيارات السؤال (MCQ)
                            </label>
                            {formOptions.map((opt, i) => (
                              <input
                                key={i}
                                type="text"
                                placeholder={`الخيار ${i + 1}`}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...formOptions];
                                  updated[i] = e.target.value;
                                  setFormOptions(updated);
                                }}
                                required={i < 2}
                                className="h-8 w-full rounded-lg border border-border bg-card px-2.5 text-xs outline-none focus:border-primary"
                              />
                            ))}
                            <div>
                              <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                                حدد الإجابة الصحيحة
                              </label>
                              <select
                                value={formCorrectAnswer}
                                onChange={(e) => setFormCorrectAnswer(e.target.value)}
                                required
                                className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs outline-none focus:border-primary"
                              >
                                <option value="">اختر الإجابة الصحيحة...</option>
                                {formOptions
                                  .filter((o) => o.trim() !== "")
                                  .map((o, idx) => (
                                    <option key={idx} value={o}>
                                      {o}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {formType === "TRUE_FALSE" && (
                          <div className="space-y-2 border-t border-border/30 pt-2">
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                              الإجابة الصحيحة
                            </label>
                            <select
                              value={formCorrectAnswer}
                              onChange={(e) => setFormCorrectAnswer(e.target.value)}
                              required
                              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs outline-none focus:border-primary"
                            >
                              <option value="">اختر الإجابة...</option>
                              <option value="صح">صح</option>
                              <option value="خطأ">خطأ</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">
                            شرح وتفسير الإجابة النموذجية
                          </label>
                          <textarea
                            value={formExplanation}
                            onChange={(e) => setFormExplanation(e.target.value)}
                            rows={2}
                            placeholder="يظهر للطلاب بعد إنهاء الاختبار..."
                            className="w-full rounded-xl border border-border bg-card p-3 text-xs outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Cancel edit question: restore to add mode
                              setIsAddMode(true);
                              setFormText("");
                              setFormOptions(["", "", "", ""]);
                              setFormCorrectAnswer("");
                              setFormExplanation("");
                              setFormQuestionImageUrl("");
                              setFormQuestionPdfUrl("");
                            }}
                            className="flex-1 rounded-xl border border-border py-2 text-xs font-bold text-foreground hover:bg-secondary"
                          >
                            إلغاء التعديل
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              // Direct Save Manual Question
                              if (!formText.trim()) {
                                toast.error("يرجى إدخال نص السؤال.");
                                return;
                              }

                              try {
                                toast.loading("جاري حفظ السؤال...");
                                let choicesList: { text: string; isCorrect: boolean }[] = [];
                                let mappedType: "MULTIPLE_CHOICE" | "ESSAY" = "MULTIPLE_CHOICE";

                                if (formType === "MULTIPLE_CHOICE") {
                                  mappedType = "MULTIPLE_CHOICE";
                                  const cleanOptions = formOptions
                                    .map((o) => o.trim())
                                    .filter((o) => o !== "");
                                  if (cleanOptions.length < 2) {
                                    toast.error("يجب إدخال خيارين على الأقل.");
                                    return;
                                  }
                                  if (!formCorrectAnswer) {
                                    toast.error("يرجى تحديد الإجابة الصحيحة.");
                                    return;
                                  }
                                  choicesList = cleanOptions.map((opt) => ({
                                    text: opt,
                                    isCorrect: opt === formCorrectAnswer,
                                  }));
                                } else if (formType === "TRUE_FALSE") {
                                  mappedType = "MULTIPLE_CHOICE";
                                  if (!formCorrectAnswer) {
                                    toast.error("يرجى تحديد الإجابة الصحيحة.");
                                    return;
                                  }
                                  choicesList = [
                                    { text: "صح", isCorrect: formCorrectAnswer === "صح" },
                                    { text: "خطأ", isCorrect: formCorrectAnswer === "خطأ" },
                                  ];
                                } else {
                                  mappedType = "ESSAY";
                                }

                                if (isAddMode) {
                                  const created = await createQuestionFn({
                                    data: {
                                      examId: activeExam.id,
                                      text: formText,
                                      type: mappedType,
                                      difficulty: formDifficulty,
                                      explanation: formExplanation,
                                      mark: formMark,
                                      choices: choicesList,
                                      imageUrl: formQuestionImageUrl || null,
                                      pdfUrl: formQuestionPdfUrl || null,
                                      sectionId: formQuestionSectionId || null,
                                    },
                                  });
                                  pushToHistory({ type: "ADD", question: created });
                                  toast.dismiss();
                                  toast.success("تمت إضافة السؤال للاختبار بنجاح!");
                                } else {
                                  const previous = { ...activeQuestion };
                                  const current = {
                                    id: activeQuestion!.id,
                                    text: formText,
                                    type: mappedType,
                                    difficulty: formDifficulty,
                                    explanation: formExplanation,
                                    mark: formMark,
                                    choices: choicesList,
                                    imageUrl: formQuestionImageUrl || null,
                                    pdfUrl: formQuestionPdfUrl || null,
                                    sectionId: formQuestionSectionId || null,
                                  };
                                  await updateQuestionFn({
                                    data: current,
                                  });
                                  pushToHistory({ type: "EDIT", previous, current });
                                  toast.dismiss();
                                  toast.success("تم تحديث السؤال بنجاح!");
                                }

                                // Reset question inputs
                                setIsAddMode(true);
                                setFormText("");
                                setFormOptions(["", "", "", ""]);
                                setFormCorrectAnswer("");
                                setFormExplanation("");
                                setFormQuestionImageUrl("");
                                setFormQuestionPdfUrl("");
                                loadData();
                              } catch (err: any) {
                                toast.dismiss();
                                toast.error("فشل حفظ السؤال: " + err.message);
                              }
                            }}
                            className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground hover:opacity-95 shadow"
                          >
                            {isAddMode ? "حفظ السؤال" : "حفظ التعديلات"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: استيراد من Excel */}
                {examBuilderTab === "excel" && (
                  <div className="space-y-4 text-right">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/10 p-5">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground">
                          استيراد الأسئلة من ملف Excel أو CSV
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          قم بتحميل قالب الإدخال أولاً وتعبئته ثم رفعه لإضافته مباشرة في هذا
                          الاختبار.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadTemplate}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
                        >
                          <FileSpreadsheet className="size-4 text-emerald-500" /> تحميل قالب Excel
                        </button>
                        <label className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-95 cursor-pointer transition-all shadow">
                          <FileSpreadsheet className="size-4 text-primary-foreground" /> اختر الملف
                          للرفع
                          <input
                            type="file"
                            accept=".xlsx,.csv"
                            onChange={handleImportXLSX}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Inline Spreadsheet Table Preview */}
                    {excelPreviewOpen && (
                      <div className="space-y-4 rounded-2xl border border-border p-4 bg-card shadow-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-border/50">
                          <span className="text-xs text-muted-foreground">
                            يمكنك تعديل أي خلية مباشرة في الجدول أدناه قبل الحفظ.
                          </span>
                          <h4 className="font-bold text-sm text-foreground">
                            📊 معاينة ومراجعة الأسئلة المستوردة
                          </h4>
                        </div>

                        {excelValidationErrors.length > 0 && (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 overflow-y-auto max-h-[100px] space-y-1">
                            <div className="font-bold flex items-center gap-1 mb-1">
                              <AlertCircle className="size-4" /> يرجى إصلاح أخطاء التحقق التالية
                              لتفعيل الحفظ:
                            </div>
                            {excelValidationErrors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}

                        <div className="overflow-x-auto border border-border rounded-xl">
                          <table className="w-full border-collapse text-end text-xs min-w-[1000px]">
                            <thead>
                              <tr className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
                                <th className="p-3 w-12 text-center">الرقم</th>
                                <th className="p-3 min-w-[200px]">السؤال</th>
                                <th className="p-3 w-32">النوع</th>
                                <th className="p-3 w-28">الخيار أ</th>
                                <th className="p-3 w-28">الخيار ب</th>
                                <th className="p-3 w-28">الخيار ج</th>
                                <th className="p-3 w-28">الخيار د</th>
                                <th className="p-3 w-28">الإجابة الصحيحة</th>
                                <th className="p-3 w-28">الصعوبة</th>
                                <th className="p-3 min-w-[150px]">الشرح والتفسير</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                              {excelPreviewRows.map((row, idx) => (
                                <tr key={row.id} className="hover:bg-secondary/10">
                                  <td className="p-2 text-center font-bold text-muted-foreground">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.question}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "question", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={row.type}
                                      onChange={(e) => handleCellEdit(idx, "type", e.target.value)}
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                                    >
                                      <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
                                      <option value="TRUE_FALSE">صح / خطأ</option>
                                      <option value="ESSAY">مقال</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                                      value={row.type === "TRUE_FALSE" ? "صح" : row.choiceA}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "choiceA", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                                      value={row.type === "TRUE_FALSE" ? "خطأ" : row.choiceB}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "choiceB", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                                      value={row.choiceC}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "choiceC", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                                      value={row.choiceD}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "choiceD", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                                    />
                                  </td>
                                  <td className="p-2">
                                    {row.type === "TRUE_FALSE" ? (
                                      <select
                                        value={row.correctAnswer}
                                        onChange={(e) =>
                                          handleCellEdit(idx, "correctAnswer", e.target.value)
                                        }
                                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                                      >
                                        <option value="">اختر...</option>
                                        <option value="صح">صح (A)</option>
                                        <option value="خطأ">خطأ (B)</option>
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        disabled={row.type === "ESSAY"}
                                        value={row.correctAnswer}
                                        placeholder="A, B, C, or D"
                                        onChange={(e) =>
                                          handleCellEdit(idx, "correctAnswer", e.target.value)
                                        }
                                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                                      />
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <select
                                      value={row.difficulty}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "difficulty", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                                    >
                                      <option value="VERY_EASY">سهل جداً</option>
                                      <option value="EASY">سهل</option>
                                      <option value="MEDIUM">متوسط</option>
                                      <option value="HARD">صعب</option>
                                      <option value="VERY_HARD">صعب جداً</option>
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      value={row.explanation}
                                      onChange={(e) =>
                                        handleCellEdit(idx, "explanation", e.target.value)
                                      }
                                      className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setExcelPreviewOpen(false);
                              setExcelPreviewRows([]);
                            }}
                            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
                          >
                            إلغاء
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveExcelImport}
                            disabled={excelValidationErrors.length > 0}
                            className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-45 shadow"
                          >
                            حفظ واستيراد الأسئلة المستوردة
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-background px-6 py-4 border-t border-border mt-auto flex items-center justify-between gap-4 z-10">
            <button
              type="button"
              onClick={() => {
                setActiveExam(null);
                setTitleTouched(false);
              }}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 rounded-xl transition-all"
            >
              إغلاق المنشئ
            </button>
          </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add / Edit Question Dialog */}
      <Dialog open={!!activeQuestion} onOpenChange={() => setActiveQuestion(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              {isAddMode ? "إضافة سؤال جديد" : "تعديل السؤال"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveQuestion} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                نوع السؤال
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="MULTIPLE_CHOICE">اختيار من متعدد (MCQ)</option>
                <option value="TRUE_FALSE">صح / خطأ (True / False)</option>
                <option value="ESSAY">سؤال مقالي (ESSAY)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                درجة الصعوبة
              </label>
              <select
                value={formDifficulty}
                onChange={(e) => setFormDifficulty(e.target.value as QuestionDifficulty)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="VERY_EASY">سهل جداً</option>
                <option value="EASY">سهل</option>
                <option value="MEDIUM">متوسط</option>
                <option value="HARD">صعب</option>
                <option value="VERY_HARD">صعب جداً</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الدرجة المقدرة
              </label>
              <input
                type="number"
                min={1}
                value={formMark}
                onChange={(e) => setFormMark(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                نص السؤال
              </label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                required
                rows={3}
                placeholder="أدخل نص السؤال بالتفصيل..."
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {formType === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted-foreground">
                  خيارات السؤال (MCQ)
                </label>
                {formOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`خيار ${i + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...formOptions];
                      updated[i] = e.target.value;
                      setFormOptions(updated);
                    }}
                    required={formType === "MULTIPLE_CHOICE" && i < 2}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                ))}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    الإجابة الصحيحة
                  </label>
                  <select
                    value={formCorrectAnswer}
                    onChange={(e) => setFormCorrectAnswer(e.target.value)}
                    required={formType === "MULTIPLE_CHOICE"}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  >
                    <option value="">اختر الإجابة الصحيحة...</option>
                    {formOptions
                      .filter((o) => o.trim() !== "")
                      .map((o, idx) => (
                        <option key={idx} value={o}>
                          {o}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {formType === "TRUE_FALSE" && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  الإجابة الصحيحة (صح / خطأ)
                </label>
                <select
                  value={formCorrectAnswer}
                  onChange={(e) => setFormCorrectAnswer(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="">اختر الإجابة...</option>
                  <option value="صح">صح</option>
                  <option value="خطأ">خطأ</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                شرح وتفسير الإجابة النموذجية (Explanation)
              </label>
              <textarea
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                rows={2}
                placeholder="أدخل التفسير للطلاب بعد إنهاء الاختبار..."
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow hover:opacity-95 transition-all"
            >
              حفظ السؤال في بنك الأسئلة
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              معاينة السؤال
            </DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-secondary/30 p-3">
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-bold border ${DIFFICULTY_COLORS[previewQuestion.difficulty]}`}
                  >
                    {DIFFICULTY_LABELS[previewQuestion.difficulty]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    النوع:{" "}
                    {previewQuestion.qType === "MULTIPLE_CHOICE" ? "اختيار من متعدد" : "مقالي"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">{previewQuestion.text}</p>
                <span className="block text-[10px] text-primary font-bold mt-1">
                  الدرجة: {previewQuestion.mark}
                </span>
              </div>

              {previewQuestion.qType === "MULTIPLE_CHOICE" && previewQuestion.options && (
                <div className="space-y-2">
                  {previewQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 text-sm flex items-center justify-between ${opt === previewQuestion.correctAnswer ? "border-success bg-success/5 font-semibold" : "border-border"}`}
                    >
                      {opt === previewQuestion.correctAnswer && (
                        <CheckCircle2 className="size-4 text-success" />
                      )}
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}

              {previewQuestion.explanation && (
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 text-xs">
                  <span className="block font-bold text-primary mb-1">شرح الإجابة:</span>
                  <p className="text-foreground">{previewQuestion.explanation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exam Details Preview Dialog */}
      <Dialog open={!!previewExamDetails} onOpenChange={() => setPreviewExamDetails(null)}>
        <DialogContent
          className="max-w-2xl rounded-2xl text-end overflow-y-auto max-h-[80vh]"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              معاينة محتويات الاختبار
            </DialogTitle>
          </DialogHeader>
          {previewExamDetails && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border p-4 bg-secondary/20">
                <h4 className="font-bold text-base text-foreground mb-1">
                  {previewExamDetails.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  {previewExamDetails.description || "لا يوجد وصف حالياً."}
                </p>
                <div className="flex justify-between items-center text-xs text-muted-foreground flex-wrap gap-2">
                  <span>المدة: {previewExamDetails.durationLimit || "مفتوحة"} دقيقة</span>
                  <span>نسبة النجاح: {previewExamDetails.passScore}%</span>
                  <span>الحد الأقصى للمحاولات: {previewExamDetails.maxAttempts}</span>
                  <span>عدد الأسئلة: {previewExamDetails.questions?.length || 0}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-sm text-foreground">الأسئلة المرتبطة بالاختبار:</h5>
                {previewExamDetails.questions && previewExamDetails.questions.length > 0 ? (
                  previewExamDetails.questions.map((q: any, idx: number) => (
                    <div
                      key={q.id}
                      className="border border-border rounded-xl p-3 bg-card space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-primary font-bold">
                          سؤال {idx + 1} ({q.mark || q.points} درجات)
                        </span>
                        <span className="text-muted-foreground border rounded px-1.5 py-0.5">
                          {q.type === "ESSAY" ? "مقالي" : "اختيار من متعدد"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        {q.questionText || q.text}
                      </p>
                      {q.choices && q.choices.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.choices.map((ch: any) => (
                            <div
                              key={ch.id}
                              className={`p-2 rounded border text-xs flex justify-between items-center ${ch.isCorrect ? "border-success bg-success/5 font-semibold" : "border-border"}`}
                            >
                              {ch.isCorrect && <Check className="size-3 text-success" />}
                              <span>{ch.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    لا توجد أسئلة مضافة لهذا الاختبار بعد.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Excel Spreadsheet Preview & Editing Dialog */}
      <Dialog open={excelPreviewOpen} onOpenChange={() => setExcelPreviewOpen(false)}>
        <DialogContent
          className="max-w-5xl rounded-2xl text-end overflow-hidden flex flex-col h-[85vh]"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              مراجعة وتعديل أسئلة ملف Excel قبل الاستيراد
            </DialogTitle>
          </DialogHeader>

          {/* Validation Warnings */}
          {excelValidationErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 overflow-y-auto max-h-[100px] space-y-1">
              <div className="font-bold flex items-center gap-1 mb-1">
                <AlertCircle className="size-4" /> يرجى إصلاح أخطاء التحقق التالية لتفعيل الحفظ:
              </div>
              {excelValidationErrors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {/* Scrollable Spreadsheet Table */}
          <div className="flex-1 overflow-auto border border-border rounded-xl mt-4">
            <table className="w-full border-collapse text-end text-xs min-w-[1000px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50 sticky top-0 font-bold text-muted-foreground">
                  <th className="p-3 w-12 text-center">الرقم</th>
                  <th className="p-3 min-w-[200px]">السؤال</th>
                  <th className="p-3 w-32">النوع</th>
                  <th className="p-3 w-28">الخيار أ</th>
                  <th className="p-3 w-28">الخيار ب</th>
                  <th className="p-3 w-28">الخيار ج</th>
                  <th className="p-3 w-28">الخيار د</th>
                  <th className="p-3 w-28">الإجابة الصحيحة</th>
                  <th className="p-3 w-28">الصعوبة</th>
                  <th className="p-3 min-w-[150px]">الشرح والتفسير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {excelPreviewRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-secondary/10">
                    <td className="p-2 text-center font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.question}
                        onChange={(e) => handleCellEdit(idx, "question", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={row.type}
                        onChange={(e) => handleCellEdit(idx, "type", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                      >
                        <option value="MULTIPLE_CHOICE">اختيار من متعدد</option>
                        <option value="TRUE_FALSE">صح / خطأ</option>
                        <option value="ESSAY">مقال</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                        value={row.type === "TRUE_FALSE" ? "صح" : row.choiceA}
                        onChange={(e) => handleCellEdit(idx, "choiceA", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                        value={row.type === "TRUE_FALSE" ? "خطأ" : row.choiceB}
                        onChange={(e) => handleCellEdit(idx, "choiceB", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                        value={row.choiceC}
                        onChange={(e) => handleCellEdit(idx, "choiceC", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        disabled={row.type === "ESSAY" || row.type === "TRUE_FALSE"}
                        value={row.choiceD}
                        onChange={(e) => handleCellEdit(idx, "choiceD", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                      />
                    </td>
                    <td className="p-2">
                      {row.type === "TRUE_FALSE" ? (
                        <select
                          value={row.correctAnswer}
                          onChange={(e) => handleCellEdit(idx, "correctAnswer", e.target.value)}
                          className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                        >
                          <option value="">اختر...</option>
                          <option value="صح">صح (A)</option>
                          <option value="خطأ">خطأ (B)</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          disabled={row.type === "ESSAY"}
                          value={row.correctAnswer}
                          placeholder="A, B, C, or D"
                          onChange={(e) => handleCellEdit(idx, "correctAnswer", e.target.value)}
                          className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent disabled:opacity-40"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      <select
                        value={row.difficulty}
                        onChange={(e) => handleCellEdit(idx, "difficulty", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                      >
                        <option value="VERY_EASY">سهل جداً</option>
                        <option value="EASY">سهل</option>
                        <option value="MEDIUM">متوسط</option>
                        <option value="HARD">صعب</option>
                        <option value="VERY_HARD">صعب جداً</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.explanation}
                        onChange={(e) => handleCellEdit(idx, "explanation", e.target.value)}
                        className="w-full h-8 px-2 border rounded outline-none focus:border-primary text-xs bg-transparent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="mt-4 gap-2 flex justify-end">
            <button
              onClick={() => setExcelPreviewOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary"
            >
              إلغاء الاستيراد
            </button>
            <button
              onClick={handleSaveExcelImport}
              disabled={excelValidationErrors.length > 0}
              className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-45 disabled:cursor-not-allowed shadow"
            >
              حفظ الأسئلة المستوردة
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Question Library Dialog */}
      <Dialog open={isImportLibraryOpen} onOpenChange={setIsImportLibraryOpen}>
        <DialogContent
          className="max-w-4xl rounded-3xl text-end flex flex-col h-[80vh] p-0 overflow-hidden"
          dir="rtl"
        >
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border bg-card">
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              📚 استيراد أسئلة من مكتبة المعلم
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 border-b border-border bg-secondary/10 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <input
              type="text"
              value={librarySearchQuery}
              onChange={(e) => setLibrarySearchQuery(e.target.value)}
              placeholder="ابحث في أسئلة المكتبة..."
              className="h-10 w-full sm:w-80 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            />
            <span className="text-xs font-bold text-muted-foreground">
              تم اختيار {librarySelectedQuestions.length} سؤال للاستيراد
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredLibraryQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                لا توجد أسئلة مطابقة للبحث أو المكتبة فارغة حالياً.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredLibraryQuestions.map((q: any) => {
                  const isSelected = librarySelectedQuestions.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        setLibrarySelectedQuestions((prev) =>
                          prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                        );
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all text-right flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-secondary/5"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="size-4 rounded border-border bg-card text-primary focus:ring-primary mt-1"
                        />
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] bg-secondary text-muted-foreground font-bold px-2 py-0.5 rounded-full inline-block self-end mb-1">
                            {q.courseTitle} - {q.examTitle}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {q.questionText || q.text}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t border-border/50">
                        <span>الدرجة: {q.mark || q.points || 1}</span>
                        <span>الصعوبة: {DIFFICULTY_LABELS[q.difficulty || "MEDIUM"]}</span>
                        <span>النوع: {q.qType === "ESSAY" ? "مقالي" : "MCQ"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-card flex justify-end gap-3">
            <button
              onClick={() => setIsImportLibraryOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary"
            >
              إلغاء
            </button>
            <button
              onClick={handleImportFromLibrary}
              disabled={librarySelectedQuestions.length === 0}
              className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-45 disabled:cursor-not-allowed shadow hover:opacity-95"
            >
              استيراد الأسئلة المحددة ({librarySelectedQuestions.length})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
