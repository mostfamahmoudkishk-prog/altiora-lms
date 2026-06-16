import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, useAnimationControls } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/site/AuthShell";
import { registerServerFn } from "@/lib/api/auth.functions";
import { setAuthenticatedSession } from "@/lib/auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "حساب جديد | Altiora — نحو القمة" },
      {
        name: "description",
        content: "أنشئ حسابك في منصة ألتيورا التعليمية وابدأ رحلتك التعليمية.",
      },
    ],
  }),
  component: RegisterPage,
});

const STAGE_GRADES: Record<string, string[]> = {
  ابتدائي: [
    "الصف الأول الابتدائي",
    "الصف الثاني الابتدائي",
    "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي",
    "الصف الخامس الابتدائي",
    "الصف السادس الابتدائي",
  ],
  إعدادي: ["الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي"],
  ثانوي: ["الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"],
  جامعي: [],
};

function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [stage, setStage] = useState<string>("");
  const controls = useAnimationControls();

  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    type: "", // gender
    stage: "",
    grade: "",
    phone: "",
    phoneGuardian: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const total = 2;
  const progress = ((step + 1) / total) * 100;
  const grades = stage ? STAGE_GRADES[stage] : [];
  const showGrade = stage && stage !== "جامعي";

  // Validate a single field
  const validateField = (name: string, value: string, currentValues = values) => {
    switch (name) {
      case "name":
        if (!value.trim()) return "الاسم مطلوب";
        if (value.trim().length < 2) return "يجب أن يحتوي الاسم على حرفين على الأقل";
        return "";
      case "email": {
        if (!value.trim()) return "البريد الإلكتروني مطلوب";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return "يرجى إدخال بريد إلكتروني صحيح";
        return "";
      }
      case "password":
        if (!value) return "كلمة المرور مطلوبة";
        if (value.length < 6) return "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل";
        return "";
      case "confirm":
        if (!value) return "تأكيد كلمة المرور مطلوب";
        if (value !== currentValues.password) return "كلمتا المرور غير متطابقتين";
        return "";
      case "type":
        if (!value) return "النوع مطلوب";
        return "";
      case "stage":
        if (!value) return "المرحلة الدراسية مطلوبة";
        return "";
      case "grade":
        if (stage && stage !== "جامعي" && !value) return "الصف الدراسي مطلوب";
        return "";
      case "phone":
        if (!value.trim()) return "رقم الهاتف مطلوب";
        return "";
      case "phoneGuardian":
        if (!value.trim()) return "رقم هاتف ولي الأمر مطلوب";
        return "";
      default:
        return "";
    }
  };

  // Validate step fields
  const validateStep = (s: number, currentValues = values) => {
    const stepErrors: Record<string, string> = {};
    if (s === 0) {
      const nameErr = validateField("name", currentValues.name, currentValues);
      if (nameErr) stepErrors.name = nameErr;

      const emailErr = validateField("email", currentValues.email, currentValues);
      if (emailErr) stepErrors.email = emailErr;

      const pwErr = validateField("password", currentValues.password, currentValues);
      if (pwErr) stepErrors.password = pwErr;

      const confirmErr = validateField("confirm", currentValues.confirm, currentValues);
      if (confirmErr) stepErrors.confirm = confirmErr;
    } else {
      const typeErr = validateField("type", currentValues.type, currentValues);
      if (typeErr) stepErrors.type = typeErr;

      const stageErr = validateField("stage", currentValues.stage, currentValues);
      if (stageErr) stepErrors.stage = stageErr;

      if (showGrade) {
        const gradeErr = validateField("grade", currentValues.grade, currentValues);
        if (gradeErr) stepErrors.grade = gradeErr;
      }

      const phoneErr = validateField("phone", currentValues.phone, currentValues);
      if (phoneErr) stepErrors.phone = phoneErr;

      const guardianErr = validateField(
        "phoneGuardian",
        currentValues.phoneGuardian,
        currentValues,
      );
      if (guardianErr) stepErrors.phoneGuardian = guardianErr;
    }
    return stepErrors;
  };

  // Handles real-time typing validation
  const handleChange = (field: string, val: string) => {
    const updatedValues = { ...values, [field]: val };

    // Custom sync for stage/grade
    if (field === "stage") {
      setStage(val);
      updatedValues.grade = ""; // Reset grade if stage changes
    }

    setValues(updatedValues);

    // Validate in real-time
    const err = validateField(field, val, updatedValues);
    setErrors((prev) => ({ ...prev, [field]: err }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, (values as any)[field]);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);

    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...stepErrors }));
      controls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.45 } });
      toast.error("يرجى تصحيح الأخطاء وتعبئة جميع الحقول المطلوبة.");
      return;
    }

    if (step < total - 1) {
      setStep((s) => s + 1);
      setSubmitted(false); // Reset submit status for next step
      return;
    }

    setLoading(true);
    try {
      const finalGrade = values.stage === "جامعي" ? "جامعي" : values.grade;
      let fingerprint = localStorage.getItem("device_fingerprint_id");
      if (!fingerprint) {
        fingerprint = "dev_" + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("device_fingerprint_id", fingerprint);
      }

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

      const res = await registerServerFn({
        data: {
          name: values.name,
          email: values.email,
          password: values.password,
          gender: values.type,
          stage: values.stage,
          grade: finalGrade,
          phone: values.phone,
          phoneGuardian: values.phoneGuardian,
          deviceFingerprint: fingerprint,
          browser,
          os,
        },
      });

      // Save session info to localStorage and cookie
      setAuthenticatedSession(
        res.email,
        res.role,
        res.name,
        res.avatarUrl,
        res.sessionId,
        res.studentCode,
      );

      // Save other fields to altiora_profile local storage for Profile Page compatibility
      const profileState = {
        id: res.sessionId || "107539",
        name: values.name,
        email: values.email,
        phone: values.phone,
        grade: finalGrade,
        password: values.password,
        avatar: null,
      };
      localStorage.setItem("altiora_profile", JSON.stringify(profileState));

      setLoading(false);
      setDone(true);
      toast.success("تم إنشاء الحساب بنجاح 🎉");
      setTimeout(() => navigate({ to: "/app" }), 500);
    } catch (err: any) {
      setLoading(false);
      controls.start({ x: [0, -8, 8, -6, 6, 0], transition: { duration: 0.45 } });
      toast.error(err?.message || "فشل إنشاء الحساب. يرجى مراجعة البيانات.");
    }
  }

  return (
    <AuthShell>
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            الخطوة {step + 1} من {total}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <motion.form animate={controls} onSubmit={onSubmit} className="space-y-4">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          {step === 0 ? (
            <>
              <Underlined>
                <input
                  name="name"
                  placeholder="الاسم بالكامل"
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  className={`auth-underline transition-all ${
                    errors.name && (touched.name || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                      : ""
                  }`}
                />
                {errors.name && (touched.name || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.name}
                  </p>
                )}
              </Underlined>

              <Underlined>
                <input
                  name="email"
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={values.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`auth-underline transition-all ${
                    errors.email && (touched.email || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                      : ""
                  }`}
                />
                {errors.email && (touched.email || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.email}
                  </p>
                )}
              </Underlined>

              <Underlined>
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="أدخل كلمة المرور"
                  value={values.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  className={`auth-underline pe-10 transition-all ${
                    errors.password && (touched.password || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute end-3 top-[18px] -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
                {errors.password && (touched.password || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.password}
                  </p>
                )}
              </Underlined>

              <Underlined>
                <input
                  name="confirm"
                  type="password"
                  placeholder="تأكيد كلمة المرور"
                  value={values.confirm}
                  onChange={(e) => handleChange("confirm", e.target.value)}
                  onBlur={() => handleBlur("confirm")}
                  className={`auth-underline pe-10 transition-all ${
                    errors.confirm && (touched.confirm || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                      : ""
                  }`}
                />
                <EyeOff className="absolute end-3 top-[18px] size-5 -translate-y-1/2 text-muted-foreground" />
                {errors.confirm && (touched.confirm || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.confirm}
                  </p>
                )}
              </Underlined>
            </>
          ) : (
            <>
              <Underlined>
                <select
                  name="type"
                  value={values.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  onBlur={() => handleBlur("type")}
                  className={`auth-underline appearance-none transition-all ${
                    errors.type && (touched.type || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                      : ""
                  }`}
                >
                  <option value="">النوع</option>
                  <option>ذكر</option>
                  <option>أنثى</option>
                </select>
                {errors.type && (touched.type || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.type}
                  </p>
                )}
              </Underlined>

              <Underlined>
                <select
                  name="stage"
                  value={values.stage}
                  onChange={(e) => handleChange("stage", e.target.value)}
                  onBlur={() => handleBlur("stage")}
                  className={`auth-underline appearance-none transition-all ${
                    errors.stage && (touched.stage || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                      : ""
                  }`}
                >
                  <option value="">المرحلة الدراسية</option>
                  <option value="ابتدائي">ابتدائي</option>
                  <option value="إعدادي">إعدادي</option>
                  <option value="ثانوي">ثانوي</option>
                  <option value="جامعي">جامعي</option>
                </select>
                {errors.stage && (touched.stage || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.stage}
                  </p>
                )}
              </Underlined>

              {showGrade && (
                <Underlined>
                  <select
                    name="grade"
                    value={values.grade}
                    onChange={(e) => handleChange("grade", e.target.value)}
                    onBlur={() => handleBlur("grade")}
                    className={`auth-underline appearance-none transition-all ${
                      errors.grade && (touched.grade || submitted)
                        ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus:border-destructive"
                        : ""
                    }`}
                  >
                    <option value="">الصف الدراسي</option>
                    {grades.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.grade && (touched.grade || submitted) && (
                    <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                      {errors.grade}
                    </p>
                  )}
                </Underlined>
              )}

              <Underlined>
                <div
                  className={`flex items-center gap-3 transition-all ${
                    errors.phone && (touched.phone || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus-within:border-destructive"
                      : ""
                  }`}
                >
                  <span className="text-lg">🇪🇬</span>
                  <input
                    name="phone"
                    placeholder="رقم الهاتف"
                    value={values.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    className="auth-underline flex-1 border-b-0 focus:border-b-0 py-2.5"
                  />
                </div>
                {errors.phone && (touched.phone || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.phone}
                  </p>
                )}
              </Underlined>

              <Underlined>
                <div
                  className={`flex items-center gap-3 transition-all ${
                    errors.phoneGuardian && (touched.phoneGuardian || submitted)
                      ? "border border-destructive px-3 rounded-xl bg-destructive/5 focus-within:border-destructive"
                      : ""
                  }`}
                >
                  <span className="text-lg">🇪🇬</span>
                  <input
                    name="phoneGuardian"
                    placeholder="رقم هاتف ولي الأمر"
                    value={values.phoneGuardian}
                    onChange={(e) => handleChange("phoneGuardian", e.target.value)}
                    onBlur={() => handleBlur("phoneGuardian")}
                    className="auth-underline flex-1 border-b-0 focus:border-b-0 py-2.5"
                  />
                </div>
                {errors.phoneGuardian && (touched.phoneGuardian || submitted) && (
                  <p className="mt-1.5 text-xs text-destructive text-end font-semibold">
                    {errors.phoneGuardian}
                  </p>
                )}
              </Underlined>
            </>
          )}
        </motion.div>

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="h-13 flex-1 rounded-xl border border-border bg-card py-3.5 text-base font-bold text-foreground transition-colors hover:bg-secondary"
            >
              السابق
            </button>
          )}
          <motion.button
            type="submit"
            disabled={loading || done}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="relative flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-elevated transition-all disabled:opacity-90"
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
            <span>
              {done
                ? "تم!"
                : loading
                  ? "جاري الإنشاء..."
                  : step < total - 1
                    ? "التالي"
                    : "إنشاء حساب"}
            </span>
          </motion.button>
        </div>

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
          <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
          <Link to="/login" className="font-semibold text-primary hover:underline">
            سجل الدخول
          </Link>
        </p>
      </motion.form>
    </AuthShell>
  );
}

function Underlined({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}
