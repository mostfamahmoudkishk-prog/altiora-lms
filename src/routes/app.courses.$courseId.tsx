import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { getCourseLiveSessionsFn } from "../lib/api/live.functions";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  PlayCircle,
  Star,
  Lock,
  Plus,
  Monitor,
  Trophy,
  Medal,
  Award,
  Sparkles,
  TrendingUp,
  Users,
  ArrowLeft,
  Paperclip,
  ClipboardList,
  ChevronDown,
  BookOpen,
  Clock,
  Radio,
  Calendar,
  Download,
} from "lucide-react";
import { allCourses } from "@/components/app/CourseGrid";
import { isEnrolled } from "@/lib/wallet";
import { GetCourseModal } from "@/components/app/GetCourseModal";
import { LectureModal, type Lecture } from "@/components/app/LectureModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getLeaderboardFn,
  getModulesByCourseFn,
  getCourseSettingsFn,
  getLessonSettingsFn,
  getExamAttemptsFn,
  getCoursePlaybackProgressFn,
  getCoursesFn,
  trackDownloadFn,
  logDownloadFn,
} from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/app/courses/$courseId")({
  component: CourseDetailPage,
});

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function buildLectures(courseId: string, total: number): Lecture[] {
  if (courseId === "demo-math-2026") {
    const titles = [
      "المحاضرة التعريفية",
      "الحلقة الأولى",
      "الحلقة الثانية",
      "التدريب الأول",
      "الحلقة الثالثة",
      "الحلقة الرابعة",
      "الحلقة الخامسة",
      "الحلقة السادسة",
      "التدريب الثاني",
      "المراجعة النهائية",
      "الامتحان الشامل",
      "الحلقة الختامية",
    ];
    return titles.map((t, i) => ({
      id: `demo-math-2026-l${i + 1}`,
      title: t,
      isFree: i < 4,
      videoUrl: SAMPLE_VIDEO,
      exams: [],
      attachments: [],
    }));
  }
  const baseTitles = [
    "المحاضرة التعريفية",
    "الحلقة الأولى",
    "الحلقة الثانية",
    "الحلقة الثالثة",
    "التحدي الأول",
    "الحلقة الرابعة",
    "الحلقة الخامسة",
    "الحلقة السادسة",
    "التحدي الثاني",
    "الحلقة السابعة",
    "الحلقة الثامنة",
    "الحلقة التاسعة",
    "التحدي الثالث",
  ];
  return Array.from({ length: Math.max(total, 1) }, (_, i) => ({
    id: `${courseId}-l${i + 1}`,
    title: baseTitles[i] ?? `الحلقة ${i + 1}`,
    hasMandatoryExam: i === 0,
    exams: [],
    attachments: [],
  }));
}

