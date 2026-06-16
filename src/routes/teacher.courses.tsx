import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createLiveSessionFn } from "../lib/api/live.functions";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen,
  Edit,
  Play,
  BarChart3,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  MoveUp,
  MoveDown,
  Eye,
  Video,
  FileText,
  CheckSquare,
  Clipboard,
  Star,
  Upload,
  RefreshCw,
  X,
  FileUp,
  Paperclip,
  FileSpreadsheet,
  Trophy,
  Sliders,
  Download,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getCurrentUser } from "@/lib/auth";
import {
  uploadFileFn,
  createLessonAttachmentFn,
  deleteLessonAttachmentFn,
  getLessonAttachmentsFn,
  getLeaderboardFn,
  updateLeaderboardSettingsFn,
  recalculateLeaderboardFn,
  resetLeaderboardFn,
  getCoursesFn,
  getModulesByCourseFn,
  createModuleFn,
  updateModuleFn,
  deleteModuleFn,
  createLessonFn,
  updateLessonFn,
  deleteLessonFn,
  getExamsFn,
  createExamFn,
  linkExamToLessonFn,
  unlinkExamFromLessonFn,
  reorderModulesFn,
  reorderLessonsFn,
  getCourseSettingsFn,
  updateCourseSettingsFn,
  getLessonSettingsFn,
  updateLessonSettingsFn,
  downloadExamTemplateFn,
  importExamFromExcelFn,
  exportExamToExcelFn,
  updateCourseFn,
  createBunnyVideoFn,
  uploadVideoFn,
  getVideoStatusFn,
  deleteBunnyVideoFn,
  replaceVideoFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/teacher/courses")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      content: search.content === "true" || search.content === true ? true : undefined,
    };
  },
  component: TeacherCourses,
});

interface Course {
  id: string;
  title: string;
  img: string;
  categories: string;
  price: string;
  lectures: number;
  featured?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  sortOrder: number;
  isPreview: boolean;
  videoMetadata?: {
    videoUrl: string;
    videoId?: string | null;
    thumbnailUrl?: string | null;
    status?: string | null;
    duration?: number | null;
  } | null;
  exams?: any[];
  lessonAttachments?: any[];
  videoUrl?: string;
  pdfUrl?: string;
  homework?: string;
  notes?: string;
  summary?: string;
}

interface Module {
  id: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
}

