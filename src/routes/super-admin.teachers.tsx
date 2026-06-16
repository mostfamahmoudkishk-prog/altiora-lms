import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Key,
  Smartphone,
  Eye,
  X,
  MoreVertical,
  Activity,
  UserX,
  UserCheck,
  Coins,
  BookOpen,
  Calendar,
  Lock,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminGetTeachersListFn,
  adminImpersonateTeacherFn,
  adminResetPasswordFn,
  adminUpdateDeviceLimitFn,
  adminToggleBanUserFn,
  adminForceLogoutFn,
} from "@/lib/api/db.functions";
import { startSimulationFn } from "@/lib/api/simulation.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/super-admin/teachers")({
  component: SuperAdminTeachers,
});

interface TeacherItem {
  id: string;
  email: string;
  isBanned: boolean;
  deviceLimit: number;
  averageRating: number;
  reviewsCount: number;
  profile?: {
    name: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
  };
  instructorBranding?: {
    enabled: boolean;
    brandName: string | null;
  } | null;
  courseInstructors?: any[];
  loginHistories?: any[];
  devices?: any[];
}

function SuperAdminTeachers() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);
  const [modalType, setModalType] = useState<"DEVICES" | "PASSWORD" | "LIMIT" | "SIMULATION" | null>(null);

  // Form Inputs
  const [newPassword, setNewPassword] = useState("");
  const [deviceLimitInput, setDeviceLimitInput] = useState(1);
  const [simMode, setSimMode] = useState<"READ_ONLY" | "INTERACTIVE_TEST" | "LIVE_CONTROL">("READ_ONLY");
  const [simReason, setSimReason] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [doubleConfirmLive, setDoubleConfirmLive] = useState(false);

  const handleStartSimulation = async () => {
    if (!activeTeacher) return;
    if (!simReason || simReason.trim().length < 5) {
      toast.error("الرجاء إدخال سبب مقنع ومفصل لبدء المحاكاة.");
      return;
    }
    if (!adminPasswordConfirm) {
      toast.error("الرجاء إدخال كلمة مرور الإدارة لتأكيد الإجراء.");
      return;
    }
    if (simMode === "LIVE_CONTROL" && !doubleConfirmLive) {
      toast.error("يجب الإقرار بمسؤولية التعديل المباشر لتفعيل وضع التحكم.");
      return;
    }

    try {
      toast.loading("جاري بدء جلسة المحاكاة الأمنية...");
      const res = await startSimulationFn({
        data: {
          targetUserId: activeTeacher.id,
          targetRole: "TEACHER",
          mode: simMode,
          reason: simReason,
          passwordConfirm: adminPasswordConfirm
        }
      });

      toast.dismiss();
      if (res.success) {
        toast.success("تم بدء جلسة المحاكاة بنجاح. جاري التحويل...");
        // Save session meta to localStorage
        localStorage.setItem("altiora_simulation_session", JSON.stringify(res.targetUser));
        localStorage.setItem("altiora_simulation_session_meta", JSON.stringify(res.session));
        
        // Redirect to /teacher
        window.location.href = "/teacher";
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "فشل بدء جلسة المحاكاة.");
    }
  };

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const res = await adminGetTeachersListFn();
      setTeachers(res || []);
    } catch (err: any) {
      toast.error("فشل تحميل المدرسين: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleToggleBan = async (teacher: TeacherItem) => {
    try {
      const newVal = !teacher.isBanned;
      toast.loading(newVal ? "جاري حظر الحساب..." : "جاري إلغاء الحظر...");
      await adminToggleBanUserFn({
        data: {
          userId: teacher.id,
          isBanned: newVal,
        },
      });
      toast.success(newVal ? "تم حظر المدرس وتعليق جلساته النشطة!" : "تم إلغاء حظر المدرس بنجاح!");
      loadTeachers();
    } catch (err: any) {
      toast.error("فشل إتمام العملية: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher || !newPassword) return;
    try {
      toast.loading("جاري إعادة تعيين كلمة المرور...");
      await adminResetPasswordFn({
        data: {
          userId: activeTeacher.id,
          newPassword,
        },
      });
      toast.success("تم إعادة تعيين كلمة المرور للمدرس بنجاح!");
      setModalType(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error("فشل إعادة التعيين: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleUpdateDeviceLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) return;
    try {
      toast.loading("جاري تعديل حد الأجهزة الحسابية...");
      await adminUpdateDeviceLimitFn({
        data: {
          userId: activeTeacher.id,
          deviceLimit: deviceLimitInput,
        },
      });
      toast.success("تم تحديث حد الأجهزة المسموح بها للمدرس!");
      setModalType(null);
      loadTeachers();
    } catch (err: any) {
      toast.error("فشل تعديل الحد: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleForceLogoutDevice = async (deviceId: string) => {
    if (!activeTeacher) return;
    if (!confirm("هل أنت متأكد من إنهاء جلسة هذا الجهاز وطرد المستخدم منه؟")) return;
    try {
      toast.loading("جاري طرد الجهاز...");
      await adminForceLogoutFn({
        data: {
          userId: activeTeacher.id,
          deviceId,
        },
      });
      toast.success("تم إنهاء الجلسة وطرد هذا الجهاز بنجاح!");
      const updatedList = await adminGetTeachersListFn();
      setTeachers(updatedList || []);
      const updatedTeacher = updatedList.find((t: any) => t.id === activeTeacher.id);
      if (updatedTeacher) setActiveTeacher(updatedTeacher);
    } catch (err: any) {
      toast.error("فشل طرد الجهاز: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleImpersonate = async (teacher: TeacherItem) => {
    if (
      !confirm(
        `تحذير أمني: هل تود تسجيل الدخول كـ (المعلم: ${teacher.profile?.name}) وتصفح حسابه؟\nسيتم تسجيل هذا الإجراء في سجل الأمان الخاص بالمنصة.`,
      )
    )
      return;
    try {
      toast.loading("جاري إنشاء جلسة المحاكاة...");
      const res = await adminImpersonateTeacherFn({
        data: {
          teacherId: teacher.id,
        },
      });

      if (res && res.token) {
        document.cookie = `altiora_session_id=${res.token}; path=/; max-age=7200`;

        localStorage.setItem(
          "altiora_auth_user",
          JSON.stringify({
            id: res.user.id,
            email: res.user.email,
            role: res.user.role,
            name: res.user.name,
            avatarUrl: res.user.avatarUrl,
            sessionId: res.token,
          }),
        );

        toast.success(`تم تسجيل الدخول بنجاح كـ المعلم: ${res.user.name}`);
        window.location.href = "/teacher";
      } else {
        toast.error("فشل الحصول على بيانات الجلسة.");
      }
    } catch (err: any) {
      toast.error("فشل المحاكاة: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const filtered = teachers.filter((t) => {
    const name = t.profile?.name?.toLowerCase() || "";
    const email = t.email?.toLowerCase() || "";
    const phone = t.profile?.phoneNumber || "";
    const query = search.toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 text-end" dir="rtl">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-neutral-900/50 border border-amber-500/10 rounded-3xl p-5 space-y-4 shadow-[0_0_40px_rgba(251,191,36,.04)]"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-16 bg-neutral-800 rounded"></div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-28 bg-neutral-800 rounded-xl"></div>
                <div className="size-11 bg-neutral-800 rounded-full"></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-10 bg-neutral-800 rounded-2xl"></div>
              <div className="h-10 bg-neutral-800 rounded-2xl"></div>
              <div className="h-10 bg-neutral-800 rounded-2xl"></div>
            </div>
            <div className="h-14 bg-neutral-800 rounded-2xl"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end bg-transparent font-display text-white" dir="rtl">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            إدارة المدرسين
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            إشراف متكامل على الكادر التعليمي، التحكم بالأجهزة والجلسات، إدارة الأمان ومحاكاة
            الحسابات الفورية.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/10 bg-neutral-900/30 p-4 lg:flex-row backdrop-blur-md">
        <div className="w-full flex-1 relative">
          <input
            type="search"
            placeholder="البحث باسم المدرس، البريد، أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end font-bold"
          />
          <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
        </div>
      </div>

      {/* Teachers Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((t) => {
          const activeSessions = t.devices?.filter((d) => !d.deleted_at).length || 0;
          const estimatedRevenue = (t.courseInstructors?.length || 0) * 12500;
          const studentsMock = (t.courseInstructors?.length || 0) * 125;
          const lastActiveStr =
            t.loginHistories && t.loginHistories.length > 0
              ? new Date(t.loginHistories[0].created_at).toLocaleDateString("ar-EG")
              : "غير متصل مؤخراً";

          return (
            <div
              key={t.id}
              className={`rounded-3xl border p-5 space-y-4 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)] transition-all hover:scale-[1.02] flex flex-col justify-between ${
                t.isBanned ? "border-red-500/30 bg-red-950/5" : "border-amber-500/10"
              }`}
            >
              {/* Header profile info */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-900/80 pb-3">
                {/* Actions Dropdown */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="size-8 rounded-xl bg-neutral-900 hover:bg-neutral-850 flex items-center justify-center border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer">
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={5}
                      className="w-48 rounded-2xl border border-amber-500/10 bg-neutral-950 p-2 shadow-2xl text-right"
                    >
                      <DropdownMenuItem
                        onSelect={() => {
                          setActiveTeacher(t);
                          setModalType("SIMULATION");
                          setSimMode("READ_ONLY");
                          setSimReason("");
                          setAdminPasswordConfirm("");
                          setDoubleConfirmLive(false);
                        }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                      >
                        <span>إدارة ومحاكاة</span>
                        <Eye className="size-3.5 text-amber-500" />
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onSelect={() => {
                          setActiveTeacher(t);
                          setDeviceLimitInput(t.deviceLimit);
                          setModalType("LIMIT");
                        }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                      >
                        <span>إدارة الأجهزة</span>
                        <Smartphone className="size-3.5 text-amber-500" />
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onSelect={() => {
                          setActiveTeacher(t);
                          setModalType("PASSWORD");
                        }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                      >
                        <span>إعادة تعيين كلمة المرور</span>
                        <Key className="size-3.5 text-amber-500" />
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onSelect={() => handleToggleBan(t)}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-400 focus:bg-red-950/20 focus:text-red-400"
                      >
                        <span>{t.isBanned ? "تنشيط الحساب" : "إيقاف الحساب"}</span>
                        <Lock className="size-3.5 text-red-500" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {t.isBanned ? (
                    <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black">
                      محظور
                    </span>
                  ) : (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black">
                      نشط
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <h4 className="font-extrabold text-xs text-white">
                      {t.profile?.name || "معلم ألتيورا"}
                    </h4>
                    <span className="text-[9px] text-zinc-500 block mt-0.5">{t.email}</span>
                  </div>
                  <div className="size-11 bg-neutral-900 border border-zinc-800 rounded-full flex items-center justify-center overflow-hidden">
                    {t.profile?.avatarUrl ? (
                      <img
                        src={t.profile.avatarUrl}
                        alt="Avatar"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Users className="size-5 text-zinc-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Stats information */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs border-b border-zinc-900/60 pb-3">
                <div className="bg-neutral-900/30 p-2 border border-zinc-900 rounded-2xl">
                  <span className="text-zinc-500 text-[9px] block">الكورسات</span>
                  <span className="font-mono text-sm font-black text-amber-500">
                    {t.courseInstructors?.length || 0}
                  </span>
                </div>
                <div className="bg-neutral-900/30 p-2 border border-zinc-900 rounded-2xl">
                  <span className="text-zinc-500 text-[9px] block">الطلاب</span>
                  <span className="font-mono text-sm font-black text-amber-500">
                    {studentsMock}
                  </span>
                </div>
                <div className="bg-neutral-900/30 p-2 border border-zinc-900 rounded-2xl">
                  <span className="text-zinc-500 text-[9px] block">الأجهزة النشطة</span>
                  <span className="font-mono text-sm font-black text-amber-500">
                    {activeSessions} / {t.deviceLimit}
                  </span>
                </div>
              </div>

              {/* Extra details (Revenue and Last activity) */}
              <div className="text-right text-[11px] space-y-2 border-b border-zinc-900/60 pb-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-amber-500">
                    {estimatedRevenue.toLocaleString("ar-EG")} ج.م
                  </span>
                  <span className="text-zinc-500 font-bold flex items-center gap-1">
                    <span>الدخل الإجمالي</span>
                    <Coins className="size-3.5 text-zinc-500" />
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-zinc-300">{lastActiveStr}</span>
                  <span className="text-zinc-500 font-bold flex items-center gap-1">
                    <span>آخر نشاط</span>
                    <Activity className="size-3.5 text-zinc-500" />
                  </span>
                </div>
              </div>

              {/* Impersonate shortcut footer */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setActiveTeacher(t);
                    setModalType("SIMULATION");
                    setSimMode("READ_ONLY");
                    setSimReason("");
                    setAdminPasswordConfirm("");
                    setDoubleConfirmLive(false);
                  }}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 hover:from-amber-500/20 border border-amber-500/20 px-3 py-2 text-xs font-black text-amber-400 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Eye className="size-3.5" /> محاكاة لوحة المعلم الفورية
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AnimatePresence for Apple Vision Pro dialog transitions */}
      <AnimatePresence>
        {/* Device Manager Modal */}
        {modalType === "DEVICES" && activeTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-lg rounded-3xl border border-amber-500/10 bg-neutral-950 p-6 shadow-2xl space-y-4 text-right max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
                <h3 className="font-display text-sm font-black text-amber-400">
                  أجهزة وجلسات المعلم المتصلة
                </h3>
              </div>

              <div className="space-y-3">
                {activeTeacher.devices &&
                activeTeacher.devices.filter((d) => !d.deleted_at).length > 0 ? (
                  activeTeacher.devices
                    .filter((d) => !d.deleted_at)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between items-center bg-neutral-900/60 p-3 border border-zinc-800 rounded-xl"
                      >
                        <button
                          onClick={() => handleForceLogoutDevice(d.device_id)}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                        >
                          إنهاء الجلسة وطرد
                        </button>
                        <div className="text-end">
                          <span className="font-bold text-xs block text-white">
                            {d.device_name || "جهاز غير معروف"}
                          </span>
                          <span className="text-[9px] text-zinc-500 block font-mono">
                            IP: {d.ip_address || "unknown"} | Browser: {d.browser_type || "Chrome"}
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-6 text-center text-zinc-500 text-xs italic">
                    لا توجد أجهزة نشطة متصلة حالياً.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Password Reset Modal */}
        {modalType === "PASSWORD" && activeTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-sm rounded-3xl border border-amber-500/10 bg-neutral-950 p-6 shadow-2xl space-y-4 text-right"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
                <h3 className="font-display text-sm font-black text-amber-400">
                  تغيير كلمة مرور المعلم
                </h3>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="أدخل كلمة المرور الجديدة..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-amber-500 text-end"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="rounded-xl border border-zinc-800 bg-neutral-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-neutral-850 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 border border-amber-400/20 px-5 py-2 text-xs font-extrabold text-black hover:opacity-90 cursor-pointer shadow-md"
                  >
                    تحديث كلمة المرور
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Device Limit Modal */}
        {modalType === "LIMIT" && activeTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-sm rounded-3xl border border-amber-500/10 bg-neutral-950 p-6 shadow-2xl space-y-4 text-right"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
                <h3 className="font-display text-sm font-black text-amber-400">
                  تعديل حد الأجهزة المسموح بها
                </h3>
              </div>

              <form onSubmit={handleUpdateDeviceLimit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                    الحد الأقصى للأجهزة في وقت واحد
                  </label>
                  <select
                    value={deviceLimitInput}
                    onChange={(e) => setDeviceLimitInput(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-amber-500 text-end font-bold"
                  >
                    <option value={1}>جهاز واحد فقط (الافتراضي)</option>
                    <option value={2}>جهازين (2)</option>
                    <option value={3}>ثلاثة أجهزة (3)</option>
                    <option value={5}>خمسة أجهزة (5)</option>
                    <option value={10}>عشرة أجهزة (10)</option>
                    <option value={999}>بلا حدود (أجهزة غير محدودة)</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="rounded-xl border border-zinc-800 bg-neutral-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-neutral-850 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 border border-amber-400/20 px-5 py-2 text-xs font-extrabold text-black hover:opacity-90 cursor-pointer shadow-md"
                  >
                    حفظ الحد الجديد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Simulation Modal */}
        {modalType === "SIMULATION" && activeTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-lg rounded-3xl border border-amber-500/10 bg-neutral-950 p-6 shadow-2xl space-y-5 text-right overflow-y-auto max-h-[90vh]"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
                <h3 className="font-display text-sm font-black text-amber-400">
                  بدء محاكاة حساب المعلم
                </h3>
              </div>

              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                أنت على وشك بدء جلسة محاكاة آمنة لحساب المعلم:{" "}
                <span className="font-bold text-white">{activeTeacher.profile?.name}</span> (
                <span className="font-mono text-amber-400">{activeTeacher.email}</span>)
                <p className="mt-1 text-[10px] text-zinc-500">
                  * هذا الإجراء لا يسجل خروج المعلم ولا يؤثر على جلساته النشطة أو البث المباشر.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-zinc-400">
                  اختر وضع المحاكاة المطلوب:
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* READ ONLY */}
                  <button
                    type="button"
                    onClick={() => setSimMode("READ_ONLY")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      simMode === "READ_ONLY"
                        ? "border-amber-500 bg-amber-500/5"
                        : "border-zinc-800 bg-neutral-900 hover:border-zinc-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 mt-0.5 animate-pulse">
                      <Eye className="size-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">وضع القراءة فقط (Read-Only)</span>
                      <span className="text-[10px] text-zinc-400 leading-normal mt-0.5 block">
                        عرض وتشخيص لوحة المعلم، المحاضرات والمناهج دون إمكانية التعديل أو رفع محاضرات جديدة أو مسح بيانات.
                      </span>
                    </div>
                  </button>

                  {/* INTERACTIVE TEST */}
                  <button
                    type="button"
                    onClick={() => setSimMode("INTERACTIVE_TEST")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      simMode === "INTERACTIVE_TEST"
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-zinc-800 bg-neutral-900 hover:border-zinc-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 mt-0.5">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">وضع الاختبار التجريبي (Sandbox)</span>
                      <span className="text-[10px] text-zinc-400 leading-normal mt-0.5 block">
                        تجربة تفاعلية آمنة لإنشاء مسودات المحاضرات والكورسات والرد على الاستفسارات. تُحفظ في بيئة اختبار معزولة تفنى بنهاية الجلسة.
                      </span>
                    </div>
                  </button>

                  {/* LIVE CONTROL */}
                  <button
                    type="button"
                    onClick={() => setSimMode("LIVE_CONTROL")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      simMode === "LIVE_CONTROL"
                        ? "border-red-500 bg-red-500/5"
                        : "border-zinc-800 bg-neutral-900 hover:border-zinc-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-400 mt-0.5">
                      <ShieldAlert className="size-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">وضع التحكم المباشر (Live Control)</span>
                      <span className="text-[10px] text-zinc-400 leading-normal mt-0.5 block">
                        صلاحيات كاملة لحل المشكلات وتقديم الدعم الفني المباشر الحقيقي. يتم تسجيل كل تعديل تلقائياً في سجلات الأمان.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  سبب المحاكاة (مطلوب للرقابة والأرشفة):
                </label>
                <textarea
                  rows={2}
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  placeholder="يرجى كتابة سبب لبدء المحاكاة..."
                  className="w-full rounded-xl border border-zinc-800 bg-neutral-900 p-3 text-xs text-white outline-none focus:border-amber-500 text-end"
                />
              </div>

              {/* Password Confirm */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  تأكيد كلمة مرور حسابك (المسؤول):
                </label>
                <input
                  type="password"
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="أدخل كلمة مرور الإدارة لتأكيد الصلاحية"
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-amber-500 text-end"
                />
              </div>

              {/* Live Control Double Confirm */}
              {simMode === "LIVE_CONTROL" && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/20 border border-red-500/25">
                  <input
                    type="checkbox"
                    id="double-confirm-teacher"
                    checked={doubleConfirmLive}
                    onChange={(e) => setDoubleConfirmLive(e.target.checked)}
                    className="mt-1 accent-red-500 cursor-pointer"
                  />
                  <label htmlFor="double-confirm-teacher" className="text-[10px] text-red-200 leading-relaxed cursor-pointer select-none">
                    أقر وأؤكد بأنني أتحمل كامل المسؤولية الأمنية والتقنية عن أي تعديل أو كتابة تطرأ مباشرة على قاعدة البيانات الحقيقية للمعلم أثناء جلسة المحاكاة.
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="rounded-xl border border-zinc-800 bg-neutral-900 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-neutral-850 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleStartSimulation}
                  className="rounded-xl bg-amber-500 border border-amber-400/20 px-5 py-2.5 text-xs font-extrabold text-black hover:opacity-90 cursor-pointer shadow-md"
                >
                  بدء المحاكاة الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
