import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudentLayout } from "@/components/app/StudentLayout";
import { isAuthenticated, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { Eye, RotateCcw, XCircle } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPreviewMode(sessionStorage.getItem("student_preview_mode") === "true");
    }
  }, []);

  const handleExitPreview = () => {
    sessionStorage.removeItem("student_preview_mode");
    sessionStorage.removeItem("student_preview_course_id");
    sessionStorage.removeItem("preview_progress");
    sessionStorage.removeItem("preview_attempts");
    toast.success("تم الخروج من وضع معاينة الطالب.");
    navigate({ to: "/teacher/courses" as any });
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !user.sessionId) {
      toast.error("يجب تسجيل الدخول أولاً للوصول إلى لوحة الطالب.");
      navigate({ to: "/login" });
      return;
    }

    const fingerprint = localStorage.getItem("device_fingerprint_id") || "default";

    const checkSession = async () => {
      try {
        const { verifySessionFn } = await import("@/lib/api/auth.functions");
        const res = await verifySessionFn({
          data: {
            email: user.email,
            sessionId: user.sessionId || "",
            deviceFingerprint: fingerprint,
          },
        });

        if (!res.valid) {
          const { clearAuth } = await import("@/lib/auth");
          clearAuth();
          toast.error("تم إنهاء الجلسة أو إلغاء ربط هذا الجهاز. يرجى تسجيل الدخول مجدداً.");
          navigate({ to: "/login" });
          return false;
        }
        return true;
      } catch (err) {
        return true;
      }
    };

    // Initial check
    checkSession().then((isValid) => {
      if (isValid) {
        setReady(true);
      }
    });

    // Heartbeat every 2 minutes (120000ms)
    const interval = setInterval(() => {
      checkSession();
    }, 120000);

    return () => clearInterval(interval);
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Pick-up session...
      </div>
    );
  }

  return (
    <StudentLayout>
      <Outlet />
      
      {/* Student Preview Mode Sticky Banner */}
      {isPreviewMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg bg-black/85 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl flex flex-row-reverse items-center justify-between gap-4 text-white text-xs select-none">
          <div className="flex items-center gap-2 flex-row-reverse text-right">
            <Eye className="size-4 text-amber-500 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-amber-500 block">وضع معاينة الطالب نشط حالياً</span>
              <span className="text-[10px] text-neutral-450 block mt-0.5">لن يتم حفظ أي درجات، اختبارات، أو إنجازات</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-neutral-900 hover:bg-neutral-800 transition-all font-bold cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>تحديث</span>
            </button>
            <button
              onClick={handleExitPreview}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 transition-all font-bold cursor-pointer"
            >
              <XCircle className="size-3.5" />
              <span>إنهاء المعاينة</span>
            </button>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