function CourseDetailPage() {
  const { courseId } = useParams({ from: "/app/courses/$courseId" });
  const navigate = useNavigate();

  const [dbCourse, setDbCourse] = useState<any | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [activeLiveSession, setActiveLiveSession] = useState<any | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [lecOpen, setLecOpen] = useState(false);
  const [activeLec, setActiveLec] = useState<Lecture | null>(null);

  // Locked Lesson Dialog state
  const [lockAlertOpen, setLockAlertOpen] = useState(false);
  const [targetLockedLesson, setTargetLockedLesson] = useState<any | null>(null);

  // Description text expanded state
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Tabs: "videos" | "exams" | "files" | "live" | "leaderboard"
  const [activeTab, setActiveTab] = useState<"videos" | "exams" | "files" | "live" | "leaderboard">(
    "videos",
  );
  const [leaderboard, setLeaderboard] = useState<any | null>(null);
  const [loadingLb, setLoadingLb] = useState(false);

  // Outline database states
  const [modules, setModules] = useState<any[]>([]);
  const [courseSettings, setCourseSettings] = useState<any>({
    sequentialMode: "OFF",
    selectedStudents: [],
    requirePassingExam: false,
  });
  const [attempts, setAttempts] = useState<any[]>([]);
  const [lessonSettingsMap, setLessonSettingsMap] = useState<Record<string, any>>({});
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, any>>({});
  const [loadingOutline, setLoadingOutline] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (courseId) {
      setLoadingCourse(true);
      getCoursesFn()
        .then((courses) => {
          const found = courses.find((c: any) => c.id === courseId);
          if (found) {
            setDbCourse(found);
          }
        })
        .catch(console.error)
        .finally(() => {
          setLoadingCourse(false);
        });

      getCourseLiveSessionsFn({ data: { courseId } })
        .then((sessions) => {
          const active = sessions.find((s: any) => s.status === "WAITING" || s.status === "LIVE");
          if (active) {
            setActiveLiveSession(active);
          }
        })
        .catch(console.error);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    const isPreview = sessionStorage.getItem("student_preview_mode") === "true";
    if (isPreview) {
      setEnrolled(true);
    } else {
      setEnrolled(isEnrolled(courseId));
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    const user = getCurrentUser();

    const loadOutlineData = async () => {
      try {
        setLoadingOutline(true);
        const mods = await getModulesByCourseFn({ data: { courseId } });
        setModules(mods);

        // Expand first module by default
        if (mods.length > 0) {
          setExpandedModules({ [mods[0].id]: true });
        }

        const settings = await getCourseSettingsFn({ data: { courseId } });
        setCourseSettings(settings);

        const isPreview = sessionStorage.getItem("student_preview_mode") === "true";

        if (isPreview) {
          try {
            const mockAtts = JSON.parse(sessionStorage.getItem("preview_attempts") || "[]");
            setAttempts(mockAtts);
          } catch {
            setAttempts([]);
          }
          try {
            const mockProg = JSON.parse(sessionStorage.getItem("preview_progress") || "{}");
            setCourseProgressMap(mockProg);
          } catch {
            setCourseProgressMap({});
          }
        } else if (user) {
          const atts = await getExamAttemptsFn({ data: { email: user.email } });
          setAttempts(atts);
          try {
            const progMap = await getCoursePlaybackProgressFn({
              data: { email: user.email, courseId },
            });
            setCourseProgressMap(progMap || {});
          } catch {}
        }

        const flatLessonsList = mods.flatMap((m: any) => m.lessons || []);
        const settingsMap: Record<string, any> = {};
        for (const les of flatLessonsList) {
          try {
            const ls = await getLessonSettingsFn({ data: { lessonId: les.id } });
            settingsMap[les.id] = ls;
          } catch {
            settingsMap[les.id] = { mustFinishExamBeforeVideo: false };
          }
        }
        setLessonSettingsMap(settingsMap);
      } catch (err: any) {
        console.error("Failed to load course outline:", err);
      } finally {
        setLoadingOutline(false);
      }
    };

    loadOutlineData();
  }, [courseId]);

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
        try {
          const mockProg = JSON.parse(sessionStorage.getItem("preview_progress") || "{}");
          setCourseProgressMap(mockProg);
        } catch {
          setCourseProgressMap({});
        }
      }
    };

    window.addEventListener("preview_progress_updated", handleSync);
    window.addEventListener("preview_attempts_updated", handleSync);
    return () => {
      window.removeEventListener("preview_progress_updated", handleSync);
      window.removeEventListener("preview_attempts_updated", handleSync);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "leaderboard" && courseId) {
      setLoadingLb(true);
      getLeaderboardFn({ data: { courseId } })
        .then((res: any) => {
          setLeaderboard(res);
        })
        .catch((err) => {
          toast.error("فشل تحميل لوحة الصدارة: " + err.message);
        })
        .finally(() => {
          setLoadingLb(false);
        });
    }
  }, [activeTab, courseId]);

  const course = useMemo(() => {
    const staticCourse = allCourses.find((c) => c.id === courseId);
    if (staticCourse) return staticCourse;
    if (dbCourse) {
      return {
        id: dbCourse.id,
        title: dbCourse.title,
        img:
          dbCourse.coverImage ||
          "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
        categories: dbCourse.category?.name || "عام",
        price: Number(dbCourse.price).toFixed(2),
        lectures: 0,
        featured: dbCourse.isFeatured,
        imgFit: "cover",
      };
    }
    return null;
  }, [courseId, dbCourse]);

  const flatLessons = useMemo(() => {
    return modules.flatMap((m) => (m.lessons || []).map((l: any) => ({ ...l, moduleId: m.id })));
  }, [modules]);

  const checkIsUnlocked = (lessonId: string) => {
    const idx = flatLessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) return false;
    const lesson = flatLessons[idx];

    // Preview / Free lessons are always unlocked
    if (lesson.isPreview || lesson.isFree) return true;

    // Student must be enrolled
    if (!enrolled) return false;

    // Sequential progress check
    const user = getCurrentUser();
    const userEmail = user?.email || "";
    const isSeq =
      courseSettings.sequentialMode === "FOR_ALL" ||
      (courseSettings.sequentialMode === "FOR_SELECTED_STUDENTS" &&
        courseSettings.selectedStudents?.includes(userEmail));

    if (isSeq && idx > 0) {
      for (let i = 0; i < idx; i++) {
        const prevLec = flatLessons[i];
        // Check if previous lesson has exams and student passed them
        if (prevLec.exams && prevLec.exams.length > 0) {
          for (const ex of prevLec.exams) {
            const passAttempt = attempts.find((att) => att.examId === ex.id && att.passed);
            if (!passAttempt) return false;
          }
        }
      }
    }
    return true;
  };

  const checkHasMandatoryExam = (lesson: any) => {
    const settings = lessonSettingsMap[lesson.id];
    if (settings?.mustFinishExamBeforeVideo && lesson.exams && lesson.exams.length > 0) {
      for (const ex of lesson.exams) {
        const passAttempt = attempts.find((att) => att.examId === ex.id && att.passed);
        if (!passAttempt) return true;
      }
    }
    return false;
  };

  const getPrevLesson = (lessonId: string) => {
    const idx = flatLessons.findIndex((l) => l.id === lessonId);
    if (idx > 0) {
      return flatLessons[idx - 1];
    }
    return null;
  };

  const handleOpenBlocker = () => {
    if (targetLockedLesson) {
      const prev = getPrevLesson(targetLockedLesson.id);
      if (prev) {
        setLockAlertOpen(false);
        openLecture(prev);
      }
    }
  };

  const openLecture = (lesson: any) => {
    const unlocked = checkIsUnlocked(lesson.id);
    if (!unlocked) {
      if (!enrolled) {
        setBuyOpen(true);
      } else {
        setTargetLockedLesson(lesson);
        setLockAlertOpen(true);
      }
      return;
    }

    const lec: Lecture = {
      id: lesson.id,
      title: lesson.title,
      isFree: lesson.isPreview || lesson.isFree,
      videoUrl: lesson.videoMetadata?.videoUrl || "",
      videoId: lesson.videoMetadata?.videoId || undefined,
      thumbnailUrl: lesson.videoMetadata?.thumbnailUrl || undefined,
      status: lesson.videoMetadata?.status || undefined,
      duration: lesson.videoMetadata?.duration || undefined,
      hasMandatoryExam: checkHasMandatoryExam(lesson),
      exams: (lesson.exams || []).map((e: any) => ({ id: e.id, title: e.title })),
      attachments: (lesson.lessonAttachments || []).map((a: any) => ({
        id: a.id,
        title: a.name,
        url: a.fileUrl,
      })),
    };

    setActiveLec(lec);
    setLecOpen(true);
  };

  // Netflix-style video navigation handlers
  const currentIdx = activeLec ? flatLessons.findIndex((l) => l.id === activeLec.id) : -1;
  const hasNext = currentIdx !== -1 && currentIdx < flatLessons.length - 1;
  const hasPrevious = currentIdx > 0;

  const handleNextLec = () => {
    if (hasNext) {
      const nextLesson = flatLessons[currentIdx + 1];
      openLecture(nextLesson);
    }
  };

  const handlePrevLec = () => {
    if (hasPrevious) {
      const prevLesson = flatLessons[currentIdx - 1];
      openLecture(prevLesson);
    }
  };

  // Find last viewed lesson for Resume Learning
  const lastViewedLesson = useMemo(() => {
    if (!enrolled) return null;
    let newestProgress: any = null;
    let newestLessonId: string | null = null;

    for (const [lesId, prog] of Object.entries(courseProgressMap)) {
      if (prog.watchedPercentage > 0) {
        if (
          !newestProgress ||
          new Date(prog.lastViewedAt) > new Date(newestProgress.lastViewedAt)
        ) {
          newestProgress = prog;
          newestLessonId = lesId;
        }
      }
    }

    if (newestLessonId) {
      const lesson = flatLessons.find((l) => l.id === newestLessonId);
      if (lesson) {
        const module = modules.find((m) => m.id === lesson.moduleId);
        return {
          lesson,
          module,
          progress: newestProgress,
        };
      }
    }
    return null;
  }, [courseProgressMap, flatLessons, modules, enrolled]);

  // Overall course progress
  const progressStats = useMemo(() => {
    const total = flatLessons.length;
    if (total === 0) return { total: 0, completed: 0, percentage: 0 };
    const completed = flatLessons.filter((l) => {
      const p = courseProgressMap[l.id];
      return p && p.watchedPercentage >= 90;
    }).length;
    const percentage = Math.round((completed / total) * 100);
    return { total, completed, percentage };
  }, [flatLessons, courseProgressMap]);

  // Extract all exams for the Exams Tab
  const allExams = useMemo(() => {
    const list: any[] = [];
    modules.forEach((mod) => {
      (mod.lessons || []).forEach((les: any) => {
        (les.exams || []).forEach((ex: any) => {
          list.push({
            ...ex,
            lessonId: les.id,
            lessonTitle: les.title,
            moduleTitle: mod.title,
          });
        });
      });
    });
    return list;
  }, [modules]);

  // Extract all attachments for the Attachments Tab
  const allAttachments = useMemo(() => {
    const list: any[] = [];
    modules.forEach((mod) => {
      (mod.lessons || []).forEach((les: any) => {
        (les.lessonAttachments || []).forEach((a: any) => {
          list.push({
            ...a,
            lessonId: les.id,
            lessonTitle: les.title,
            moduleTitle: mod.title,
          });
        });
      });
    });
    return list;
  }, [modules]);

  // Teacher Info
  const teacherInfo = useMemo(() => {
    if (dbCourse && dbCourse.instructors && dbCourse.instructors.length > 0) {
      const instr = dbCourse.instructors[0].instructor;
      return {
        name: instr.profile?.name || instr.email,
        avatar: instr.profile?.avatarUrl || "",
        bio: instr.profile?.biography || "",
      };
    }
    return {
      name: "أ. مصطفى الشافعي",
      avatar: "",
      bio: "خبير تدريس المواد العلمية والـ IQ بخبرة تزيد عن ١٠ سنوات.",
    };
  }, [dbCourse]);

  const price = Number(course?.price) || 0;

  // Attachment download handler
  const handleDownloadAttachment = async (att: any) => {
    const user = getCurrentUser();
    if (user) {
      trackDownloadFn({
        data: {
          attachmentId: att.id,
          studentEmail: user.email,
        },
      })
        .then(() => {
          toast.success(`بدء تحميل الملف: ${att.name}`);
        })
        .catch((err) => {
          console.error("Failed to track download:", err);
        });

      logDownloadFn({
        data: {
          email: user.email,
          fileName: att.name,
          courseTitle: course?.title || "",
          fileSize: att.fileSize || "N/A",
        },
      }).catch(console.error);
    }
    window.open(att.fileUrl, "_blank");
  };

  // Find current user's entry in leaderboard
  const myEntry = useMemo(() => {
    const user = getCurrentUser();
    if (!user || !leaderboard || !leaderboard.entries) return null;
    return leaderboard.entries.find((e: any) => e.studentEmail === user.email) || null;
  }, [leaderboard]);

  // Top 3 Podium mapping
  const podium = useMemo(() => {
    if (!leaderboard || !leaderboard.entries) return [];
    const entries = leaderboard.entries.slice(0, 3);
    const sorted: any[] = [];
    if (entries[1]) sorted.push(entries[1]);
    if (entries[0]) sorted.push(entries[0]);
    if (entries[2]) sorted.push(entries[2]);
    return sorted;
  }, [leaderboard]);

  if (loadingCourse || loadingOutline) {
    // Elegant Skeleton Loader
    return (
      <div className="mx-auto max-w-5xl space-y-6 text-end" dir="rtl">
        {/* Header Skeleton */}
        <div className="h-10 w-48 bg-secondary/40 rounded-xl animate-pulse self-start mb-4"></div>
        <div className="grid gap-6 rounded-3xl border border-border/40 bg-card p-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-5 w-24 bg-secondary/50 rounded-md animate-pulse"></div>
              <div className="h-10 w-3/4 bg-secondary/50 rounded-xl animate-pulse"></div>
              <div className="h-4 w-1/2 bg-secondary/40 rounded-md animate-pulse"></div>
              <div className="flex gap-4 mt-6">
                <div className="h-8 w-20 bg-secondary/40 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-secondary/40 rounded-md animate-pulse"></div>
                <div className="h-8 w-20 bg-secondary/40 rounded-md animate-pulse"></div>
              </div>
            </div>
            <div className="h-12 w-full bg-secondary/50 rounded-2xl animate-pulse mt-4"></div>
          </div>
          <div className="aspect-[4/3] w-full bg-secondary/50 rounded-2xl animate-pulse"></div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-12 w-full bg-secondary/30 rounded-2xl animate-pulse"></div>
          <div className="h-16 w-full bg-secondary/40 rounded-2xl animate-pulse"></div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 bg-secondary/35 rounded-3xl animate-pulse border border-border/30"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div
        className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-card"
        dir="rtl"
      >
        <p className="text-foreground">الدورة غير متاحة</p>
        <Link
          to="/app/courses"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          العودة للدورات
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-end font-sans" dir="rtl">
      {/* Top Breadcrumb Navigation */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1 bg-secondary/35 p-1 rounded-2xl border border-border/30">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "leaderboard"
                ? "bg-card text-foreground shadow-sm border border-border/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="size-3.5 text-amber-500" />
            <span>لوحة الصدارة</span>
          </button>
          <button
            onClick={() => setActiveTab("live")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "live"
                ? "bg-card text-foreground shadow-sm border border-border/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="size-3.5 text-red-500" />
            <span>البث المباشر</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "files"
                ? "bg-card text-foreground shadow-sm border border-border/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Paperclip className="size-3.5 text-emerald-500" />
            <span>المرفقات</span>
          </button>
          <button
            onClick={() => setActiveTab("exams")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "exams"
                ? "bg-card text-foreground shadow-sm border border-border/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="size-3.5 text-blue-500" />
            <span>الامتحانات</span>
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "videos"
                ? "bg-card text-foreground shadow-sm border border-border/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PlayCircle className="size-3.5 text-primary" />
            <span>الفيديوهات</span>
          </button>
        </div>

        <Link
          to="/app/courses"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
        >
          العودة للدورات <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Resume Learning Widget */}
      {enrolled && lastViewedLesson && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 backdrop-blur shadow-sm animate-fade-in"
        >
          <button
            onClick={() => openLecture(lastViewedLesson.lesson)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs transition-all flex items-center justify-center gap-2"
          >
            <PlayCircle className="size-4 fill-neutral-950 text-neutral-950" />
            <span>متابعة</span>
          </button>
          <div className="text-center sm:text-right">
            <h4 className="text-xs font-bold text-foreground">استكمل التعلم</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              آخر مشاهدة:{" "}
              <span className="font-bold text-foreground">
                {lastViewedLesson.module?.title || "الوحدة"}
              </span>{" "}
              - {lastViewedLesson.lesson?.title}
            </p>
          </div>
        </motion.div>
      )}

      {/* Hero Section Redesign */}
      <div className="grid gap-6 rounded-3xl border border-border/40 bg-card p-6 shadow-card md:grid-cols-[1fr_320px]">
        {/* Left Column Details */}
        <div className="space-y-4 text-end flex flex-col justify-between">
          <div className="space-y-3">
            {/* Subject/Grade Tags */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold text-primary">
                <BookOpen className="size-3" /> رياضيات
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                <Calendar className="size-3" /> الثالث الثانوي
              </span>
              {course.featured && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
                  <Star className="size-3 fill-accent" /> مميز
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display text-2xl font-black text-foreground md:text-3xl leading-snug">
              {course.title}
            </h1>

            {/* Premium 5-Column Grid Meta Indicators */}
            <div
              className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-y border-border/40 py-4 my-2"
              dir="rtl"
            >
              <div className="bg-secondary/20 p-2.5 rounded-2xl text-center border border-border/30 flex flex-col items-center justify-center gap-0.5">
                <span className="text-amber-500 text-xs">⭐⭐⭐⭐⭐</span>
                <span className="text-[9px] text-muted-foreground font-semibold">تقييم الدورة</span>
                <span className="font-black text-xs text-foreground">4.9</span>
              </div>
              <div className="bg-secondary/20 p-2.5 rounded-2xl text-center border border-border/30 flex flex-col items-center justify-center gap-0.5">
                <span className="text-foreground text-xs">👥</span>
                <span className="text-[9px] text-muted-foreground font-semibold">عدد الطلاب</span>
                <span className="font-black text-xs text-foreground">1250 طالب</span>
              </div>
              <div className="bg-secondary/20 p-2.5 rounded-2xl text-center border border-border/30 flex flex-col items-center justify-center gap-0.5">
                <span className="text-foreground text-xs">⏱</span>
                <span className="text-[9px] text-muted-foreground font-semibold">مدة الدورة</span>
                <span className="font-black text-xs text-foreground">38 ساعة</span>
              </div>
              <div className="bg-secondary/20 p-2.5 rounded-2xl text-center border border-border/30 flex flex-col items-center justify-center gap-0.5">
                <span className="text-foreground text-xs">🎥</span>
                <span className="text-[9px] text-muted-foreground font-semibold">عدد الدروس</span>
                <span className="font-black text-xs text-foreground">
                  {flatLessons.length > 0 ? flatLessons.length : 64} محاضرة
                </span>
              </div>
              <div className="bg-secondary/20 p-2.5 rounded-2xl text-center border border-border/30 flex flex-col items-center justify-center gap-0.5 col-span-2 sm:col-span-1">
                <span className="text-foreground text-xs">📅</span>
                <span className="text-[9px] text-muted-foreground font-semibold">آخر تحديث</span>
                <span className="font-black text-xs text-foreground">يونيو 2026</span>
              </div>
            </div>

            {/* Teacher Details */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">مدرس المادة</span>
                <span className="text-xs font-bold text-foreground">{teacherInfo.name}</span>
              </div>
              <div className="size-9 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground text-xs overflow-hidden border border-border/50">
                {teacherInfo.avatar ? (
                  <img
                    src={teacherInfo.avatar}
                    alt={teacherInfo.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <Users className="size-4.5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expandable Course Description */}
            <div className="pt-2">
              <p
                className={`text-xs text-muted-foreground leading-relaxed transition-all duration-300 ${
                  descriptionExpanded ? "" : "line-clamp-2"
                }`}
              >
                {dbCourse?.description || course.categories}
              </p>
              <button
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="text-[10px] font-bold text-primary hover:underline mt-1 block"
              >
                {descriptionExpanded ? "عرض أقل" : "عرض المزيد..."}
              </button>
            </div>
          </div>

          {/* Enrolled/Progress Widget */}
          {enrolled && progressStats.total > 0 && (
            <div className="space-y-3 pt-3 border-t border-border/30 text-right">
              <div className="flex justify-between items-end">
                <div className="text-left">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Progress
                  </span>
                  <span className="text-2xl font-black text-amber-500 leading-none">
                    {progressStats.percentage}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground">
                    أكملت {progressStats.completed} من {progressStats.total} محاضرة
                  </span>
                </div>
              </div>
              <div className="w-full bg-secondary/60 rounded-full h-3 overflow-hidden border border-border/30 shadow-inner">
                <div
                  className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressStats.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column Cover Image & Buy Button */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/40 aspect-[4/3] bg-neutral-950 shadow-lg">
            <img
              src={course.img}
              alt={course.title}
              className={`size-full ${course.imgFit === "contain" ? "object-contain p-6" : "object-cover"}`}
            />
          </div>
          <div>
            {!enrolled ? (
              <button
                onClick={() => setBuyOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="size-4.5 stroke-[3]" /> الحصول على الدورة ({course.price} جنيه)
              </button>
            ) : (
              <div className="w-full py-3.5 rounded-2xl border border-success/30 bg-success/5 text-success text-center text-xs font-black">
                أنت مشترك في هذه الدورة — المحتوى مفتوح
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Tabs Content */}
      <AnimatePresence mode="wait">
        {activeTab === "videos" && (
          <motion.div
            key="videos"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {activeLiveSession && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-red-500/30 bg-red-500/5 p-5 backdrop-blur-md shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 animate-pulse">
                    <Radio className="size-5" />
                  </div>
                  <div className="text-right">
                    <h4 className="font-display text-xs font-bold text-foreground">
                      بث مباشر نشط الآن 🔴
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeLiveSession.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigate({ to: `/app/live/${activeLiveSession.id}` });
                  }}
                  className="rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-bold text-white shadow-card transition-all"
                >
                  انضم للبث المباشر
                </button>
              </div>
            )}

            {modules.length === 0 ? (
              <div className="rounded-3xl border border-border/40 bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
                لم يتم إضافة وحدات تعليمية لهذه الدورة بعد.
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((mod) => {
                  const isExpanded = !!expandedModules[mod.id];
                  const activeLessons = mod.lessons || [];

                  return (
                    <div
                      key={mod.id}
                      className="rounded-3xl border border-border/40 bg-card shadow-card overflow-hidden transition-all duration-200"
                    >
                      {/* Module Header Collapsible Accordion */}
                      <button
                        onClick={() =>
                          setExpandedModules((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))
                        }
                        className="flex w-full items-center justify-between p-5 bg-secondary/35 hover:bg-secondary/50 transition-all text-right border-b border-border/30"
                      >
                        <ChevronDown
                          className={`size-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        />
                        <div className="flex items-center gap-3">
                          <BookOpen className="size-4.5 text-primary" />
                          <span className="font-display text-sm font-black text-foreground">
                            {mod.title}
                          </span>
                          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-lg text-muted-foreground font-bold">
                            {activeLessons.length} دروس
                          </span>
                        </div>
                      </button>

                      {/* Lessons Cards Accordion Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-5 bg-card/50">
                              {activeLessons.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-4">
                                  لا توجد دروس مضافة في هذه الوحدة.
                                </p>
                              ) : (
                                <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                                  {activeLessons.map((les: any) => {
                                    const unlocked = checkIsUnlocked(les.id);
                                    const hasExams = les.exams && les.exams.length > 0;
                                    const hasAttachments =
                                      les.lessonAttachments && les.lessonAttachments.length > 0;
                                    const hasPdf =
                                      hasAttachments &&
                                      les.lessonAttachments.some(
                                        (a: any) =>
                                          a.name?.toLowerCase().endsWith(".pdf") ||
                                          a.fileType?.toLowerCase().includes("pdf"),
                                      );
                                    const isFreeOrPreview = les.isPreview || les.isFree;
                                    const progress = courseProgressMap[les.id];

                                    const isCompleted =
                                      progress && progress.watchedPercentage >= 90;
                                    const isUnfinished =
                                      progress &&
                                      progress.watchedPercentage > 0 &&
                                      progress.watchedPercentage < 90;

                                    return (
                                      <motion.div
                                        key={les.id}
                                        whileHover={unlocked ? { scale: 1.02 } : {}}
                                        className={`group relative flex flex-col justify-between rounded-3xl border border-border/40 bg-card shadow-xl overflow-hidden transition-all duration-300 ${
                                          unlocked
                                            ? "cursor-pointer hover:shadow-2xl"
                                            : "opacity-60"
                                        }`}
                                        onClick={() => openLecture(les)}
                                      >
                                        {/* Card Thumbnail */}
                                        <div className="relative aspect-video bg-neutral-950 overflow-hidden select-none">
                                          {les.videoMetadata?.thumbnailUrl ? (
                                            <img
                                              src={les.videoMetadata.thumbnailUrl}
                                              alt={les.title}
                                              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                          ) : (
                                            <div className="size-full bg-gradient-to-br from-primary/10 to-accent/15 flex items-center justify-center">
                                              <PlayCircle className="size-10 text-primary/45 group-hover:scale-110 transition-transform" />
                                            </div>
                                          )}

                                          {/* Watch Progress Line Bar */}
                                          {progress && progress.watchedPercentage > 0 && (
                                            <div className="absolute bottom-0 right-0 left-0 bg-neutral-800/80 h-1.5 z-10">
                                              <div
                                                className="h-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600"
                                                style={{ width: `${progress.watchedPercentage}%` }}
                                              ></div>
                                            </div>
                                          )}

                                          {/* Duration Badge */}
                                          {les.videoMetadata?.duration && (
                                            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white z-10 backdrop-blur-sm border border-white/10">
                                              <Clock className="size-3 text-amber-500" />
                                              <span>
                                                {(() => {
                                                  const dur = les.videoMetadata.duration;
                                                  const mins = Math.floor(dur / 60);
                                                  const secs = dur % 60;
                                                  return `${mins}:${secs.toString().padStart(2, "0")}`;
                                                })()}
                                              </span>
                                            </span>
                                          )}

                                          {/* State Indicators (Locked/Preview/Completed) */}
                                          <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 items-end">
                                            {isCompleted && (
                                              <span
                                                className="inline-flex size-6 items-center justify-center rounded-full bg-success text-success-foreground shadow-md font-bold text-xs border border-white/20 animate-fade-in"
                                                title="مكتمل"
                                              >
                                                ✔
                                              </span>
                                            )}
                                            {isFreeOrPreview && (
                                              <span className="inline-flex items-center rounded-full bg-purple-600 px-2.5 py-0.5 text-[8px] font-black text-white uppercase shadow-md border border-purple-400/30">
                                                معاينة مجانية
                                              </span>
                                            )}
                                            {!unlocked && (
                                              <span className="inline-flex size-7 items-center justify-center rounded-full bg-neutral-900/95 text-white shadow-md border border-white/10">
                                                <Lock className="size-3.5" />
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Card Text & Meta details */}
                                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-right">
                                          <h5 className="font-display text-xs font-black text-foreground line-clamp-2 leading-relaxed">
                                            {les.title}
                                          </h5>

                                          {/* Bottom items tags */}
                                          <div className="flex items-center justify-end gap-2 border-t border-border/20 pt-2 text-[9px] text-muted-foreground font-bold">
                                            {hasPdf && (
                                              <span className="flex items-center gap-0.5 bg-red-500/5 text-red-500 border border-red-500/10 px-1.5 py-0.5 rounded">
                                                📄 PDF
                                              </span>
                                            )}
                                            {hasExams && (
                                              <span className="flex items-center gap-0.5 bg-blue-500/5 text-blue-500 border border-blue-500/10 px-1.5 py-0.5 rounded">
                                                📝 اختبار
                                              </span>
                                            )}
                                            {hasAttachments && (
                                              <span className="flex items-center gap-0.5 bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 px-1.5 py-0.5 rounded">
                                                📎 مرفقات
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Exams */}
        {activeTab === "exams" && (
          <motion.div
            key="exams"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {allExams.length === 0 ? (
              <div className="rounded-3xl border border-border/40 bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
                لا توجد امتحانات مضافة لهذه الدورة بعد.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allExams.map((ex) => {
                  // Check status
                  const attempt = attempts.find((att) => att.examId === ex.id);
                  const isPassed = attempt?.passed;
                  const isStarted = !!attempt;

                  let statusText = "لم يبدأ";
                  let statusColor = "bg-neutral-500/10 text-neutral-500 border-neutral-500/20";
                  let resultLabel = "لم يبدأ";
                  if (isStarted) {
                    if (isPassed) {
                      statusText = "ناجح ✓";
                      statusColor = "bg-success/10 text-success border-success/20";
                      resultLabel = `ناجح ✓ (${attempt.score}%)`;
                    } else {
                      statusText = "راسب ❌";
                      statusColor = "bg-destructive/10 text-destructive border-destructive/20";
                      resultLabel = `راسب ❌ (${attempt.score}%)`;
                    }
                  }

                  return (
                    <div
                      key={ex.id}
                      className="rounded-3xl border border-border/40 bg-card p-5 shadow-xl flex flex-col justify-between gap-4 text-right transition-all hover:scale-[1.01] hover:border-border/60"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-lg border text-[9px] font-bold ${statusColor}`}
                          >
                            {statusText}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {ex.moduleTitle}
                          </span>
                        </div>

                        <h4 className="font-display text-sm font-black text-foreground line-clamp-1">
                          {ex.title}
                        </h4>

                        <div className="text-xs space-y-1 bg-secondary/15 p-3 rounded-2xl border border-border/20">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-foreground">{resultLabel}</span>
                            <span className="text-muted-foreground">النتيجة:</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-foreground">{ex.passScore || 70}%</span>
                            <span className="text-muted-foreground">درجة النجاح:</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 text-[10px] text-muted-foreground pt-1.5 border-t border-border/20">
                          <span>⏱ {ex.durationLimit || 30} دقيقة</span>
                          <span>📝 {ex.questions?.length || 10} أسئلة</span>
                        </div>
                      </div>

                      <Link
                        to="/app/exams"
                        search={{ examId: ex.id }}
                        className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-center text-xs transition-all shadow-md block"
                      >
                        ابدأ الامتحان
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Attachments */}
        {activeTab === "files" && (
          <motion.div
            key="files"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-4"
          >
            {allAttachments.length === 0 ? (
              <div className="rounded-3xl border border-border/40 bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
                لا توجد مرفقات أو ملفات مضافة لهذه الدورة بعد.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allAttachments.map((a) => {
                  const isPdf =
                    a.fileType?.toLowerCase().includes("pdf") ||
                    a.name?.toLowerCase().includes(".pdf");
                  const isZip =
                    a.fileType?.toLowerCase().includes("zip") ||
                    a.name?.toLowerCase().includes(".zip");

                  let typeLabel = "ملف";
                  let typeColor = "bg-neutral-500/10 text-neutral-500 border-neutral-550/20";
                  if (isPdf) {
                    typeLabel = "PDF";
                    typeColor = "bg-red-500/10 text-red-500 border-red-500/20";
                  } else if (isZip) {
                    typeLabel = "ZIP";
                    typeColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                  }

                  return (
                    <div
                      key={a.id}
                      className="rounded-3xl border border-border/40 bg-card p-5 shadow-xl flex flex-col justify-between gap-4 text-right transition-all hover:scale-[1.01] hover:border-border/60"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center gap-2">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-lg border text-[9px] font-bold ${typeColor}`}
                          >
                            {typeLabel}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[150px]">
                            {a.lessonTitle}
                          </span>
                        </div>

                        <h4
                          className="font-display text-xs font-black text-foreground line-clamp-2 leading-relaxed"
                          title={a.name}
                        >
                          {a.name}
                        </h4>

                        <div className="flex justify-end gap-3 text-[10px] text-muted-foreground pt-2 border-t border-border/20">
                          <span>حجم الملف: {a.fileSize || "٢.٥ ميجابايت"}</span>
                          <span>⬇️ تم تحميله {a.downloadCount || 12} مرة</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadAttachment(a)}
                        className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-center text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Download className="size-3.5" /> تحميل
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Live Sessions */}
        {activeTab === "live" && (
          <motion.div
            key="live"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div>
              <h3 className="font-display text-sm font-black text-foreground mb-3 flex items-center gap-1.5 justify-end">
                <span className="size-2 rounded-full bg-red-500 animate-ping"></span>
                <span>مباشر الآن 🔴</span>
              </h3>
              {activeLiveSession ? (
                <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-right">
                  <div className="text-center md:text-right space-y-1 flex-1">
                    <h4 className="font-display text-base font-black text-foreground">
                      {activeLiveSession.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      الشرح المباشر للمراجعة النهائية - بدأ منذ 15 دقيقة
                    </p>
                  </div>
                  <button
                    onClick={() => navigate({ to: `/app/live/${activeLiveSession.id}` })}
                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-lg shrink-0 flex items-center justify-center gap-2"
                  >
                    <Radio className="size-4" /> انضم الآن
                  </button>
                </div>
              ) : (
                <div className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-right">
                  <div className="text-center md:text-right space-y-1 flex-1">
                    <h4 className="font-display text-base font-black text-foreground">
                      الشرح المباشر للمراجعة النهائية
                    </h4>
                    <p className="text-xs text-muted-foreground">بدأ منذ 15 دقيقة</p>
                  </div>
                  <button
                    onClick={() => toast.info("سينطلق البث المباشر قريباً")}
                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-lg shrink-0 flex items-center justify-center gap-2"
                  >
                    <Radio className="size-4" /> انضم الآن
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming live schedules list */}
            <div className="space-y-4">
              <h3 className="font-display text-sm font-black text-foreground mb-2 flex justify-end">
                البث المباشر القادم 📅
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/40 bg-card p-5 shadow-xl flex items-center justify-between gap-4 text-right">
                  <button
                    onClick={() => {
                      toast.success("تم إضافة موعد البث لتقويمك بنجاح");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/70 text-xs font-bold transition-all shrink-0"
                  >
                    إضافة للتقويم
                  </button>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-amber-500 font-black block">
                      غداً 7:00 مساءً
                    </span>
                    <h4 className="font-display text-xs font-black text-foreground">
                      حل امتحان شامل
                    </h4>
                  </div>
                </div>
                <div className="rounded-3xl border border-border/40 bg-card p-5 shadow-xl flex items-center justify-between gap-4 text-right opacity-80">
                  <button
                    onClick={() => {
                      toast.success("تم إضافة موعد البث لتقويمك بنجاح");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/70 text-xs font-bold transition-all shrink-0"
                  >
                    إضافة للتقويم
                  </button>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] text-amber-500 font-black block">
                      الأربعاء المقبل 6:00 مساءً
                    </span>
                    <h4 className="font-display text-xs font-black text-foreground">
                      جلسة نقاش وحل أسئلة بنك المعرفة
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Leaderboard */}
        {activeTab === "leaderboard" && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {loadingLb ? (
              <div className="rounded-3xl border border-border bg-card p-12 text-center text-sm text-muted-foreground shadow-card animate-pulse">
                جاري تحميل لوحة الصدارة وحساب النقاط والترتيب…
              </div>
            ) : leaderboard?.isHidden ? (
              <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-card">
                لوحة صدارة الطلاب غير مفعلة لهذه الدورة حالياً من قبل المعلم.
              </div>
            ) : (
              <div className="space-y-6">
                {/* My Stats Card */}
                {myEntry && (
                  <div className="rounded-3xl border border-border bg-gradient-to-r from-primary/5 to-accent/5 p-5 shadow-card grid gap-4 sm:grid-cols-4">
                    <div className="text-center sm:text-start flex flex-col justify-between sm:border-e border-border/80 pr-2">
                      <span className="text-[10px] text-muted-foreground block font-bold">
                        ترتيبك في الدورة
                      </span>
                      <div className="font-display text-2xl font-black text-primary mt-2 flex items-center justify-center sm:justify-start gap-1">
                        {myEntry.medal === "GOLD" && "🥇 "}
                        {myEntry.medal === "SILVER" && "🥈 "}
                        {myEntry.medal === "BRONZE" && "🥉 "}#{myEntry.rank}
                      </div>
                    </div>

                    <div className="text-center sm:text-start flex flex-col justify-between sm:border-e border-border/80 px-2">
                      <span className="text-[10px] text-muted-foreground block font-bold">
                        مجموع نقاطك
                      </span>
                      <div className="font-display text-2xl font-black text-foreground mt-2">
                        {myEntry.points.toFixed(2)} ن
                      </div>
                    </div>

                    <div className="text-center sm:text-start flex flex-col justify-between sm:border-e border-border/80 px-2">
                      <span className="text-[10px] text-muted-foreground block font-bold">
                        نقاط الامتحانات (40%)
                      </span>
                      <div className="font-display text-lg font-bold text-foreground mt-2">
                        {myEntry.examsPoints.toFixed(2)} ن
                      </div>
                    </div>

                    <div className="text-center sm:text-start flex flex-col justify-between px-2">
                      <span className="text-[10px] text-muted-foreground block font-bold">
                        نسبة إنجاز المحاضرات (60%)
                      </span>
                      <div className="font-display text-lg font-bold text-foreground mt-2">
                        {((myEntry.courseCompPoints || 0) * 10).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Podium Top 3 */}
                {podium.length > 0 && (
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
                    <h3 className="font-display text-xs font-black text-foreground mb-6 text-center flex items-center justify-center gap-1.5">
                      <Sparkles className="size-4.5 text-amber-500 animate-pulse" />
                      <span>منصة التتويج - الثلاثة الأوائل</span>
                    </h3>

                    <div className="flex items-end justify-center gap-4 pt-10 pb-4 max-w-md mx-auto">
                      {/* 2nd Place */}
                      {podium[0] && podium.length >= 2 && (
                        <div className="flex flex-col items-center flex-1 text-center">
                          <div className="relative">
                            <span className="absolute -top-3 -right-3 text-xl">🥈</span>
                            <div className="size-14 rounded-full border-2 border-slate-350 bg-secondary flex items-center justify-center font-bold text-foreground text-sm overflow-hidden shadow">
                              {podium[0].studentAvatar ? (
                                <img
                                  src={podium[0].studentAvatar}
                                  alt={podium[0].studentName}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Users className="size-6 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-foreground mt-2 truncate max-w-[90px]">
                            {podium[0].studentName}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {podium[0].points.toFixed(2)} ن
                          </span>
                          <div className="w-16 h-16 bg-slate-100 dark:bg-neutral-800 rounded-t-2xl mt-3 border-t border-x border-border flex items-center justify-center font-black text-slate-400">
                            2
                          </div>
                        </div>
                      )}

                      {/* 1st Place */}
                      {((podium.length === 1 && podium[0]) || (podium.length > 1 && podium[1])) && (
                        <div className="flex flex-col items-center flex-1 text-center">
                          <div className="relative">
                            <span className="absolute -top-4 -right-3 text-2xl animate-bounce">
                              👑
                            </span>
                            <div className="size-18 rounded-full border-2 border-amber-400 bg-secondary flex items-center justify-center font-bold text-foreground text-sm overflow-hidden shadow-lg">
                              {podium.length === 1 ? (
                                podium[0].studentAvatar ? (
                                  <img
                                    src={podium[0].studentAvatar}
                                    alt={podium[0].studentName}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <Users className="size-7 text-muted-foreground" />
                                )
                              ) : podium[1].studentAvatar ? (
                                <img
                                  src={podium[1].studentAvatar}
                                  alt={podium[1].studentName}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Users className="size-7 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-black text-foreground mt-2 truncate max-w-[100px]">
                            {podium.length === 1 ? podium[0].studentName : podium[1].studentName}
                          </span>
                          <span className="text-[10px] text-amber-500 font-bold">
                            {podium.length === 1
                              ? podium[0].points.toFixed(2)
                              : podium[1].points.toFixed(2)}{" "}
                            ن
                          </span>
                          <div className="w-20 h-24 bg-amber-500/10 dark:bg-amber-500/5 rounded-t-2xl mt-3 border-t border-x border-amber-400 flex items-center justify-center font-black text-amber-500 text-lg">
                            1
                          </div>
                        </div>
                      )}

                      {/* 3rd Place */}
                      {((podium.length === 2 && podium[1]) || (podium.length > 2 && podium[2])) && (
                        <div className="flex flex-col items-center flex-1 text-center">
                          <div className="relative">
                            <span className="absolute -top-3 -right-3 text-xl">🥉</span>
                            <div className="size-13 rounded-full border-2 border-amber-600 bg-secondary flex items-center justify-center font-bold text-foreground text-sm overflow-hidden shadow">
                              {podium.length === 2 ? (
                                podium[1].studentAvatar ? (
                                  <img
                                    src={podium[1].studentAvatar}
                                    alt={podium[1].studentName}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <Users className="size-5 text-muted-foreground" />
                                )
                              ) : podium[2].studentAvatar ? (
                                <img
                                  src={podium[2].studentAvatar}
                                  alt={podium[2].studentName}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <Users className="size-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-foreground mt-2 truncate max-w-[90px]">
                            {podium.length === 2 ? podium[1].studentName : podium[2].studentName}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-semibold">
                            {podium.length === 2
                              ? podium[1].points.toFixed(2)
                              : podium[2].points.toFixed(2)}{" "}
                            ن
                          </span>
                          <div className="w-16 h-12 bg-amber-700/10 dark:bg-neutral-800 rounded-t-2xl mt-3 border-t border-x border-border flex items-center justify-center font-black text-amber-700">
                            3
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Rankings list */}
                <div className="rounded-3xl border border-border/40 bg-card shadow-card overflow-hidden">
                  <div className="p-5 border-b border-border bg-card flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">
                      مرتبة تنازلياً حسب إجمالي النقاط
                    </span>
                    <h3 className="font-display text-xs font-black text-foreground flex items-center gap-1.5">
                      <Medal className="size-4.5 text-primary" />
                      <span>قائمة المتفوقين في الكورس</span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-end text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30 text-muted-foreground font-bold">
                          <th className="px-5 py-3 text-start">الميدالية</th>
                          <th className="px-5 py-3 text-start">إجمالي النقاط</th>
                          <th className="px-5 py-3 text-start">المحاضرات المكتملة</th>
                          <th className="px-5 py-3 text-start">نسبة الإنجاز</th>
                          <th className="px-5 py-3">الطالب</th>
                          <th className="px-5 py-3">الترتيب</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {leaderboard.entries.map((e: any) => {
                          const lecturesCompleted = Math.round(
                            ((e.courseCompPoints || 0) * progressStats.total) / 10,
                          );
                          const completionRatePct = Math.round((e.courseCompPoints || 0) * 10);

                          return (
                            <tr
                              key={e.id}
                              className={`hover:bg-secondary/15 ${
                                e.studentEmail === myEntry?.studentEmail
                                  ? "bg-primary/5 font-bold"
                                  : ""
                              }`}
                            >
                              <td className="px-5 py-3 text-start">
                                {e.medal === "GOLD"
                                  ? "🥇 ذهبية"
                                  : e.medal === "SILVER"
                                    ? "🥈 فضية"
                                    : e.medal === "BRONZE"
                                      ? "🥉 برونزية"
                                      : "—"}
                              </td>
                              <td className="px-5 py-3 font-black text-primary text-start">
                                {e.points.toFixed(2)} ن
                              </td>
                              <td className="px-5 py-3 text-muted-foreground text-start">
                                {lecturesCompleted} محاضرة
                              </td>
                              <td className="px-5 py-3 text-muted-foreground text-start">
                                {completionRatePct}%
                              </td>
                              <td className="px-5 py-3 font-semibold text-foreground flex items-center justify-end gap-2">
                                <span>{e.studentName}</span>
                                <div className="size-6 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground text-[10px] overflow-hidden">
                                  {e.studentAvatar ? (
                                    <img
                                      src={e.studentAvatar}
                                      alt={e.studentName}
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <Users className="size-3 text-muted-foreground" />
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3 font-bold text-foreground">#{e.rank}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locked Lesson Warning Modal Dialog */}
      <Dialog open={lockAlertOpen} onOpenChange={setLockAlertOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-md rounded-3xl p-6 bg-card border border-border/80 text-end shadow-elevated focus:outline-none"
        >
          <DialogHeader className="text-right">
            <DialogTitle className="font-display text-lg font-black text-destructive flex items-center justify-end gap-2">
              <span>المحاضرة مغلقة 🔒</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-xs leading-relaxed text-muted-foreground space-y-3">
            <p>يجب إكمال الدرس السابق أولاً.</p>
            {targetLockedLesson && getPrevLesson(targetLockedLesson.id) && (
              <p className="font-bold text-foreground">
                المحاضرة المطلوبة: {getPrevLesson(targetLockedLesson.id)?.title}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setLockAlertOpen(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-border hover:bg-secondary/40 text-muted-foreground transition-all"
            >
              إلغاء
            </button>
            <button
              onClick={handleOpenBlocker}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 transition-all shadow-sm"
            >
              فتح الدرس السابق
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <GetCourseModal
        open={buyOpen}
        onOpenChange={setBuyOpen}
        courseId={course.id}
        courseTitle={course.title}
        price={price}
        onEnrolled={() => setEnrolled(true)}
      />
      <LectureModal
        open={lecOpen}
        onOpenChange={setLecOpen}
        lecture={activeLec}
        courseId={courseId}
        onNext={handleNextLec}
        onPrevious={handlePrevLec}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
      />
    </div>
  );
}
