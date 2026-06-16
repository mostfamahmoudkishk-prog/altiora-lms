import React, { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { 
  Play, BookOpen, LogOut, Shield, Laptop, 
  User, Mail, Calendar, Key, AlertTriangle, 
  ArrowRight, Minimize2, Square, X, RefreshCw
} from "lucide-react";

declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      getDeviceFingerprint: () => Promise<{
        deviceId: string;
        cpu: string;
        os: string;
        hostname: string;
        username: string;
        isWindows: boolean;
      }>;
      toggleContentProtection: (enabled: boolean) => void;
      onOpenLesson: (callback: (lessonId: string) => void) => void;
      logSecurityEvent: (event: string, details: string) => void;
      onRecordingDetected: (callback: (detected: boolean, appName: string) => void) => void;
    };
  }
}

// Target server config
const DEFAULT_SERVER_URL = "http://localhost:3000";

export default function App() {
  const [serverUrl] = useState(() => {
    return localStorage.getItem("altiora_server_url") || DEFAULT_SERVER_URL;
  });
  
  // Navigation states
  const [currentPage, setCurrentPage] = useState<"login" | "courses" | "lessons" | "player">("login");
  const [token, setToken] = useState(() => localStorage.getItem("altiora_player_token") || "");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Course/Lesson selection
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  
  // Login form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Device & fingerprint states
  const [fingerprint, setFingerprint] = useState<any>(null);
  const [deviceError, setDeviceError] = useState("");
  
  // Security & Player States
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: "20%", left: "20%" });
  const [videoUrl, setVideoUrl] = useState("");
  const [playerError, setPlayerError] = useState("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize deep links & recording monitors
  useEffect(() => {
    // 1. Resolve fingerprint
    window.electronAPI.getDeviceFingerprint().then((res) => {
      setFingerprint(res);
    }).catch(console.error);

    // 2. Setup deep links
    window.electronAPI.onOpenLesson((lessonId) => {
      console.log("Renderer received deep link for lesson:", lessonId);
      if (token) {
        openLessonById(lessonId);
      } else {
        localStorage.setItem("altiora_pending_lesson_id", lessonId);
        setCurrentPage("login");
      }
    });

    // 3. Monitor screen recorder status
    window.electronAPI.onRecordingDetected((detected, appName) => {
      if (detected) {
        setSecurityWarning(`تم اكتشاف برنامج تسجيل شاشة نشط: (${appName}). تم إيقاف تشغيل المحاضرة مؤقتاً لحماية المحتوى.`);
        if (videoRef.current) {
          videoRef.current.pause();
        }
        window.electronAPI.logSecurityEvent("SCREEN_RECORDER_DETECTED", `Process running: ${appName}`);
      } else {
        setSecurityWarning(null);
      }
    });

    // 4. Try to load user profile on start
    if (token) {
      loadProfileAndVerify();
    }
  }, [token]);

  // Randomize video watermark position every 7 seconds
  useEffect(() => {
    if (currentPage === "player") {
      const interval = setInterval(() => {
        const top = Math.floor(Math.random() * 70 + 10) + "%";
        const left = Math.floor(Math.random() * 70 + 10) + "%";
        setWatermarkPos({ top, left });
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [currentPage]);

  // Load and verify profile
  const loadProfileAndVerify = async () => {
    try {
      setLoading(true);
      const finger = fingerprint || await window.electronAPI.getDeviceFingerprint();
      
      // Register/Verify device
      const devRes = await fetch(`${serverUrl}/api/player/verify-device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceId: finger.deviceId,
          cpu: finger.cpu,
          os: finger.os,
          hostname: finger.hostname
        })
      });

      if (!devRes.ok) {
        const err = await devRes.json();
        setDeviceError(err.error || "فشل التحقق من الجهاز. قد تكون تجاوزت الحد الأقصى للأجهزة.");
        handleLogout();
        return;
      }

      // Fetch user profile info
      const profRes = await fetch(`${serverUrl}/api/player/auth/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!profRes.ok) {
        handleLogout();
        return;
      }

      const prof = await profRes.json();
      setCurrentUser(prof.user);
      
      // Check for deep links pending after login redirect
      const pendingLessonId = localStorage.getItem("altiora_pending_lesson_id");
      if (pendingLessonId) {
        localStorage.removeItem("altiora_pending_lesson_id");
        openLessonById(pendingLessonId);
      } else {
        loadCourses();
      }
    } catch (err) {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/player/courses`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
        setCurrentPage("courses");
      }
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setDeviceError("");
    setLoading(true);

    try {
      const res = await fetch(`${serverUrl}/api/player/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "خطأ في تسجيل الدخول. يرجى التحقق من بياناتك.");
        setLoading(false);
        return;
      }

      localStorage.setItem("altiora_player_token", data.token);
      setToken(data.token);
      // loadProfileAndVerify will fire on token change hook
    } catch (err) {
      setLoginError("فشل الاتصال بالخادم. تأكد من أنك متصل بالإنترنت.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("altiora_player_token");
    setToken("");
    setCurrentUser(null);
    setCurrentPage("login");
    cleanupPlayer();
  };

  const openLessonById = async (lessonId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${serverUrl}/api/player/open-lesson/${lessonId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Failed to load lesson");
      }
      const data = await res.json();
      setSelectedCourse(data.course);
      setSelectedLesson(data.lesson);
      
      // Load modules
      const modRes = await fetch(`${serverUrl}/api/player/course/${data.course.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (modRes.ok) {
        const mData = await modRes.json();
        setModules(mData.modules || []);
      }

      playLessonVideo(data.lesson);
    } catch {
      loadCourses();
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course: any) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/player/course/${course.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setModules(data.modules || []);
        setCurrentPage("lessons");
      }
    } catch {}
    setLoading(false);
  };

  const playLessonVideo = async (lesson: any) => {
    setSelectedLesson(lesson);
    setPlayerError("");
    setVideoUrl("");
    cleanupPlayer();
    setCurrentPage("player");

    await fetchSignedVideoUrl(lesson.id);

    // Setup 4-minute periodic signed url refresh
    tokenRefreshIntervalRef.current = setInterval(() => {
      fetchSignedVideoUrl(lesson.id);
    }, 4 * 60 * 1000);
  };

  const fetchSignedVideoUrl = async (lessonId: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/player/get-video-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ lessonId })
      });

      if (!res.ok) {
        const err = await res.json();
        setPlayerError(err.error || "فشل الحصول على رابط الفيديو الآمن.");
        return;
      }

      const data = await res.json();
      if (data.signedUrl) {
        setVideoUrl(data.signedUrl);
        initHls(data.signedUrl);
      }
    } catch {
      setPlayerError("فشل تحميل الفيديو. يرجى التحقق من اتصالك بالإنترنت.");
    }
  };

  const initHls = (url: string) => {
    setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr) => {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(console.warn);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                cleanupPlayer();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.play().catch(console.warn);
      }

      // Progress tracker
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        if (video && !video.paused && video.currentTime > 0) {
          syncProgress(video.currentTime, video.duration || 240);
        }
      }, 15000); // sync progress every 15 seconds
    }, 200);
  };

  const syncProgress = async (currentTime: number, duration: number) => {
    if (!selectedLesson) return;
    try {
      await fetch(`${serverUrl}/api/player/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId: selectedLesson.id,
          watchedSeconds: Math.round(currentTime),
          totalSeconds: Math.round(duration)
        })
      });
    } catch {}
  };

  const cleanupPlayer = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
  };

  const handleBackToLessons = () => {
    cleanupPlayer();
    setCurrentPage("lessons");
  };

  const handleBackToCourses = () => {
    cleanupPlayer();
    setCurrentPage("courses");
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0f19] text-right" dir="rtl">
      {/* frameless window control title bar */}
      <div className="titlebar">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
          <Shield className="size-3.5 text-amber-500" />
          <span>مشغل التيورا الآمن - Altiora Secure Player</span>
        </div>
        <div className="titlebar-buttons">
          <button onClick={() => window.electronAPI.minimize()} className="titlebar-btn titlebar-minimize" title="تصغير" />
          <button onClick={() => window.electronAPI.maximize()} className="titlebar-btn titlebar-maximize" title="تكبير" />
          <button onClick={() => window.electronAPI.close()} className="titlebar-btn titlebar-close" title="إغلاق" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Recording alert security blocking banner */}
        {securityWarning && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="size-16 text-red-500 animate-bounce mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">انتهاك حماية المحتوى التعليمي</h2>
            <p className="text-sm text-neutral-400 max-w-md">{securityWarning}</p>
            <p className="text-xs text-neutral-500 mt-4">يرجى إغلاق برنامج التسجيل لمتابعة العرض.</p>
          </div>
        )}

        {/* 1. LOGIN SCREEN */}
        {currentPage === "login" && (
          <div className="h-full flex items-center justify-center p-6 bg-radial-gradient">
            <div className="w-full max-w-md bg-[#111827] border border-[#1f2937] p-8 rounded-2xl shadow-2xl">
              <div className="text-center mb-6 space-y-3">
                <img src="./favicon.png" className="size-16 mx-auto object-contain" />
                <h1 className="text-2xl font-bold text-amber-500 tracking-wider">ALTIORA</h1>
                <p className="text-xs text-neutral-400 mt-1">سجل الدخول بحسابك لمشاهدة المحاضرات المحمية</p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
                  {loginError}
                </div>
              )}

              {deviceError && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 text-center">
                  {deviceError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs text-neutral-400 font-semibold mb-1">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="student@altiora.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 font-semibold mb-1">كلمة المرور</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-primary flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? <RefreshCw className="size-4 animate-spin" /> : "تسجيل الدخول"}
                </button>
              </form>

              {fingerprint && (
                <div className="mt-8 pt-4 border-t border-gray-800 text-[10px] text-neutral-500 flex flex-row-reverse justify-between items-center">
                  <span>بصمة الجهاز: {fingerprint.deviceId.substring(0, 12)}...</span>
                  <span>نظام التشغيل: {fingerprint.os}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. COURSES GRID SCREEN */}
        {currentPage === "courses" && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <button onClick={handleLogout} className="btn-secondary flex items-center gap-1">
                <LogOut className="size-4" />
                <span>خروج</span>
              </button>
              <div className="text-right">
                <h2 className="text-xl font-bold text-foreground">دوراتك المشترك بها</h2>
                <p className="text-xs text-neutral-400 mt-0.5">اختر دورة لاستعراض المحاضرات</p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-neutral-500">جاري التحميل...</div>
            ) : courses.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center text-neutral-500">
                <BookOpen className="size-12 mb-3 text-neutral-600" />
                <span>لا توجد أي كورسات نشطة في حسابك حالياً.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((c: any) => (
                  <div 
                    key={c.id} 
                    onClick={() => selectCourse(c)}
                    className="bg-[#111827] border border-[#1f2937] rounded-2xl overflow-hidden shadow-lg hover:border-amber-500/50 cursor-pointer transition-all flex flex-col"
                  >
                    <div className="aspect-video w-full bg-neutral-900 relative">
                      {c.coverImage ? (
                        <img src={c.coverImage} alt={c.title} className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-neutral-700">No Cover</div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <h3 className="font-bold text-sm text-foreground line-clamp-1">{c.title}</h3>
                      <p className="text-xs text-neutral-450 mt-1 line-clamp-2">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. LESSONS LIST SCREEN */}
        {currentPage === "lessons" && selectedCourse && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <button onClick={handleBackToCourses} className="btn-secondary flex items-center gap-1">
                <ArrowRight className="size-4" />
                <span>رجوع للكورسات</span>
              </button>
              <div className="text-right">
                <h2 className="text-xl font-bold text-foreground">{selectedCourse.title}</h2>
                <p className="text-xs text-neutral-400 mt-0.5">منهج الدورة وقائمة المحاضرات</p>
              </div>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center text-sm text-neutral-500 font-bold">جاري تحميل المحاضرات...</div>
            ) : modules.length === 0 ? (
              <div className="text-center py-12 text-sm text-neutral-500">لم يتم إضافة أي وحدات دراسية بعد.</div>
            ) : (
              <div className="space-y-6">
                {modules.map((mod: any) => (
                  <div key={mod.id} className="bg-[#111827] border border-[#1f2937] rounded-2xl overflow-hidden p-4 space-y-3">
                    <h3 className="font-bold text-sm text-amber-500 border-r-2 border-amber-500 pr-2">{mod.title}</h3>
                    <div className="divide-y divide-gray-800">
                      {mod.lessons.map((les: any) => (
                        <div 
                          key={les.id} 
                          onClick={() => playLessonVideo(les)}
                          className="py-3 flex flex-row-reverse items-center justify-between hover:bg-neutral-800/30 px-2 rounded-lg cursor-pointer transition-all"
                        >
                          <div className="flex flex-row-reverse items-center gap-3">
                            <div className="size-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                              <Play className="size-4 fill-amber-500" />
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-foreground block">{les.title}</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-neutral-500">عرض المحاضرة</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SECURE VIDEO PLAYER SCREEN */}
        {currentPage === "player" && selectedLesson && (
          <div className="h-full flex flex-col bg-black relative">
            {/* Top header navigation overlay */}
            <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
              <button onClick={handleBackToLessons} className="btn-secondary flex items-center gap-1 bg-black/60 border-neutral-700 hover:bg-black/80">
                <X className="size-4" />
                <span>إغلاق المحاضرة</span>
              </button>
              <div className="text-right text-white">
                <h3 className="text-sm font-bold">{selectedLesson.title}</h3>
                <span className="text-[10px] text-neutral-400 block mt-0.5">{selectedCourse?.title}</span>
              </div>
            </div>

            {/* Video core container */}
            <div className="flex-1 flex items-center justify-center relative bg-black">
              {playerError ? (
                <div className="text-center p-6 max-w-sm">
                  <AlertTriangle className="size-12 text-yellow-500 mx-auto mb-2 animate-bounce" />
                  <p className="text-sm text-neutral-300">{playerError}</p>
                </div>
              ) : !videoUrl ? (
                <div className="text-center space-y-4">
                  <img src="./favicon.png" className="size-16 mx-auto animate-pulse object-contain" />
                  <p className="text-xs text-amber-500 font-bold">جاري الاتصال بقناة البث الآمن لـ Altiora...</p>
                </div>
              ) : (
                <div className="size-full relative flex items-center justify-center">
                  <video 
                    ref={videoRef} 
                    controls 
                    controlsList="nodownload noremoteplayback" 
                    disablePictureInPicture
                    className="size-full object-contain"
                  />

                  {/* Dynamic low-opacity moving anti-piracy watermark overlay */}
                  {currentUser && fingerprint && (
                    <div 
                      className="absolute z-20 pointer-events-none select-none text-right flex flex-col text-[11px] font-bold text-white/10"
                      style={{ 
                        top: watermarkPos.top, 
                        left: watermarkPos.left,
                        textShadow: "1px 1px 1px rgba(0,0,0,0.5)",
                        transition: "top 1s ease, left 1s ease"
                      }}
                    >
                      <span className="flex items-center gap-1 justify-end">
                        <User className="size-3" /> {currentUser.name}
                      </span>
                      <span className="flex items-center gap-1 justify-end mt-0.5">
                        <Mail className="size-3" /> {currentUser.email}
                      </span>
                      <span className="flex items-center gap-1 justify-end mt-0.5">
                        <Laptop className="size-3" /> ID: {fingerprint.deviceId.substring(0, 16)}
                      </span>
                      <span className="flex items-center gap-1 justify-end mt-0.5">
                        <Calendar className="size-3" /> {new Date().toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
