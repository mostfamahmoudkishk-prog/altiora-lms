import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, useAnimationControls } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/site/AuthShell";
import { setAuthenticatedSession } from "@/lib/auth";
import { loginServerFn } from "@/lib/api/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | Altiora — نحو القمة" },
      { name: "description", content: "ادخل إلى حسابك في منصة ألتيورا التعليمية." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [remember, setRemember] = useState(true);
  const controls = useAnimationControls();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const pw = String(form.get("password") || "");
    if (!email || !pw) {
      controls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.45 } });
      toast.error("يرجى تعبئة جميع الحقول");
      return;
    }
    setLoading(true);
    try {
      let fingerprint = localStorage.getItem("device_fingerprint_id");
      if (!fingerprint) {
        fingerprint = "dev_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("device_fingerprint_id", fingerprint);
      }

      // Simple browser and OS detection
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      let browser = "Chrome";
      let os = "Windows PC";
      if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
      else if (ua.includes("Edge")) browser = "Edge";

      if (ua.includes("Macintosh")) os = "macOS";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
      else if (ua.includes("Linux")) os = "Linux";

      let res;
      try {
        res = await loginServerFn({
          data: {
            email,
            password: pw,
            deviceFingerprint: fingerprint,
            browser,
            os,
          },
        });
      } catch (err: any) {
        if (err?.message === "ERR_DEVICE_LIMIT_EXCEEDED") {
          const confirmRevoke = window.confirm(
            "تنبيه أمني: حسابك مرتبط بجهاز آخر نشط حالياً. هل تريد إنهاء الجلسة في الجهاز السابق وتفعيل هذا الجهاز؟ (مسموح بجهاز واحد فقط لكل طالب لمنع مشاركة الحساب)",
          );
          if (confirmRevoke) {
            res = await loginServerFn({
              data: {
                email,
                password: pw,
                deviceFingerprint: fingerprint,
                forceBindDevice: true,
                browser,
                os,
              },
            });
          } else {
            setLoading(false);
            toast.error("تم إلغاء عملية الدخول لحماية الحساب من المشاركة.");
            return;
          }
        } else {
          throw err;
        }
      }

      setAuthenticatedSession(
        res.email,
        res.role,
        res.name,
        res.avatarUrl,
        res.sessionId,
        res.studentCode,
        (res as any).id,
      );
      if ((res as any).theme) {
        localStorage.setItem("theme", (res as any).theme);
      }
      if ((res as any).themePreset) {
        localStorage.setItem("theme-preset", (res as any).themePreset);
      }
      setLoading(false);
      setDone(true);
      toast.success("تم تسجيل الدخول بنجاح");

      // Navigate based on role
      setTimeout(() => {
        if (res.role === "SUPER_ADMIN") {
          navigate({ to: "/super-admin" });
        } else if (res.role === "ADMIN") {
          navigate({ to: "/admin" });
        } else if (res.role === "TEACHER") {
          navigate({ to: "/teacher" });
        } else {
          navigate({ to: "/app" });
        }
      }, 500);
    } catch (err: any) {
      setLoading(false);
      controls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.45 } });
      toast.error(err?.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
    }
  }

  return (
    <AuthShell>
      <motion.form animate={controls} onSubmit={onSubmit} className="space-y-4">
        <Field>
          <input
            name="email"
            type="email"
            placeholder="البريد الإلكتروني"
            className="peer h-14 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
        </Field>

        <Field>
          <input
            name="password"
            type={showPw ? "text" : "password"}
            placeholder="أدخل كلمة المرور"
            className="peer h-14 w-full rounded-xl border border-border bg-card px-4 pe-12 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="إظهار كلمة المرور"
          >
            {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </Field>

        <div className="flex items-center justify-between text-sm">
          <a href="#" className="text-primary hover:underline">
            نسيت كلمة المرور؟
          </a>
          <label className="flex items-center gap-2 text-foreground">
            <span>تذكرني</span>
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              className={`flex size-5 items-center justify-center rounded-md border transition-all ${
                remember
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {remember && <Check className="size-3.5" strokeWidth={3} />}
            </button>
          </label>
        </div>

        <motion.button
          type="submit"
          disabled={loading || done}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-elevated transition-all disabled:opacity-90"
        >
          {loading && <Loader2 className="size-5 animate-spin" />}
          {done && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="flex size-6 items-center justify-center rounded-full bg-success text-success-foreground"
            >
              <Check className="size-4" strokeWidth={3} />
            </motion.span>
          )}
          <span>{done ? "تم!" : loading ? "جاري الدخول..." : "تسجيل الدخول"}</span>
        </motion.button>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          باستخدامك للمنصة فأنت توافق على{" "}
          <Link to="/privacy" className="text-foreground hover:underline">
            سياسة الخصوصية
          </Link>{" "}
          و
          <Link to="/terms" className="text-foreground hover:underline">
            {" "}
            شروط الاستخدام
          </Link>
        </p>
        <p className="text-center text-sm">
          <span className="text-muted-foreground">ليس لديك حساب؟ </span>
          <Link to="/register" className="font-semibold text-primary hover:underline">
            حساب جديد
          </Link>
        </p>
      </motion.form>
    </AuthShell>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}
