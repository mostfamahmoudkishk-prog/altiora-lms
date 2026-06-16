import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Video,
  ClipboardList,
  Paperclip,
  ArrowLeft,
  PlayCircle,
  Plus,
  Clock,
  Play,
  Pause,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Send,
  User,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  getExamAttemptsFn,
  getLessonSettingsFn,
  getLessonAttachmentsFn,
  getBrandingByLessonFn,
  getBunnyConfigFn,
  getPlaybackProgressFn,
  getBunnySignedUrlFn,
  getVideoNotesFn,
  savePlaybackProgressFn,
  incrementPlayPauseAnalyticsFn,
  trackDownloadFn,
} from "@/lib/api/db.functions";
import { getStudentCodeFn } from "@/lib/api/auth.functions";

async function loadPdfLib(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).PDFLib) {
    return (window as any).PDFLib;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
    script.onload = () => {
      resolve((window as any).PDFLib);
    };
    script.onerror = (err) => {
      reject(new Error("Failed to load PDF watermarking library."));
    };
    document.body.appendChild(script);
  });
}

async function watermarkPdf(pdfUrl: string, studentCode: string, fileName: string) {
  const toastId = toast.loading("جاري معالجة وتحميل الملف وحقن العلامة المائية...");
  try {
    const PDFLib = await loadPdfLib();
    if (!PDFLib) throw new Error("PDFLib not available");
    
    let response;
    try {
      response = await fetch(pdfUrl);
    } catch (corsErr) {
      console.warn("CORS block when fetching PDF, falling back to direct download", corsErr);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success("تم بدء تحميل الملف مباشرة.");
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const { rgb, degrees, StandardFonts } = PDFLib;
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const watermarkText = `ID: ${studentCode}`;
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width / 3,
        y: height / 2,
        size: Math.min(width, height) / 12,
        font: helveticaFont,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.15,
        rotate: degrees(45),
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.dismiss(toastId);
    toast.success("تم تحميل الملف وحقن العلامة المائية بنجاح.");
  } catch (err: any) {
    console.error("Failed to watermark PDF:", err);
    toast.dismiss(toastId);
    toast.error("حدث خطأ أثناء معالجة الملف، جاري التحميل المباشر...");
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export type Lecture = {
  id: string;
  title: string;
  hasMandatoryExam?: boolean;
  isFree?: boolean;
  videoUrl?: string;
  videoId?: string;
  thumbnailUrl?: string;
  status?: string;
  duration?: number;
  exams?: { id: string; title: string }[];
  attachments?: { id: string; title: string; url: string }[];
};

type Tab = "desc" | "files" | "exams" | "comments";

interface SavedVideoNote {
  id: string;
  second: number;
  content: string;
  createdAt: string;
}

const playPauseThrottleCache = new Map<string, number>();

export function LectureModal({
  open,
  onOpenChange,
  lecture,
  courseId,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lecture: Lecture | null;
  courseId?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("desc");
  const [hasMandatoryExamBlocked, setHasMandatoryExamBlocked] = useState(false);
  const [isPlayerActive, setIsPlayerActive] = useState<boolean | null>(null);
  const [isCheckingPlayer, setIsCheckingPlayer] = useState(false);

  const checkPlayerStatus = async () => {
    setIsCheckingPlayer(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch("http://127.0.0.1:12480/status", { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.active) {
          setIsPlayerActive(true);
          setIsCheckingPlayer(false);
          return;
        }
      }
      setIsPlayerActive(false);
    } catch (err) {
      setIsPlayerActive(false);
    }
    setIsCheckingPlayer(false);
  };

  useEffect(() => {
    if (open && lecture) {
      checkPlayerStatus();
    } else {
      setIsPlayerActive(null);
    }
  }, [open, lecture?.id]);

  useEffect(() => {
    if (open && lecture) {
      setHasMandatoryExamBlocked(lecture.hasMandatoryExam || false);
      const user = getCurrentUser();
      if (user) {
        getExamAttemptsFn({ data: { email: user.email } })
          .then((attempts: any[]) => {
            getLessonSettingsFn({ data: { lessonId: lecture.id } })
              .then((ls: any) => {
                if (ls?.mustFinishExamBeforeVideo && lecture.exams && lecture.exams.length > 0) {
                  let blocked = false;
                  for (const ex of lecture.exams) {
                    const passed = attempts.some((att) => att.examId === ex.id && att.passed);
                    if (!passed) {
                      blocked = true;
                      break;
                    }
                  }
                  setHasMandatoryExamBlocked(blocked);
                } else {
                  setHasMandatoryExamBlocked(false);
                }
              })
              .catch(() => {
                setHasMandatoryExamBlocked(lecture.hasMandatoryExam || false);
              });
          })
          .catch(() => {});
      }
    }
  }, [open, lecture]);

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const [dbAttachments, setDbAttachments] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [noteText, setNoteText] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoNotes, setVideoNotes] = useState<SavedVideoNote[]>([]);
  const [brandingData, setBrandingData] = useState<any>(null);
  const [bunnyLibraryId, setBunnyLibraryId] = useState<string>("");
  const [studentCode, setStudentCode] = useState<string>("");
  const [watermarkPos, setWatermarkPos] = useState({ top: "15%", left: "15%" });
  const [savedSecond, setSavedSecond] = useState<number>(0);
  const [videoPlayUrl, setVideoPlayUrl] = useState<string>("");
  const [comments, setComments] = useState<
    { id: string; user: string; text: string; time: string; avatarUrl?: string }[]
  >([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (lecture?.id) {
      const stored = localStorage.getItem(`comments_${lecture.id}`);
      if (stored) {
        setComments(JSON.parse(stored));
      } else {
        const defaults = [
          {
            id: "1",
            user: "أحمد محمد",
            text: "شرح رائع جداً ومبسط، شكراً جزيلاً يا مستر!",
            time: "منذ ساعة",
            avatarUrl: "",
          },
          {
            id: "2",
            user: "سارة أحمد",
            text: "الفيديو واضح جداً والتطبيق العملي مفيد.",
            time: "منذ ساعتين",
            avatarUrl: "",
          },
        ];
        setComments(defaults);
        localStorage.setItem(`comments_${lecture.id}`, JSON.stringify(defaults));
      }
    }
  }, [lecture?.id]);

  const handleAddComment = () => {
    if (!newComment.trim() || !lecture?.id) return;
    const user = getCurrentUser();
    const name = user?.name || "طالب ألتيورا";
    const item = {
      id: Date.now().toString(),
      user: name,
      text: newComment,
      time: "الآن",
      avatarUrl: "",
    };
    const updated = [item, ...comments];
    setComments(updated);
    localStorage.setItem(`comments_${lecture.id}`, JSON.stringify(updated));
    setNewComment("");
    toast.success("تم إضافة تعليقك بنجاح");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).playerjs) {
      const script = document.createElement("script");
      script.src = "https://cdn.embed.ly/player-0.1.0.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (open && lecture) {
      getLessonAttachmentsFn({ data: { lessonId: lecture.id } })
        .then((res: any) => {
          setDbAttachments(res || []);
        })
        .catch(() => {});
      getBrandingByLessonFn({ data: { lessonId: lecture.id } })
        .then((res: any) => {
          setBrandingData(res);
        })
        .catch(() => {});
      getBunnyConfigFn()
        .then((cfg: any) => {
          if (cfg?.libraryId) setBunnyLibraryId(cfg.libraryId);
        })
        .catch(() => {});

      const user = getCurrentUser();
      if (user) {
        getStudentCodeFn({ data: { email: user.email } })
          .then((res: any) => {
            if (res && res.studentCode) setStudentCode(res.studentCode);
          })
          .catch(() => {});
      }
    }
  }, [open, lecture]);

  useEffect(() => {
    if (open && !hasMandatoryExamBlocked) {
      const positions = [
        { top: "15%", left: "15%" },   // Top left
        { top: "15%", left: "85%" },   // Top right
        { top: "85%", left: "15%" },   // Bottom left
        { top: "85%", left: "85%" },   // Bottom right
        { top: "50%", left: "50%" },   // Center
      ];
      let idx = 0;
      const interval = setInterval(() => {
        idx = (idx + 1) % positions.length;
        setWatermarkPos(positions[idx]);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [open, hasMandatoryExamBlocked]);

  useEffect(() => {
    if (open && lecture) {
      const user = getCurrentUser();
      if (user) {
        getPlaybackProgressFn({ data: { email: user.email, lessonId: lecture.id } })
          .then((progress: any) => {
            if (progress?.currentSecond) setSavedSecond(progress.currentSecond);
          })
          .catch(() => {});

        getVideoNotesFn({ data: { email: user.email } })
          .then((notes: any) => {
            setVideoNotes(notes || []);
          })
          .catch(() => {});
      }
      if (lecture.videoId) {
        getBunnySignedUrlFn({ data: { videoId: lecture.videoId } })
          .then((res: any) => {
            if (res?.signedUrl) setVideoPlayUrl(res.signedUrl);
          })
          .catch(() => {});
      }
    }
  }, [open, lecture]);

  useEffect(() => {
    let interval: any = null;
    if (open && lecture && !hasMandatoryExamBlocked) {
      const user = getCurrentUser();
      if (user) {
        interval = setInterval(() => {
          let currentSec = 0;
          let totalDuration = lecture.duration || 0;
          if (videoRef.current) {
            currentSec = videoRef.current.currentTime;
            totalDuration = videoRef.current.duration || totalDuration;
          } else if (playerRef.current) {
            try {
              playerRef.current.getCurrentTime((val: number) => {
                currentSec = val;
              });
              playerRef.current.getDuration((val: number) => {
                totalDuration = val || totalDuration;
              });
            } catch {}
          }
          if (currentSec > 0 && totalDuration > 0) {
            const watchedPct = Math.min(Math.round((currentSec / totalDuration) * 100), 100);
            const isPreview = typeof window !== "undefined" && sessionStorage.getItem("student_preview_mode") === "true";
            if (isPreview) {
              try {
                const mockProg = JSON.parse(sessionStorage.getItem("preview_progress") || "{}");
                mockProg[lecture.id] = {
                  watchedPercentage: watchedPct,
                  lastViewedAt: new Date().toISOString(),
                  second: Math.round(currentSec),
                  duration: Math.round(totalDuration),
                  completed: watchedPct >= 90,
                };
                sessionStorage.setItem("preview_progress", JSON.stringify(mockProg));
                window.dispatchEvent(new Event("preview_progress_updated"));
              } catch (e) {
                console.error("Failed to save preview progress:", e);
              }
            } else {
              savePlaybackProgressFn({
                data: {
                  email: user.email,
                  courseId: lecture.id.includes("demo-math") ? "demo-math-2026" : courseId || "1",
                  lessonId: lecture.id,
                  second: Math.round(currentSec),
                  speed: playbackSpeed,
                  duration: Math.round(totalDuration),
                },
              }).catch(() => {});
            }
          }
        }, 12000);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, lecture, hasMandatoryExamBlocked]);

  useEffect(() => {
    let player: any = null;
    const initPlayer = () => {
      if (iframeRef.current && (window as any).playerjs) {
        try {
          player = new (window as any).playerjs.Player(iframeRef.current);
          playerRef.current = player;
          player.on("ready", () => {
            if (savedSecond > 0) player.setCurrentTime(savedSecond);
            player.on("play", () => handlePlayPauseAnalytics("PLAY"));
            player.on("pause", () => handlePlayPauseAnalytics("PAUSE"));
          });
        } catch (err) {}
      }
    };
    if (open && lecture && !hasMandatoryExamBlocked && videoPlayUrl) setTimeout(initPlayer, 1000);
  }, [open, lecture, hasMandatoryExamBlocked, videoPlayUrl, savedSecond]);

  const handlePlayPauseAnalytics = (event: "PLAY" | "PAUSE") => {
    const user = getCurrentUser();
    if (!user || !lecture) return;
    const cacheKey = `${user.email}_${lecture.id}_${event}`;
    const now = Date.now();
    const lastTime = playPauseThrottleCache.get(cacheKey) || 0;
    if (now - lastTime < 5000) return;
    playPauseThrottleCache.set(cacheKey, now);
    incrementPlayPauseAnalyticsFn({
      data: { email: user.email, lessonId: lecture.id, event },
    }).catch(() => {});
  };

  const handleNativeVideoLoadedMetadata = () => {
    if (videoRef.current && savedSecond > 0) videoRef.current.currentTime = savedSecond;
  };
  const handleToggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) containerRef.current.requestFullscreen();
      else document.exitFullscreen();
    }
  };

  const handleDownloadAttachment = async (att: any) => {
    const user = getCurrentUser();
    if (user) {
      trackDownloadFn({ data: { attachmentId: att.id, studentEmail: user.email } }).catch(() => {});
    }
    const isPdf = att.fileUrl?.toLowerCase().includes(".pdf") || att.name?.toLowerCase().includes(".pdf");
    if (isPdf && studentCode) {
      await watermarkPdf(att.fileUrl, studentCode, att.name);
    } else {
      window.open(att.fileUrl, "_blank");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!lecture) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-4xl w-[95vw] rounded-3xl p-0 overflow-hidden bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-900/80 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full text-neutral-450 hover:text-white hover:bg-neutral-800 transition-all ml-2"
              title="إغلاق"
            >
              <ArrowLeft className="size-5" />
            </button>
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-850 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-bold transition-all border border-neutral-800"
            >
              <span>السابق</span>
              <ChevronRight className="size-4 rotate-180" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-850 hover:bg-neutral-850 disabled:opacity-30 disabled:hover:bg-transparent text-xs font-bold transition-all border border-neutral-800"
            >
              <ChevronRight className="size-4" />
              <span>التالي</span>
            </button>
          </div>
          <div className="text-right">
            <h2 className="font-display text-base font-black text-neutral-100 line-clamp-1">
              {lecture.title}
            </h2>
            <span className="text-[10px] text-amber-500 font-bold block mt-0.5 font-display">
              مشغل الفيديو الاحترافي
            </span>
          </div>
        </div>

        <div className="bg-black relative aspect-video w-full flex items-center justify-center">
          {hasMandatoryExamBlocked ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-neutral-900/60 rounded-2xl border border-red-500/20 max-w-md mx-auto my-6 text-neutral-200 shadow-xl">
              <AlertTriangle className="size-12 text-red-500 mb-3 animate-pulse" />
              <h3 className="font-display text-base font-bold text-red-500">
                مشاهدة المحاضرة مقفلة 🔒
              </h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                يجب عليك أولاً إكمال واجتياز الامتحانات الإجبارية المرتبطة بهذا الدرس قبل فتح
                الفيديو.
              </p>
              <button
                onClick={() => setTab("exams")}
                className="mt-5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md"
              >
                الانتقال للامتحانات الآن
              </button>
            </div>
          ) : isCheckingPlayer ? (
            <div className="text-center space-y-2.5">
              <RefreshCw className="size-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs text-neutral-450 font-bold">جاري التحقق من تشغيل تطبيق الحماية Altiora Player...</p>
            </div>
          ) : !isPlayerActive ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-neutral-900/80 rounded-2xl border border-amber-500/20 max-w-lg mx-auto my-4 text-neutral-200 shadow-2xl">
              <img src="/favicon.png" className="size-14 mb-4 object-contain animate-pulse" />
              <h3 className="font-display text-base font-black text-amber-500">
                المشاهدة الآمنة مفعلة 🔒
              </h3>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-md">
                عذراً، لحماية حقوق المحتوى التعليمي ومنع التسريب، لا يُسمح بتشغيل المحاضرات مباشرة عبر متصفح الويب.
                يرجى تشغيل تطبيق <b>Altiora Secure Player</b> على جهازك للمشاهدة.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <a
                  href={`altiora://lesson/${lecture.id}`}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-all shadow-lg flex items-center gap-1.5"
                >
                  <PlayCircle className="size-4 fill-neutral-950" />
                  <span>فتح الدرس في التطبيق</span>
                </a>
                <Link
                  to="/app/downloads/player"
                  onClick={() => onOpenChange(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs transition-all border border-neutral-700 flex items-center gap-1.5"
                >
                  <span>تحميل مشغل الكمبيوتر</span>
                </Link>
                <button
                  onClick={checkPlayerStatus}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs transition-all border border-neutral-800 flex items-center gap-1"
                >
                  <RefreshCw className="size-3.5" />
                  <span>إعادة التحقق</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-[#111827] rounded-2xl border border-amber-500/20 max-w-lg mx-auto my-4 text-neutral-200 shadow-2xl">
              <img src="/favicon.png" className="size-16 mb-4 object-contain animate-bounce" />
              <h3 className="font-display text-base font-black text-neutral-100">
                تطبيق الحماية نشط حالياً!
              </h3>
              <p className="text-xs text-neutral-400 mt-3 leading-relaxed max-w-md">
                تم الكشف عن تشغيل تطبيق Altiora Player بنجاح. اضغط على الزر أدناه للانتقال للمشغل التلقائي والبدء في مشاهدة المحاضرة بأمان.
              </p>
              <a
                href={`altiora://lesson/${lecture.id}`}
                className="mt-6 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black text-xs transition-all shadow-lg flex items-center gap-2"
              >
                <PlayCircle className="size-4.5 fill-neutral-950" />
                <span>شغل المحاضرة الآن داخل التطبيق</span>
              </a>
            </div>
          )}
        </div>

        <div className="bg-neutral-900/90 border-t border-neutral-800">
          <div className="flex border-b border-neutral-800 bg-neutral-900/40">
            <TabBtn
              active={tab === "desc"}
              onClick={() => setTab("desc")}
              icon={<Video className="size-4" />}
              label="الوصف"
            />
            <TabBtn
              active={tab === "files"}
              onClick={() => setTab("files")}
              icon={<Paperclip className="size-4" />}
              label={`الملفات (${dbAttachments.length + (lecture.attachments?.length || 0)})`}
            />
            <TabBtn
              active={tab === "exams"}
              onClick={() => setTab("exams")}
              icon={<ClipboardList className="size-4" />}
              label={`الامتحانات (${lecture.exams?.length || 0})`}
            />
            <TabBtn
              active={tab === "comments"}
              onClick={() => setTab("comments")}
              icon={<MessageSquare className="size-4" />}
              label={`التعليقات (${comments.length})`}
            />
          </div>

          <div className="p-6 max-h-[260px] overflow-y-auto min-h-[140px] text-right">
            {tab === "desc" && (
              <div className="space-y-2.5">
                <h4 className="font-display text-sm font-bold text-neutral-100">{lecture.title}</h4>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                  في هذا الدرس، ستتعرف على الشرح التفصيلي والمنهج المعتمد. يرجى تدوين الملاحظات
                  الهامة والاطلاع على ملفات الشرح المرفقة وحل الامتحانات بعد إتمام المشاهدة.
                </p>
                {lecture.duration && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-850 px-2.5 py-1 text-[10px] text-amber-500 font-bold mt-2 border border-neutral-800">
                    <Clock className="size-3.5" />
                    <span>المدة الإجمالية: {formatTime(lecture.duration)}</span>
                  </div>
                )}
              </div>
            )}
            {tab === "files" && (
              <div className="space-y-3">
                {dbAttachments.length > 0 ||
                (lecture.attachments && lecture.attachments.length > 0) ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dbAttachments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs"
                      >
                        <button
                          onClick={() => handleDownloadAttachment(a)}
                          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 font-bold text-neutral-950 transition-all"
                        >
                          تحميل
                        </button>
                        <div className="flex-1 text-end">
                          <div className="font-black text-neutral-100">{a.name}</div>
                        </div>
                        <Paperclip className="size-4 text-amber-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyMsg
                    icon={<Paperclip className="size-4" />}
                    text="لا توجد ملفات متاحة لهذا الدرس."
                  />
                )}
              </div>
            )}
            {tab === "exams" && (
              <div className="space-y-3">
                {lecture.exams && lecture.exams.length > 0 ? (
                  lecture.exams.map((e) => (
                    <Link
                      key={e.id}
                      to="/app/exams"
                      search={{ examId: e.id }}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs hover:border-neutral-750"
                    >
                      <span className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 font-bold text-neutral-950">
                        ابدأ الآن
                      </span>
                      <span className="font-black text-neutral-100">{e.title}</span>
                    </Link>
                  ))
                ) : (
                  <EmptyMsg
                    icon={<ClipboardList className="size-4" />}
                    text="لا توجد امتحانات مرتبطة بهذا الدرس."
                  />
                )}
              </div>
            )}
            {tab === "comments" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    onClick={handleAddComment}
                    className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-neutral-950"
                  >
                    <Send className="size-4 rotate-180" />
                  </button>
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقك..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-2xl px-4 text-xs"
                  />
                </div>
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex gap-3 bg-neutral-950 border border-neutral-855 p-3.5 rounded-2xl text-xs"
                  >
                    <div className="flex-1 text-right">
                      <div className="font-black text-neutral-250">{c.user}</div>
                      <p className="text-neutral-400 mt-1.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3.5 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${active ? "border-amber-500 text-amber-500 bg-neutral-800/40" : "border-transparent text-neutral-400 hover:text-white"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmptyMsg({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-end gap-2 rounded-xl bg-neutral-900/60 px-4 py-4 text-end text-sm text-neutral-400 border border-neutral-800/50">
      <span>{text}</span>
      {icon}
    </div>
  );
}