function TeacherCourses() {
  const searchParams = Route.useSearch();
  const isContentView = searchParams.content === true;
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [modulesMap, setModulesMap] = useState<Record<string, Module[]>>({});
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "content">("list");

  const [allExams, setAllExams] = useState<any[]>([]);
  const [activeImportExamId, setActiveImportExamId] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);
  const [statsCourse, setStatsCourse] = useState<Course | null>(null);

  // Content edit state
  const [activeLesson, setActiveLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(
    null,
  );
  const [activeLessonAttachments, setActiveLessonAttachments] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Course & Lesson settings
  const [courseSettings, setCourseSettings] = useState({
    sequentialMode: "OFF",
    selectedStudents: [] as string[],
    requirePassingExam: false,
  });

  const [lessonSettings, setLessonSettings] = useState({
    mustFinishExamBeforeVideo: false,
    pdfUrl: "",
    homework: "",
    notes: "",
    summary: "",
  });

  // Drag and Drop States
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [draggedLesson, setDraggedLesson] = useState<{ moduleId: string; lessonId: string } | null>(
    null,
  );
  const [activeDragOverModuleId, setActiveDragOverModuleId] = useState<string | null>(null);
  const [activeDragOverLessonId, setActiveDragOverLessonId] = useState<string | null>(null);

  // Leaderboard states
  const [contentTab, setContentTab] = useState<"lessons" | "leaderboard" | "settings">("lessons");
  const [leaderboardSettings, setLeaderboardSettings] = useState<{
    displayMode: "REAL_NAMES" | "STUDENT_CODE" | "ANONYMOUS";
    isHidden: boolean;
  } | null>(null);
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [recalculating, setRecalculating] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");

  // Bunny Stream Uploader states
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoUploadStatus, setVideoUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "success" | "failed"
  >("idle");
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [quickExamTitle, setQuickExamTitle] = useState("");

  const pollVideoStatus = (videoId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await getVideoStatusFn({ data: { videoId } });
        if (res.status === 3) {
          clearInterval(interval);
          setVideoUploadStatus("success");
          toast.success("✓ تم تجهيز الفيديو بنجاح");
          if (activeCourseId) await reloadSyllabus(activeCourseId);
          setActiveLesson(
            (prev) =>
              prev && {
                ...prev,
                lesson: {
                  ...prev.lesson,
                  videoMetadata: {
                    videoUrl: `https://vz-4e8e38f7-1c1.b-cdn.net/${videoId}/playlist.m3u8`,
                    videoId,
                    status: "3",
                    thumbnailUrl: res.thumbnailUrl || "",
                    duration: res.duration || 0,
                  } as any,
                },
              },
          );
        } else if (res.status === 4) {
          clearInterval(interval);
          setVideoUploadStatus("failed");
          setVideoUploadError("فشل تجهيز الفيديو");
        }
      } catch (err: any) {
        console.warn("Polling error:", err);
      }
    }, 12000);
  };

  const pollVideoStatusForReplace = (newVideoId: string, oldVideoId: string, fileSize: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await getVideoStatusFn({ data: { videoId: newVideoId } });
        if (res.status === 3) {
          clearInterval(interval);
          await replaceVideoFn({
            data: {
              lessonId: activeLesson!.lesson.id,
              oldVideoId,
              newVideoId,
              duration: Math.floor(res.duration || 0),
              size: fileSize,
            },
          });

          setVideoUploadStatus("success");
          toast.success("✓ تم استبدال وتجهيز الفيديو الجديد بنجاح");
          if (activeCourseId) await reloadSyllabus(activeCourseId);
          setActiveLesson(
            (prev) =>
              prev && {
                ...prev,
                lesson: {
                  ...prev.lesson,
                  videoMetadata: {
                    videoUrl: `https://vz-4e8e38f7-1c1.b-cdn.net/${newVideoId}/playlist.m3u8`,
                    videoId: newVideoId,
                    status: "3",
                    thumbnailUrl: res.thumbnailUrl || "",
                    duration: res.duration || 0,
                  } as any,
                },
              },
          );
        } else if (res.status === 4) {
          clearInterval(interval);
          setVideoUploadStatus("failed");
          setVideoUploadError("فشل تجهيز الفيديو. تم الاحتفاظ بالفيديو القديم دون تعديل.");
        }
      } catch (err: any) {
        console.warn("Polling replace error:", err);
      }
    }, 12000);
  };

  const handleUploadVideo = async (file: File) => {
    if (!activeLesson) return;
    try {
      setVideoUploadStatus("uploading");
      setVideoUploadProgress(0);
      setVideoUploadError(null);

      const bunnyRes = await createBunnyVideoFn({
        data: { title: `${activeLesson.lesson.title}_${Date.now()}` },
      });

      if (!bunnyRes.success) {
        setVideoUploadStatus("failed");
        setVideoUploadError("فشل إنشاء الفيديو في Bunny: " + bunnyRes.message);
        return;
      }

      const { videoId } = bunnyRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("videoId", videoId);
      formData.append("lessonId", activeLesson.lesson.id);
      formData.append("skipDbUpdate", "false");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadVideoFn.url);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setVideoUploadProgress(pct);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const uploadRes = JSON.parse(xhr.responseText);
            if (uploadRes.success) {
              setVideoUploadStatus("processing");
              setVideoUploadProgress(null);
              pollVideoStatus(videoId);
            } else {
              setVideoUploadStatus("failed");
              setVideoUploadError("فشل رفع الملف: " + uploadRes.message);
            }
          } catch (e) {
            setVideoUploadStatus("processing");
            setVideoUploadProgress(null);
            pollVideoStatus(videoId);
          }
        } else {
          setVideoUploadStatus("failed");
          setVideoUploadError("فشل رفع الملف إلى الخادم");
        }
      };

      xhr.onerror = () => {
        setVideoUploadStatus("failed");
        setVideoUploadError("حدث خطأ في الاتصال أثناء الرفع");
      };

      xhr.send(formData);
    } catch (err: any) {
      setVideoUploadStatus("failed");
      setVideoUploadError(err.message || "فشل بدء الرفع");
    }
  };

  const handleReplaceVideo = async (file: File, oldVideoId: string) => {
    if (!activeLesson) return;
    try {
      setVideoUploadStatus("uploading");
      setVideoUploadProgress(0);
      setVideoUploadError(null);

      const bunnyRes = await createBunnyVideoFn({
        data: { title: `${activeLesson.lesson.title}_replace_${Date.now()}` },
      });

      if (!bunnyRes.success) {
        setVideoUploadStatus("failed");
        setVideoUploadError("فشل إنشاء الفيديو البديل في Bunny: " + bunnyRes.message);
        return;
      }

      const { videoId } = bunnyRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("videoId", videoId);
      formData.append("lessonId", activeLesson.lesson.id);
      formData.append("skipDbUpdate", "true");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadVideoFn.url);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setVideoUploadProgress(pct);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const uploadRes = JSON.parse(xhr.responseText);
            if (uploadRes.success) {
              setVideoUploadStatus("processing");
              setVideoUploadProgress(null);
              pollVideoStatusForReplace(videoId, oldVideoId, file.size);
            } else {
              setVideoUploadStatus("failed");
              setVideoUploadError("فشل استبدال الفيديو: " + uploadRes.message);
            }
          } catch (e) {
            setVideoUploadStatus("processing");
            setVideoUploadProgress(null);
            pollVideoStatusForReplace(videoId, oldVideoId, file.size);
          }
        } else {
          setVideoUploadStatus("failed");
          setVideoUploadError("فشل رفع الملف إلى الخادم");
        }
      };

      xhr.onerror = () => {
        setVideoUploadStatus("failed");
        setVideoUploadError("حدث خطأ في الاتصال أثناء الرفع");
      };

      xhr.send(formData);
    } catch (err: any) {
      setVideoUploadStatus("failed");
      setVideoUploadError(err.message || "فشل بدء استبدال الفيديو");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        handleUploadVideo(file);
      } else {
        toast.error("يرجى اختيار ملف فيديو صالح فقط.");
      }
    }
  };

  // Load courses & exams on mount
  useEffect(() => {
    loadCourses();
    loadExams();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await getCoursesFn();
      const user = getCurrentUser();
      const mapped = (res || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        img:
          c.coverImage ||
          "https://storage.googleapis.com/gpt-engineer-file-uploads/AEsg1zggI4VE8xKalvu5HewFjSF2/social-images/social-1780788475646-image_(6).webp",
        categories: c.category?.name || "عام",
        price: c.price.toString(),
        lectures: 0,
        featured: c.isFeatured,
        instructors: c.instructors,
      }));

      const filtered =
        user && user.role === "TEACHER"
          ? mapped.filter((c: any) =>
              c.instructors?.some(
                (inst: any) => inst.instructor?.email?.toLowerCase() === user.email.toLowerCase(),
              ),
            )
          : mapped;

      setCourses(filtered);

      // Populate modulesMap for syllabus counts
      const map: Record<string, Module[]> = {};
      for (const c of filtered) {
        try {
          const mods = await getModulesByCourseFn({ data: { courseId: c.id } });
          map[c.id] = (mods || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            sortOrder: m.sortOrder || 0,
            lessons: (m.lessons || []).map((l: any) => ({
              id: l.id,
              title: l.title,
              sortOrder: l.sortOrder || 0,
              isPreview: l.isPreview || false,
              videoMetadata: l.videoMetadata,
              exams: l.exams || [],
              lessonAttachments: l.lessonAttachments || [],
            })),
          }));
        } catch {
          map[c.id] = [];
        }
      }
      setModulesMap(map);
    } catch (err: any) {
      toast.error("فشل تحميل الدورات: " + err.message);
    }
  };

  const loadExams = () => {
    getExamsFn()
      .then((res: any) => {
        setAllExams(res || []);
      })
      .catch((err) => {
        console.error("Failed to load exams:", err);
      });
  };

  const reloadSyllabus = async (courseId: string) => {
    try {
      const mods = await getModulesByCourseFn({ data: { courseId } });
      const mappedMods = (mods || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        sortOrder: m.sortOrder || 0,
        lessons: (m.lessons || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          sortOrder: l.sortOrder || 0,
          isPreview: l.isPreview || false,
          videoMetadata: l.videoMetadata,
          exams: l.exams || [],
          lessonAttachments: l.lessonAttachments || [],
        })),
      }));
      setModulesMap((prev) => ({
        ...prev,
        [courseId]: mappedMods,
      }));
    } catch (err: any) {
      toast.error("فشل تحميل محتوى الدورة: " + err.message);
    }
  };

  const loadCourseSettings = async (courseId: string) => {
    try {
      const settings = await getCourseSettingsFn({ data: { courseId } });
      setCourseSettings({
        sequentialMode: settings.sequentialMode || "OFF",
        selectedStudents: settings.selectedStudents || [],
        requirePassingExam: settings.requirePassingExam || false,
      });
    } catch (err) {
      console.error("Failed to load course settings:", err);
    }
  };

  // Sync active course data
  useEffect(() => {
    if (activeCourseId && view === "content") {
      reloadSyllabus(activeCourseId);
      loadCourseSettings(activeCourseId);
      if (contentTab === "leaderboard") {
        loadLeaderboardData(activeCourseId);
      }
    }
  }, [activeCourseId, view, contentTab]);

  // Sync active lesson data
  useEffect(() => {
    if (activeLesson) {
      loadAttachments(activeLesson.lesson.id);
      getLessonSettingsFn({ data: { lessonId: activeLesson.lesson.id } })
        .then((res: any) => {
          setLessonSettings({
            mustFinishExamBeforeVideo: res.mustFinishExamBeforeVideo || false,
            pdfUrl: res.pdfUrl || "",
            homework: res.homework || "",
            notes: res.notes || "",
            summary: res.summary || "",
          });
        })
        .catch(() => {
          setLessonSettings({
            mustFinishExamBeforeVideo: false,
            pdfUrl: "",
            homework: "",
            notes: "",
            summary: "",
          });
        });
    } else {
      setActiveLessonAttachments([]);
    }
  }, [activeLesson]);

  const loadAttachments = (lessonId: string) => {
    getLessonAttachmentsFn({ data: { lessonId } })
      .then((res: any) => {
        setActiveLessonAttachments(res || []);
      })
      .catch((err) => {
        console.error("Failed to load attachments:", err);
      });
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLesson) return;

    const allowedExtensions = ["pdf", "docx", "pptx", "zip", "png", "jpeg", "jpg", "gif"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      toast.error("صيغة الملف غير مدعومة. يسمح بـ: PDF, DOCX, PPTX, ZIP, والصور فقط.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingAttachment(true);
      try {
        const user = getCurrentUser();
        if (!user) throw new Error("المستخدم غير مسجل");

        const uploadRes = await uploadFileFn({
          data: {
            name: file.name,
            base64,
            category: "attachment",
          },
        });

        if (!uploadRes.success) {
          throw new Error(uploadRes.message || "فشل رفع الملف إلى الخادم");
        }

        const fileSize = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        await createLessonAttachmentFn({
          data: {
            lessonId: activeLesson.lesson.id,
            name: file.name,
            fileUrl: uploadRes.data.url,
            fileType: ext.toUpperCase(),
            fileSize,
            uploadedByEmail: user.email,
          },
        });

        toast.success("تم رفع المرفق بنجاح");
        loadAttachments(activeLesson.lesson.id);
      } catch (err: any) {
        toast.error("فشل رفع المرفق: " + err.message);
      } finally {
        setUploadingAttachment(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المرفق؟")) return;
    try {
      await deleteLessonAttachmentFn({ data: { id } });
      toast.success("تم حذف المرفق بنجاح");
      if (activeLesson) {
        loadAttachments(activeLesson.lesson.id);
      }
    } catch (err: any) {
      toast.error("فشل حذف المرفق: " + err.message);
    }
  };

  // Leaderboard Actions
  const loadLeaderboardData = (courseId: string) => {
    getLeaderboardFn({ data: { courseId } })
      .then((res: any) => {
        setLeaderboardSettings({
          displayMode: res.displayMode,
          isHidden: res.isHidden,
        });
        setLeaderboardEntries(res.entries || []);
      })
      .catch((err) => {
        toast.error("فشل تحميل بيانات لوحة الصدارة: " + err.message);
      });
  };

  const handleRecalculateLeaderboard = () => {
    if (!activeCourseId) return;
    setRecalculating(true);
    recalculateLeaderboardFn({ data: { courseId: activeCourseId } })
      .then(() => {
        toast.success("تم إعادة احتساب الترتيب والنقاط بنجاح");
        loadLeaderboardData(activeCourseId);
      })
      .catch((err) => {
        toast.error("فشل إعادة احتساب الترتيب: " + err.message);
      })
      .finally(() => {
        setRecalculating(false);
      });
  };

  const handleResetLeaderboard = () => {
    if (!activeCourseId || !confirm("هل أنت متأكد من تصفير وإعادة ضبط الترتيب؟")) return;
    setResetting(true);
    resetLeaderboardFn({ data: { courseId: activeCourseId } })
      .then(() => {
        toast.success("تم تصفير لوحة الصدارة بنجاح");
        loadLeaderboardData(activeCourseId);
      })
      .catch((err) => {
        toast.error("فشل تصفير الترتيب: " + err.message);
      })
      .finally(() => {
        setResetting(false);
      });
  };

  const handleUpdateLeaderboardSettings = (displayMode: any, isHidden: boolean) => {
    if (!activeCourseId) return;
    updateLeaderboardSettingsFn({
      data: {
        courseId: activeCourseId,
        displayMode,
        isHidden,
      },
    })
      .then(() => {
        toast.success("تم حفظ إعدادات لوحة الصدارة بنجاح");
        loadLeaderboardData(activeCourseId);
      })
      .catch((err) => {
        toast.error("فشل حفظ الإعدادات: " + err.message);
      });
  };

  // Search Filter
  const filteredCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.categories.toLowerCase().includes(search.toLowerCase()),
    );
  }, [courses, search]);

  const activeCourse = useMemo(() => {
    return courses.find((c) => c.id === activeCourseId) || null;
  }, [courses, activeCourseId]);

  // Edit Course Action
  const handleSaveCourseDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editCourse) return;
    try {
      const res = await updateCourseFn({
        data: {
          id: editCourse.id,
          title: editCourse.title,
          description: editCourse.categories,
          price: Number(editCourse.price),
          coverImage: editCourse.img,
        },
      });
      if (res.success) {
        toast.success("تم تعديل تفاصيل الدورة بنجاح");
        setEditCourse(null);
        loadCourses();
      } else {
        toast.error("فشل تعديل تفاصيل الدورة: " + res.message);
      }
    } catch (err: any) {
      toast.error("فشل تعديل تفاصيل الدورة: " + err.message);
    }
  };

  // Manage Modules
  const handleAddModule = async () => {
    if (!activeCourseId) return;
    const title = prompt("أدخل عنوان الوحدة الجديدة:");
    if (!title) return;
    try {
      const currentMods = modulesMap[activeCourseId] || [];
      const maxSort = currentMods.reduce((max, m) => Math.max(max, m.sortOrder || 0), 0);
      const res = await createModuleFn({
        data: {
          courseId: activeCourseId,
          title,
          sortOrder: maxSort + 1,
        },
      });
      if (res.success) {
        toast.success("تمت إضافة الوحدة بنجاح");
        await reloadSyllabus(activeCourseId);
      } else {
        toast.error("فشل إضافة الوحدة: " + res.message);
      }
    } catch (err: any) {
      toast.error("فشل إضافة الوحدة: " + err.message);
    }
  };

  const handleEditModuleTitle = async (mod: Module) => {
    const newTitle = prompt("تعديل عنوان الوحدة:", mod.title);
    if (!newTitle) return;
    try {
      await updateModuleFn({
        data: {
          id: mod.id,
          title: newTitle,
        },
      });
      toast.success("تم تحديث عنوان الوحدة");
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل تحديث عنوان الوحدة: " + err.message);
    }
  };

  const handleSoftDeleteModule = async (moduleId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة؟ سيتم إخفاء جميع محتوياتها.")) return;
    try {
      await deleteModuleFn({ data: { id: moduleId } });
      toast.success("تم حذف الوحدة بنجاح");
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل حذف الوحدة: " + err.message);
    }
  };

  // Manage Lessons
  const handleAddLesson = async (moduleId: string) => {
    const title = prompt("أدخل اسم الدرس الجديد:");
    if (!title) return;
    try {
      const currentMods = modulesMap[activeCourseId!] || [];
      const mod = currentMods.find((m) => m.id === moduleId);
      const maxSort =
        mod?.lessons?.reduce((max: number, l: any) => Math.max(max, l.sortOrder || 0), 0) || 0;
      await createLessonFn({
        data: {
          moduleId,
          title,
          sortOrder: maxSort + 1,
          isPreview: false,
        },
      });
      toast.success("تمت إضافة الدرس بنجاح");
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل إضافة الدرس: " + err.message);
    }
  };

  const handleSoftDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الدرس؟")) return;
    try {
      await deleteLessonFn({ data: { id: lessonId } });
      toast.success("تم حذف الدرس بنجاح");
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل حذف الدرس: " + err.message);
    }
  };

  // Drag and Drop Handlers
  const handleModuleDragStart = (e: React.DragEvent, moduleId: string) => {
    setDraggedModuleId(moduleId);
    setDraggedLesson(null);
    e.dataTransfer.setData("text/plain", moduleId);
  };

  const handleModuleDragEnter = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault();
    if (draggedModuleId && draggedModuleId !== moduleId) {
      setActiveDragOverModuleId(moduleId);
    }
  };

  const handleModuleDragLeave = (e: React.DragEvent, moduleId: string) => {
    e.preventDefault();
    if (activeDragOverModuleId === moduleId) {
      setActiveDragOverModuleId(null);
    }
  };

  const handleModuleDrop = async (e: React.DragEvent, targetModuleId: string) => {
    e.preventDefault();
    setActiveDragOverModuleId(null);
    if (!draggedModuleId || draggedModuleId === targetModuleId || !activeCourseId) return;

    const currentMods = [...(modulesMap[activeCourseId] || [])];
    const draggedIdx = currentMods.findIndex((m) => m.id === draggedModuleId);
    const targetIdx = currentMods.findIndex((m) => m.id === targetModuleId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [draggedMod] = currentMods.splice(draggedIdx, 1);
    currentMods.splice(targetIdx, 0, draggedMod);

    setModulesMap((prev) => ({
      ...prev,
      [activeCourseId]: currentMods,
    }));

    try {
      await reorderModulesFn({
        data: {
          courseId: activeCourseId,
          orderedModuleIds: currentMods.map((m) => m.id),
        },
      });
      toast.success("تم إعادة ترتيب الوحدات بنجاح");
    } catch (err: any) {
      toast.error("فشل حفظ ترتيب الوحدات: " + err.message);
      await reloadSyllabus(activeCourseId);
    } finally {
      setDraggedModuleId(null);
    }
  };

  const handleLessonDragStart = (e: React.DragEvent, moduleId: string, lessonId: string) => {
    setDraggedLesson({ moduleId, lessonId });
    setDraggedModuleId(null);
    e.dataTransfer.setData("text/plain", `${moduleId}:${lessonId}`);
  };

  const handleLessonDragEnter = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault();
    if (draggedLesson && draggedLesson.lessonId !== lessonId) {
      setActiveDragOverLessonId(lessonId);
    }
  };

  const handleLessonDragLeave = (e: React.DragEvent, lessonId: string) => {
    e.preventDefault();
    if (activeDragOverLessonId === lessonId) {
      setActiveDragOverLessonId(null);
    }
  };

  const handleLessonDrop = async (
    e: React.DragEvent,
    targetModuleId: string,
    targetLessonId: string,
  ) => {
    e.preventDefault();
    setActiveDragOverLessonId(null);
    if (!draggedLesson || !activeCourseId) return;

    const { moduleId: srcModuleId, lessonId: srcLessonId } = draggedLesson;
    if (srcModuleId !== targetModuleId) {
      toast.warning("ترتيب الدروس يتم داخل نفس الوحدة فقط.");
      return;
    }

    if (srcLessonId === targetLessonId) return;

    const currentMods = [...(modulesMap[activeCourseId] || [])];
    const modIdx = currentMods.findIndex((m) => m.id === targetModuleId);
    if (modIdx === -1) return;

    const lessons = [...currentMods[modIdx].lessons];
    const draggedIdx = lessons.findIndex((l) => l.id === srcLessonId);
    const targetIdx = lessons.findIndex((l) => l.id === targetLessonId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const [draggedLes] = lessons.splice(draggedIdx, 1);
    lessons.splice(targetIdx, 0, draggedLes);

    currentMods[modIdx].lessons = lessons;
    setModulesMap((prev) => ({
      ...prev,
      [activeCourseId]: currentMods,
    }));

    try {
      await reorderLessonsFn({
        data: {
          moduleId: targetModuleId,
          orderedLessonIds: lessons.map((l) => l.id),
        },
      });
      toast.success("تم إعادة ترتيب الدروس بنجاح");
    } catch (err: any) {
      toast.error("فشل حفظ ترتيب الدروس: " + err.message);
      await reloadSyllabus(activeCourseId);
    } finally {
      setDraggedLesson(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedModuleId(null);
    setDraggedLesson(null);
    setActiveDragOverModuleId(null);
    setActiveDragOverLessonId(null);
  };

  // Lesson Save action
  const handleSaveLessonDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLesson) return;

    const isVideoUploading = videoUploadStatus === "uploading";
    const isVideoProcessing = videoUploadStatus === "processing";
    const isBunnyEncoding =
      activeLesson.lesson.videoMetadata?.status !== undefined &&
      activeLesson.lesson.videoMetadata.status !== "3";

    if (isVideoUploading || isVideoProcessing || isBunnyEncoding) {
      toast.error("يرجى انتظار اكتمال معالجة الفيديو قبل حفظ الدرس");
      return;
    }

    const lessonVideoProvider = (activeLesson.lesson as any).videoProvider || "BUNNY";
    const lessonVideoId =
      activeLesson.lesson.videoMetadata?.videoId || (activeLesson.lesson as any).videoId;
    if (lessonVideoProvider === "BUNNY" && activeLesson.lesson.videoMetadata && !lessonVideoId) {
      toast.error("لم يكتمل تجهيز الفيديو بعد");
      return;
    }

    if (activeLesson.lesson.videoMetadata) {
      const videoMetadata = activeLesson.lesson.videoMetadata;
      if (
        !videoMetadata.videoUrl ||
        !videoMetadata.videoId ||
        videoMetadata.videoUrl.trim() === "" ||
        videoMetadata.videoUrl.includes("blob:")
      ) {
        toast.error("لم يكتمل تجهيز الفيديو بعد أو الرابط غير صالح");
        return;
      }
    }

    try {
      const { lesson } = activeLesson;
      await updateLessonFn({
        data: {
          id: lesson.id,
          title: lesson.title,
          isPreview: lesson.isPreview,
          videoUrl: lesson.videoMetadata?.videoUrl || null,
        },
      });

      await updateLessonSettingsFn({
        data: {
          lessonId: lesson.id,
          settings: {
            mustFinishExamBeforeVideo: lessonSettings.mustFinishExamBeforeVideo,
            pdfUrl: lessonSettings.pdfUrl,
            homework: lessonSettings.homework,
            notes: lessonSettings.notes,
            summary: lessonSettings.summary,
          },
        },
      });

      toast.success("تم حفظ تفاصيل الدرس بنجاح");
      setActiveLesson(null);
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل حفظ تفاصيل الدرس: " + err.message);
    }
  };

  // Excel handlers
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
      link.download = "Exam_Questions_Template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("تم تحميل قالب Excel بنجاح!");
    } catch (err: any) {
      toast.error("فشل تحميل قالب Excel: " + err.message);
    }
  };

  const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>, examId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const result = event.target?.result as string;
        const base64 = result.split(",")[1] || result;

        const res = await importExamFromExcelFn({
          data: {
            examId,
            fileBase64: base64,
          },
        });

        const data = res as any;
        if (data.errors && data.errors.length > 0) {
          toast.warning(
            `تم استيراد ${data.importedCount} سؤال مع وجود ${data.errors.length} أخطاء.`,
          );
          const errorMsg = data.errors.map((e: any) => `السطر ${e.row}: ${e.reason}`).join("\n");
          alert(`تقرير أخطاء استيراد ملف Excel:\n\n${errorMsg}`);
        } else {
          toast.success(`تم استيراد ${data.importedCount} سؤال بنجاح!`);
        }
        loadExams();
      } catch (err: any) {
        toast.error("فشل استيراد الأسئلة: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportExam = async (examId: string, examTitle: string) => {
    try {
      const res = await exportExamToExcelFn({ data: { examId } });
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
      link.download = `Exam_${examTitle.replace(/\s+/g, "_")}_Questions.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("تم تصدير الاختبار بنجاح!");
    } catch (err: any) {
      toast.error("فشل تصدير الاختبار: " + err.message);
    }
  };

  // Exam linking handlers
  const [selectedExamToLink, setSelectedExamToLink] = useState<string>("");
  const handleLinkExam = async (lessonId: string) => {
    if (!selectedExamToLink) return;
    try {
      await linkExamToLessonFn({
        data: {
          examId: selectedExamToLink,
          lessonId,
        },
      });
      toast.success("تم ربط الامتحان بالدرس بنجاح");
      setSelectedExamToLink("");
      loadExams();
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل ربط الامتحان: " + err.message);
    }
  };

  const handleUnlinkExam = async (examId: string) => {
    if (!confirm("هل أنت متأكد من فك ارتباط هذا الامتحان بالدرس؟")) return;
    try {
      await unlinkExamFromLessonFn({ data: { examId } });
      toast.success("تم إلغاء ارتباط الامتحان بنجاح");
      loadExams();
      if (activeCourseId) await reloadSyllabus(activeCourseId);
    } catch (err: any) {
      toast.error("فشل إلغاء الارتباط: " + err.message);
    }
  };

  // Course Settings action
  const handleSaveCourseSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourseId) return;
    try {
      await updateCourseSettingsFn({
        data: {
          courseId: activeCourseId,
          settings: {
            sequentialMode: courseSettings.sequentialMode as any,
            selectedStudents: courseSettings.selectedStudents,
            requirePassingExam: courseSettings.requirePassingExam,
          },
        },
      });
      toast.success("تم حفظ إعدادات الدورة بنجاح");
    } catch (err: any) {
      toast.error("فشل حفظ الإعدادات: " + err.message);
    }
  };

  return (
    <div className="space-y-6 text-end">
      {/* Hidden Excel input trigger */}
      <input
        type="file"
        ref={excelInputRef}
        onChange={(e) => activeImportExamId && handleImportXLSX(e, activeImportExamId)}
        accept=".xlsx"
        className="hidden"
      />

      {view === "list" ? (
        <>
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card sm:flex-row">
            <input
              type="search"
              placeholder="البحث في الدورات المسندة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-72"
            />
            <h2 className="font-display text-xl font-bold text-foreground">
              {isContentView ? "إدارة المحتوى التعليمي" : "دوراتي المسندة"}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((c) => (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="relative aspect-[16/10] bg-secondary">
                  <img src={c.img} alt={c.title} className="size-full object-cover" />
                  {c.featured && (
                    <span className="absolute end-3 top-3 flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground shadow animate-pulse">
                      <Star className="size-3 fill-current" /> مميز
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-base font-bold text-foreground">{c.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {c.categories}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm font-bold text-primary">{c.price} ج.م</span>
                    <span className="text-xs text-muted-foreground">
                      {modulesMap[c.id]?.length || 0} وحدات
                    </span>
                  </div>

                  <div className="mt-5">
                    {isContentView ? (
                      <button
                        onClick={() => {
                          setActiveCourseId(c.id);
                          setView("content");
                          setContentTab("lessons");
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                      >
                        <BookOpen className="size-4" /> إدارة محتوى الدورة
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => setEditCourse(c)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 font-bold text-foreground hover:bg-secondary transition-all"
                        >
                          <Edit className="size-3.5" /> تعديل
                        </button>
                        <button
                          onClick={() => {
                            setActiveCourseId(c.id);
                            setView("content");
                            setContentTab("lessons");
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                        >
                          <BookOpen className="size-3.5" /> إدارة المحتوى
                        </button>
                        <button
                          onClick={() => setPreviewCourse(c)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 font-bold text-foreground hover:bg-secondary transition-all"
                        >
                          <Eye className="size-3.5" /> المعاينة
                        </button>
                        <button
                          onClick={() => setStatsCourse(c)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 font-bold text-foreground hover:bg-secondary transition-all"
                        >
                          <BarChart3 className="size-3.5" /> الإحصائيات
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        // CONTENT MANAGEMENT VIEW
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("list")}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary transition-all"
              >
                <ArrowRight className="size-4" /> رجوع
              </button>

              {/* Tab togglers */}
              <div className="flex gap-1 bg-secondary/35 p-1 rounded-xl">
                <button
                  onClick={() => setContentTab("settings")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    contentTab === "settings"
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  إعادة التتابع والخصائص
                </button>
                <button
                  onClick={() => setContentTab("leaderboard")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    contentTab === "leaderboard"
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  لوحة الصدارة والترتيب
                </button>
                <button
                  onClick={() => setContentTab("lessons")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    contentTab === "lessons"
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الوحدات والدروس
                </button>
              </div>
            </div>

            <h2 className="font-display text-lg font-bold text-foreground">
              إدارة محتوى: <span className="text-primary">{activeCourse?.title}</span>
            </h2>
          </div>

          {contentTab === "lessons" && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const activeCourse = courses.find((c) => c.id === activeCourseId);
                        const title = activeCourse
                          ? `درس مباشر: ${activeCourse.title}`
                          : "درس مباشر";
                        const res = await createLiveSessionFn({
                          data: {
                            courseId: activeCourseId!,
                            title,
                          },
                        });
                        toast.success("تم بدء البث المباشر بنجاح!");
                        navigate({ to: `/teacher/live/${res.id}` });
                      } catch (err: any) {
                        toast.error("فشل في بدء البث المباشر: " + err.message);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-card hover:bg-red-700 transition-all cursor-pointer"
                  >
                    <Video className="size-4" /> [ بدء البث ]
                  </button>
                   <button
                    onClick={() => {
                      if (!activeCourseId) return;
                      sessionStorage.setItem("student_preview_mode", "true");
                      sessionStorage.setItem("student_preview_course_id", activeCourseId);
                      sessionStorage.removeItem("preview_progress");
                      sessionStorage.removeItem("preview_attempts");
                      toast.success("تم تفعيل وضع معاينة الطالب. جاري التوجيه…");
                      navigate({ to: `/app/courses/${activeCourseId}` });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-500 shadow-card hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
                  >
                    <Eye className="size-4" /> معاينة كطالب
                  </button>
                  <button
                    onClick={handleAddModule}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                  >
                    <Plus className="size-4" /> إضافة وحدة تعليمية
                  </button>
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  الوحدات والدروس
                </h3>
              </div>

              <div className="space-y-6">
                {(modulesMap[activeCourseId!] || []).map((mod) => (
                  <div
                    key={mod.id}
                    draggable
                    onDragStart={(e) => handleModuleDragStart(e, mod.id)}
                    onDragEnter={(e) => handleModuleDragEnter(e, mod.id)}
                    onDragLeave={(e) => handleModuleDragLeave(e, mod.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleModuleDrop(e, mod.id)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      activeDragOverModuleId === mod.id
                        ? "border-dashed border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/5 scale-[1.01]"
                        : "border-border bg-card/60 hover:border-primary/20"
                    } ${draggedModuleId === mod.id ? "opacity-45" : ""}`}
                  >
                    {/* Module header */}
                    <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSoftDeleteModule(mod.id)}
                          className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                          title="حذف الوحدة"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleEditModuleTitle(mod)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="تعديل العنوان"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleAddLesson(mod.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-primary hover:bg-secondary-foreground/20 transition-all"
                        >
                          <Plus className="size-3" /> إضافة درس
                        </button>
                        <span className="text-[10px] text-muted-foreground cursor-grab">
                          ⇅ اسحب لإعادة ترتيب الوحدة
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-foreground">
                        {mod.title}
                      </h4>
                    </div>

                    {/* Lessons list */}
                    <div className="space-y-2">
                      {mod.lessons.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          لا توجد دروس في هذه الوحدة حالياً
                        </div>
                      ) : (
                        mod.lessons.map((les) => {
                          const linkedEx = allExams.filter((e) => e.lessonId === les.id);
                          return (
                            <div
                              key={les.id}
                              draggable
                              onDragStart={(e) => handleLessonDragStart(e, mod.id, les.id)}
                              onDragEnter={(e) => handleLessonDragEnter(e, les.id)}
                              onDragLeave={(e) => handleLessonDragLeave(e, les.id)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleLessonDrop(e, mod.id, les.id)}
                              onDragEnd={handleDragEnd}
                              className={`flex flex-col gap-2 rounded-lg border p-3 transition-all ${
                                activeDragOverLessonId === les.id
                                  ? "border-dashed border-amber-500/50 bg-amber-500/5 scale-[1.01]"
                                  : "border-border/80 bg-card hover:bg-secondary/40"
                              } ${draggedLesson?.lessonId === les.id ? "opacity-45" : ""}`}
                            >
                              {/* Lesson Title & badges */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSoftDeleteLesson(mod.id, les.id)}
                                    className="rounded-md p-1 text-destructive hover:bg-destructive/10"
                                    title="حذف الدرس"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setActiveLesson({ moduleId: mod.id, lesson: les })
                                    }
                                    className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                    title="تعديل الدرس ومرفقاته"
                                  >
                                    <Edit className="size-3.5" />
                                  </button>
                                  <span className="text-[10px] text-muted-foreground cursor-grab">
                                    ⇅ اسحب للترتيب
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {les.isPreview && (
                                    <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 border border-purple-500/20">
                                      مجاني
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {les.videoMetadata?.videoUrl ? "فيديو" : "بلا فيديو"}
                                  </span>
                                  <span className="font-semibold text-foreground text-sm">
                                    {les.title}
                                  </span>
                                </div>
                              </div>

                              {/* Link exams control inside lesson card */}
                              <div className="mt-2 border-t border-border/40 pt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-secondary/10 p-2 rounded-md">
                                {/* Linked Exams list */}
                                <div className="flex flex-wrap items-center gap-2">
                                  {linkedEx.length > 0 ? (
                                    linkedEx.map((ex) => (
                                      <div
                                        key={ex.id}
                                        className="flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-xs text-primary"
                                      >
                                        <span>{ex.title}</span>
                                        {/* Excel triggers next to exam */}
                                        <div className="flex items-center gap-1 border-r border-primary/20 pr-1.5 mr-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleExportExam(ex.id, ex.title)}
                                            className="p-0.5 text-primary hover:text-primary-foreground hover:bg-primary rounded transition-all"
                                            title="تصدير لملف Excel"
                                          >
                                            <FileSpreadsheet className="size-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveImportExamId(ex.id);
                                              excelInputRef.current?.click();
                                            }}
                                            className="p-0.5 text-primary hover:text-primary-foreground hover:bg-primary rounded transition-all"
                                            title="استيراد من ملف Excel"
                                          >
                                            <FileUp className="size-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleDownloadTemplate}
                                            className="p-0.5 text-primary hover:text-primary-foreground hover:bg-primary rounded transition-all"
                                            title="تحميل قالب الأسئلة Excel"
                                          >
                                            <Download className="size-3" />
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleUnlinkExam(ex.id)}
                                          className="text-[10px] text-destructive hover:bg-destructive/10 rounded px-1"
                                        >
                                          فك الارتباط
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      لا يوجد امتحان مرتبط.
                                    </span>
                                  )}
                                </div>

                                {/* Link Exam Select Dropdown */}
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={selectedExamToLink}
                                    onChange={(e) => setSelectedExamToLink(e.target.value)}
                                    className="rounded border border-border bg-background px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">اختر امتحاناً للربط...</option>
                                    {allExams
                                      .filter(
                                        (e) =>
                                          e.courseId === activeCourseId && e.lessonId !== les.id,
                                      )
                                      .map((e) => (
                                        <option key={e.id} value={e.id}>
                                          {e.title}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleLinkExam(les.id)}
                                    disabled={!selectedExamToLink}
                                    className="rounded bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                  >
                                    ربط
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contentTab === "settings" && (
            <div
              className="rounded-2xl border border-border bg-card p-6 shadow-card max-w-xl mx-auto text-end"
              dir="rtl"
            >
              <div className="flex items-center gap-2 mb-6 justify-end border-b border-border pb-3">
                <h3 className="font-display text-base font-bold text-foreground">
                  إعدادات الدورة والتتابع التعليمي
                </h3>
                <Sliders className="size-5 text-primary" />
              </div>

              <form onSubmit={handleSaveCourseSettings} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground">
                    وضع تتابع الفيديوهات والدروس
                  </label>
                  <select
                    value={courseSettings.sequentialMode}
                    onChange={(e) =>
                      setCourseSettings((prev) => ({ ...prev, sequentialMode: e.target.value }))
                    }
                    className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="OFF">معطل (يستطيع الطلاب مشاهدة أي درس في أي وقت)</option>
                    <option value="FOR_ALL">تتابع إجباري لجميع المشتركين</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    عند تفعيل هذا الخيار، سيتم قفل الدروس التالية إجبارياً للطلاب.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/10 p-4">
                  <input
                    type="checkbox"
                    id="require-passing-exam-cb"
                    checked={courseSettings.requirePassingExam}
                    onChange={(e) =>
                      setCourseSettings((prev) => ({
                        ...prev,
                        requirePassingExam: e.target.checked,
                      }))
                    }
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <label
                    htmlFor="require-passing-exam-cb"
                    className="text-xs font-bold text-foreground cursor-pointer flex-1"
                  >
                    يشترط النجاح في امتحان الدرس السابق لفتح الدرس التالي
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                >
                  <Sparkles className="size-4" /> حفظ إعدادات الدورة
                </button>
              </form>
            </div>
          )}

          {contentTab === "leaderboard" && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Settings overrides */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-1 space-y-4">
                <h3 className="font-display text-sm font-bold text-foreground">
                  إعدادات لوحة الصدارة
                </h3>
                {leaderboardSettings && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-foreground mb-1.5">
                        طريقة عرض الأسماء للطلاب
                      </label>
                      <select
                        value={leaderboardSettings.displayMode}
                        onChange={(e) =>
                          handleUpdateLeaderboardSettings(
                            e.target.value,
                            leaderboardSettings.isHidden,
                          )
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        <option value="REAL_NAMES">عرض الأسماء الحقيقية</option>
                        <option value="STUDENT_CODE">عرض كود الطالب الفريد</option>
                        <option value="ANONYMOUS">عرض كمجهول الاسم</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/10 p-3">
                      <input
                        type="checkbox"
                        id="hide-leaderboard-checkbox"
                        checked={leaderboardSettings.isHidden}
                        onChange={(e) =>
                          handleUpdateLeaderboardSettings(
                            leaderboardSettings.displayMode,
                            e.target.checked,
                          )
                        }
                        className="size-4 rounded accent-primary"
                      />
                      <label
                        htmlFor="hide-leaderboard-checkbox"
                        className="text-xs font-bold text-foreground cursor-pointer"
                      >
                        إخفاء لوحة الصدارة عن الطلاب
                      </label>
                    </div>

                    <div className="pt-2 border-t border-border space-y-2">
                      <button
                        onClick={handleRecalculateLeaderboard}
                        disabled={recalculating}
                        className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-xs font-bold hover:bg-primary/95 disabled:opacity-50 transition-all"
                      >
                        {recalculating ? "جاري إعادة الحساب..." : "إعادة احتساب الترتيب والنقاط"}
                      </button>

                      <button
                        onClick={handleResetLeaderboard}
                        disabled={resetting}
                        className="w-full rounded-xl bg-destructive/10 text-destructive py-2 text-xs font-bold hover:bg-destructive/20 disabled:opacity-50 transition-all"
                      >
                        {resetting ? "جاري التصفير..." : "تصفير Rankings وإعادة ضبط"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ranks list */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-card lg:col-span-2">
                <h3 className="font-display text-sm font-bold text-foreground mb-4">
                  الترتيب الحالي للطلاب
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-end text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-bold bg-secondary/30">
                        <th className="px-3 py-2 text-start">الميدالية</th>
                        <th className="px-3 py-2 text-start">إجمالي النقاط</th>
                        <th className="px-3 py-2 text-start">الامتحانات (40%)</th>
                        <th className="px-3 py-2 text-start">الإكمال (30%)</th>
                        <th className="px-3 py-2 text-start">الواجبات (20%)</th>
                        <th className="px-3 py-2 text-start">الحضور (10%)</th>
                        <th className="px-3 py-2">الطالب</th>
                        <th className="px-3 py-2">الترتيب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {leaderboardEntries.length > 0 ? (
                        leaderboardEntries.map((e) => (
                          <tr key={e.id} className="hover:bg-secondary/15">
                            <td className="px-3 py-2.5 text-start font-bold">
                              {e.medal === "GOLD"
                                ? "🥇 ذهبية"
                                : e.medal === "SILVER"
                                  ? "🥈 فضية"
                                  : e.medal === "BRONZE"
                                    ? "🥉 برونزية"
                                    : "—"}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-primary text-start">
                              {e.points.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground text-start">
                              {e.examsPoints.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground text-start">
                              {e.courseCompPoints.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground text-start">
                              {e.assignmentsPoints.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground text-start">
                              {e.attendancePoints.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-foreground">
                              {e.studentName}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-foreground">#{e.rank}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-muted-foreground">
                            لا توجد بيانات ترتيب مسجلة حالياً. اضغط على زر "إعادة احتساب الترتيب"
                            للبدء.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Course Dialog */}
      <Dialog open={!!editCourse} onOpenChange={() => setEditCourse(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              تعديل تفاصيل الدورة
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCourseDetails} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                اسم الدورة
              </label>
              <input
                type="text"
                value={editCourse?.title || ""}
                onChange={(e) =>
                  setEditCourse((prev) => prev && { ...prev, title: e.target.value })
                }
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                وصف الدورة (أو المراحل)
              </label>
              <textarea
                value={editCourse?.categories || ""}
                onChange={(e) =>
                  setEditCourse((prev) => prev && { ...prev, categories: e.target.value })
                }
                required
                rows={3}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                السعر (ج.م)
              </label>
              <input
                type="number"
                step="0.01"
                value={editCourse?.price || ""}
                onChange={(e) =>
                  setEditCourse((prev) => prev && { ...prev, price: e.target.value })
                }
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                رابط صورة الدورة
              </label>
              <input
                type="text"
                value={editCourse?.img || ""}
                onChange={(e) => setEditCourse((prev) => prev && { ...prev, img: e.target.value })}
                required
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              حفظ التعديلات
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lesson Details Dialog */}
      <Dialog open={!!activeLesson} onOpenChange={() => setActiveLesson(null)}>
        <DialogContent
          className="max-w-3xl rounded-2xl text-end flex flex-col h-[85vh] p-0 overflow-hidden"
          dir="rtl"
        >
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border bg-card">
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              تعديل الدرس ومرفقاته
            </DialogTitle>
          </DialogHeader>

          {activeLesson && (
            <form
              onSubmit={handleSaveLessonDetails}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title and Preview status */}
                <div className="grid gap-4 sm:grid-cols-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      عنوان الدرس
                    </label>
                    <input
                      type="text"
                      value={activeLesson.lesson.title}
                      onChange={(e) =>
                        setActiveLesson(
                          (prev) =>
                            prev && {
                              ...prev,
                              lesson: { ...prev.lesson, title: e.target.value },
                            },
                        )
                      }
                      required
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  {/* Free Preview Lecture badge controller */}
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/15 px-4 h-10 select-none">
                    <input
                      type="checkbox"
                      id="lesson-is-preview-cb"
                      checked={activeLesson.lesson.isPreview}
                      onChange={(e) =>
                        setActiveLesson(
                          (prev) =>
                            prev && {
                              ...prev,
                              lesson: { ...prev.lesson, isPreview: e.target.checked },
                            },
                        )
                      }
                      className="size-4 rounded accent-primary cursor-pointer"
                    />
                    <label
                      htmlFor="lesson-is-preview-cb"
                      className="text-xs font-bold text-foreground cursor-pointer flex-1"
                    >
                      معاينة مجانية للزوار
                    </label>
                  </div>
                </div>

                {/* Accordion Layout */}
                <Accordion type="multiple" defaultValue={["video"]} className="w-full space-y-3">
                  {/* Section 1: 🎥 فيديو الدرس */}
                  <AccordionItem
                    value="video"
                    className="border border-border rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-foreground">
                        🎥 فيديو الدرس
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                      {videoUploadStatus !== "idle" ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            {videoUploadStatus === "uploading" && (
                              <span className="text-primary animate-pulse">
                                جاري رفع الفيديو... {videoUploadProgress}%
                              </span>
                            )}
                            {videoUploadStatus === "processing" && (
                              <span className="text-purple-600 flex items-center gap-1.5 animate-pulse">
                                <RefreshCw className="size-3.5 animate-spin" /> جاري معالجة وتشفير
                                الفيديو...
                              </span>
                            )}
                            {videoUploadStatus === "success" && (
                              <span className="text-success font-bold flex items-center gap-1">
                                ✓ تم تجهيز الفيديو بنجاح
                              </span>
                            )}
                            {videoUploadStatus === "failed" && (
                              <span className="text-destructive font-bold">
                                فشل رفع أو معالجة الفيديو
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setVideoUploadStatus("idle");
                                setVideoUploadProgress(null);
                                setVideoUploadError(null);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-4" />
                            </button>
                          </div>

                          {videoUploadStatus === "uploading" && (
                            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${videoUploadProgress || 0}%` }}
                              />
                            </div>
                          )}

                          {videoUploadError && (
                            <p className="text-[10px] text-destructive font-semibold text-right">
                              {videoUploadError}
                            </p>
                          )}

                          {videoUploadStatus === "failed" && (
                            <button
                              type="button"
                              onClick={() => {
                                setVideoUploadStatus("idle");
                              }}
                              className="w-full rounded-lg bg-primary py-2 text-center text-xs font-bold text-primary-foreground hover:opacity-90"
                            >
                              إعادة المحاولة
                            </button>
                          )}
                        </div>
                      ) : activeLesson.lesson.videoMetadata?.videoId ? (
                        <div className="space-y-3">
                          {activeLesson.lesson.videoMetadata.thumbnailUrl && (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-black max-w-sm mx-auto">
                              <img
                                src={activeLesson.lesson.videoMetadata.thumbnailUrl}
                                alt="Video Thumbnail"
                                className="size-full object-cover opacity-85"
                              />
                              <div className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white font-mono">
                                {(() => {
                                  const dur = activeLesson.lesson.videoMetadata.duration || 0;
                                  const mins = Math.floor(dur / 60);
                                  const secs = dur % 60;
                                  return `${mins}:${secs.toString().padStart(2, "0")}`;
                                })()}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-secondary/20 p-2.5 rounded-lg">
                            <span className="font-mono text-[9px] truncate max-w-[150px]">
                              رمز الفيديو: {activeLesson.lesson.videoMetadata.videoId}
                            </span>
                            <span>
                              حالة الفيديو:{" "}
                              {activeLesson.lesson.videoMetadata.status === "3" ? (
                                <span className="text-emerald-600 font-bold">✓ جاهز للبث</span>
                              ) : (
                                <span className="text-purple-600 animate-pulse">
                                  جاري المعالجة...
                                </span>
                              )}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  confirm(
                                    "هل أنت متأكد من حذف الفيديو نهائياً من منصة Bunny ومن الدرس؟",
                                  )
                                ) {
                                  try {
                                    await deleteBunnyVideoFn({
                                      data: {
                                        lessonId: activeLesson.lesson.id,
                                        videoId: activeLesson.lesson.videoMetadata!.videoId!,
                                      },
                                    });
                                    toast.success("تم حذف الفيديو بنجاح");
                                    if (activeCourseId) await reloadSyllabus(activeCourseId);
                                    setActiveLesson(
                                      (prev) =>
                                        prev && {
                                          ...prev,
                                          lesson: { ...prev.lesson, videoMetadata: null },
                                        },
                                    );
                                  } catch (err: any) {
                                    toast.error("فشل حذف الفيديو: " + err.message);
                                  }
                                }
                              }}
                              className="flex-1 rounded-xl bg-destructive/10 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all text-center"
                            >
                              حذف الفيديو
                            </button>

                            <label className="flex-1 rounded-xl bg-secondary/80 py-2.5 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer transition-all text-center">
                              استبدال الفيديو
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleReplaceVideo(
                                      e.target.files[0],
                                      activeLesson.lesson.videoMetadata!.videoId!,
                                    );
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      ) : activeLesson.lesson.videoMetadata?.videoUrl ? (
                        <div className="flex items-center justify-between bg-secondary/35 p-3 rounded-xl">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveLesson(
                                (prev) =>
                                  prev && {
                                    ...prev,
                                    lesson: { ...prev.lesson, videoMetadata: null },
                                  },
                              )
                            }
                            className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors"
                          >
                            حذف الرابط القديم
                          </button>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 max-w-[200px] truncate">
                            <Video className="size-4 text-primary shrink-0" />{" "}
                            {activeLesson.lesson.videoMetadata.videoUrl.split("/").pop()}
                          </span>
                        </div>
                      ) : (
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                            dragActive
                              ? "border-primary bg-primary/5 scale-[1.01]"
                              : "border-border bg-card hover:bg-secondary/15"
                          }`}
                        >
                          <FileUp className="size-10 text-muted-foreground mb-2" />
                          <p className="text-xs font-bold text-foreground mb-1">
                            اسحب ملف الفيديو هنا
                          </p>
                          <p className="text-[10px] text-muted-foreground mb-3">
                            أو اضغط لاختيار ملف فيديو من جهازك للبث عبر Bunny Stream
                          </p>
                          <label className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 cursor-pointer shadow">
                            اختر ملف الفيديو
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadVideo(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Section 2: 📄 PDF */}
                  <AccordionItem
                    value="pdf"
                    className="border border-border rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-foreground">
                        📄 ملف الشرح PDF
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          رابط ملف PDF مباشر
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://example.com/lecture.pdf"
                            value={lessonSettings.pdfUrl}
                            onChange={(e) =>
                              setLessonSettings((prev) => ({ ...prev, pdfUrl: e.target.value }))
                            }
                            className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                          />
                          {/* Direct PDF Uploader */}
                          <label className="rounded-xl bg-secondary/80 hover:bg-secondary border border-border px-4 flex items-center justify-center text-xs font-bold text-foreground cursor-pointer transition-colors">
                            <Upload className="size-4 text-muted-foreground ml-1" />
                            رفع ملف PDF
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  toast.loading("جاري رفع ملف PDF...");
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64 = event.target?.result as string;
                                    const res = await uploadFileFn({
                                      data: {
                                        name: file.name,
                                        base64,
                                        category: "pdf",
                                      },
                                    });
                                    toast.dismiss();
                                    if (res.success && res.data?.url) {
                                      const fullUrl = window.location.origin + res.data.url;
                                      setLessonSettings((prev) => ({ ...prev, pdfUrl: fullUrl }));
                                      toast.success("تم رفع ملف PDF بنجاح!");
                                    } else {
                                      toast.error("فشل رفع الملف.");
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                } catch (err: any) {
                                  toast.dismiss();
                                  toast.error("حدث خطأ أثناء الرفع: " + err.message);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Section 3: 📎 المرفقات */}
                  <AccordionItem
                    value="attachments"
                    className="border border-border rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-foreground">
                        📎 المرفقات الإضافية
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                      {/* Upload Action */}
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          id="attachment-upload-input"
                          onChange={handleAttachmentUpload}
                          disabled={uploadingAttachment}
                          className="hidden"
                          accept=".pdf,.docx,.pptx,.zip,image/*"
                        />
                        <label
                          htmlFor="attachment-upload-input"
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/10 py-3 text-xs font-semibold cursor-pointer hover:bg-secondary/25 transition-all ${
                            uploadingAttachment ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FileUp className="size-4 text-primary" />
                          <span>
                            {uploadingAttachment
                              ? "جاري الرفع..."
                              : "اسحب أو اختر ملفاً لرفعه (PDF, Word, PowerPoint, ZIP, صور)"}
                          </span>
                        </label>
                      </div>

                      {/* Attachments List */}
                      {activeLessonAttachments.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {activeLessonAttachments.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 text-xs shadow-sm"
                            >
                              <button
                                type="button"
                                onClick={() => handleAttachmentDelete(a.id)}
                                className="rounded-lg p-1.5 text-destructive hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                              <div className="flex-1 text-end">
                                <div className="font-semibold text-foreground truncate max-w-[280px]">
                                  {a.name}
                                </div>
                                <div className="flex justify-end items-center gap-2 mt-0.5 text-[9px] text-muted-foreground">
                                  <span>{a.fileSize}</span>
                                  <span>•</span>
                                  <span>{a.fileType}</span>
                                  <span>•</span>
                                  <span className="font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                                    {a._count?.downloads || 0} تحميلات
                                  </span>
                                </div>
                              </div>
                              <Paperclip className="size-3.5 text-primary shrink-0" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground text-center py-2">
                          لا توجد ملفات مرفقة بهذا الدرس بعد.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Section 4: 📝 الامتحان المرتبط */}
                  <AccordionItem
                    value="exam"
                    className="border border-border rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-foreground">
                        📝 الامتحان المرتبط
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
                      {(() => {
                        const linkedExams = allExams.filter(
                          (e) => e.lessonId === activeLesson.lesson.id,
                        );
                        return (
                          <div className="space-y-4 text-right">
                            {linkedExams.length > 0 ? (
                              <div className="space-y-3">
                                <span className="block text-xs font-bold text-muted-foreground">
                                  الامتحان المرتبط بالدرس:
                                </span>
                                {linkedExams.map((ex) => (
                                  <div
                                    key={ex.id}
                                    className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-3 shadow-sm"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <button
                                        type="button"
                                        onClick={() => handleUnlinkExam(ex.id)}
                                        className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100 transition-colors"
                                        title="إلغاء الارتباط"
                                      >
                                        <Trash2 className="size-4" />
                                      </button>
                                      <div className="flex-1 text-end">
                                        <h4 className="font-bold text-sm text-foreground">
                                          {ex.title}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                          {ex.course?.title || "دورة عامة"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Summary grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/50 pt-3 text-right">
                                      <div>
                                        <span className="text-muted-foreground">المدة:</span>{" "}
                                        <span className="font-bold text-foreground">
                                          {ex.durationLimit || "مفتوحة"} دقيقة
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">المحاولات:</span>{" "}
                                        <span className="font-bold text-foreground">
                                          {ex.maxAttempts} محاولات
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">درجة النجاح:</span>{" "}
                                        <span className="font-bold text-foreground">
                                          {ex.passScore}%
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">الأسئلة:</span>{" "}
                                        <span className="font-bold text-foreground">
                                          {ex.questions?.length || 0} أسئلة
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 border border-dashed rounded-xl bg-secondary/5 text-muted-foreground text-xs leading-relaxed">
                                لا توجد امتحانات مرتبطة بهذا الدرس حالياً.
                              </div>
                            )}

                            {linkedExams.length > 0 && (
                              <div className="flex items-center gap-3 rounded-xl border border-border bg-amber-500/5 p-4 select-none">
                                <input
                                  type="checkbox"
                                  id="must-finish-exam-video-cb"
                                  checked={lessonSettings.mustFinishExamBeforeVideo}
                                  onChange={(e) =>
                                    setLessonSettings((prev) => ({
                                      ...prev,
                                      mustFinishExamBeforeVideo: e.target.checked,
                                    }))
                                  }
                                  className="size-4 rounded accent-primary cursor-pointer"
                                />
                                <label
                                  htmlFor="must-finish-exam-video-cb"
                                  className="text-xs font-bold text-foreground cursor-pointer flex-1"
                                >
                                  امتحان إلزامي (يجب على الطالب اجتياز هذا الامتحان قبل مشاهدة فيديو
                                  الدرس)
                                </label>
                              </div>
                            )}

                            {/* Link Existing or Create New */}
                            <div className="border-t border-border/50 pt-4 space-y-4">
                              <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-foreground">
                                  اختيار اختبار
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleLinkExam(activeLesson.lesson.id)}
                                    disabled={!selectedExamToLink}
                                    className="rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-45 shadow"
                                  >
                                    ربط الامتحان
                                  </button>
                                  <select
                                    value={selectedExamToLink}
                                    onChange={(e) => setSelectedExamToLink(e.target.value)}
                                    className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary text-end"
                                  >
                                    <option value="">-- اختر اختباراً لربطه --</option>
                                    {allExams
                                      .filter((e) => e.lessonId !== activeLesson.lesson.id)
                                      .map((ex) => (
                                        <option key={ex.id} value={ex.id}>
                                          {ex.title} ({ex.course?.title || "اختبار عام"})
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>

                              {/* Create Instantly */}
                              <div className="rounded-xl border border-border bg-secondary/15 p-4 space-y-3">
                                <span className="block text-xs font-bold text-foreground">
                                  ➕ إنشاء اختبار جديد سريعاً
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const title = quickExamTitle.trim();
                                      if (!title) {
                                        toast.error("يرجى إدخال اسم الاختبار.");
                                        return;
                                      }
                                      try {
                                        toast.loading("جاري إنشاء وربط الاختبار...");
                                        const newExam = await createExamFn({
                                          data: {
                                            courseId: activeCourseId || "",
                                            title,
                                            durationLimit: 30,
                                            passScore: 50,
                                            maxAttempts: 2,
                                            description: "اختبار سريع مرتبط بالدرس",
                                            published: true,
                                          },
                                        });

                                        await linkExamToLessonFn({
                                          data: {
                                            examId: newExam.id,
                                            lessonId: activeLesson.lesson.id,
                                          },
                                        });

                                        toast.dismiss();
                                        toast.success("تم إنشاء الاختبار وربطه بنجاح!");
                                        setQuickExamTitle("");
                                        if (activeCourseId) await reloadSyllabus(activeCourseId);

                                        const updatedExams = await getExamsFn();
                                        setAllExams(updatedExams || []);
                                      } catch (err: any) {
                                        toast.dismiss();
                                        toast.error("فشل إنشاء الاختبار: " + err.message);
                                      }
                                    }}
                                    className="rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow"
                                  >
                                    إنشاء وربط
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="اسم الاختبار السريع..."
                                    value={quickExamTitle}
                                    onChange={(e) => setQuickExamTitle(e.target.value)}
                                    className="flex-1 h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Section 5: ⚙ إعدادات الدرس */}
                  <AccordionItem
                    value="settings"
                    className="border border-border rounded-xl bg-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 transition-colors">
                      <span className="flex items-center gap-2 font-bold text-foreground">
                        ⚙ إعدادات وتفاصيل الدرس
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-4 text-right">
                      {/* Homework */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          الواجبات والأسئلة (وصف أو رابط)
                        </label>
                        <input
                          type="text"
                          placeholder="وصف واجب الدرس أو الرابط للتحميل..."
                          value={lessonSettings.homework}
                          onChange={(e) =>
                            setLessonSettings((prev) => ({ ...prev, homework: e.target.value }))
                          }
                          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          ملاحظات للمحاضرة
                        </label>
                        <textarea
                          placeholder="ملاحظات تظهر للطالب بجانب المحاضرة..."
                          value={lessonSettings.notes}
                          onChange={(e) =>
                            setLessonSettings((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                        />
                      </div>

                      {/* Summaries */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                          ملخصات وجلسات الدرس
                        </label>
                        <textarea
                          placeholder="ملخص تعليمي للمحاضرة أو المنهج..."
                          value={lessonSettings.summary}
                          onChange={(e) =>
                            setLessonSettings((prev) => ({ ...prev, summary: e.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Sticky Footer Save Actions */}
              <div className="sticky bottom-0 bg-background px-6 py-4 border-t border-border mt-auto flex items-center justify-between gap-4 z-10">
                <button
                  type="button"
                  onClick={() => setActiveLesson(null)}
                  className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary/50 rounded-xl transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewCourse} onOpenChange={() => setPreviewCourse(null)}>
        <DialogContent className="max-w-lg rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              معاينة الدورة كما تظهر للطلاب
            </DialogTitle>
          </DialogHeader>
          {previewCourse && (
            <div className="mt-4 space-y-4">
              <img
                src={previewCourse.img}
                alt={previewCourse.title}
                className="w-full rounded-xl object-cover max-h-56 bg-secondary"
              />
              <div>
                <h3 className="font-display text-lg font-bold text-primary">
                  {previewCourse.title}
                </h3>
                <p className="mt-2 text-sm text-foreground leading-relaxed">
                  {previewCourse.categories}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-muted-foreground bg-secondary/40 p-3 rounded-lg">
                  <span>سعر البيع: {previewCourse.price} ج.م</span>
                  <span>حالة الدورة: {previewCourse.featured ? "مميزة" : "عادية"}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={!!statsCourse} onOpenChange={() => setStatsCourse(null)}>
        <DialogContent className="max-w-xl rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              إحصائيات: {statsCourse?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="block text-muted-foreground mb-1">المبيعات</span>
                <span className="font-bold text-sm text-foreground">132 مشترك</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="block text-muted-foreground mb-1">المشاهدات</span>
                <span className="font-bold text-sm text-foreground">4,520 مشاهدة</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <span className="block text-muted-foreground mb-1">إكمال الدورة</span>
                <span className="font-bold text-sm text-foreground">84%</span>
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-muted-foreground mb-3">
                رسم بياني للمشاهدات الأسبوعية
              </span>
              <div className="h-48 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { name: "السبت", views: 240 },
                      { name: "الأحد", views: 350 },
                      { name: "الاثنين", views: 180 },
                      { name: "الثلاثاء", views: 420 },
                      { name: "الأربعاء", views: 500 },
                      { name: "الخميس", views: 300 },
                      { name: "الجمعة", views: 600 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="views"
                      name="المشاهدات"
                      stroke="var(--primary)"
                      fill="var(--secondary)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
