import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  GraduationCap,
  Search,
  Key,
  Smartphone,
  BookOpen,
  ShoppingBag,
  X,
  LayoutGrid,
  Table2,
  MoreVertical,
  Activity,
  UserX,
  UserCheck,
  Award,
  Eye,
  Layers,
  ShieldAlert,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import {
  adminGetStudentsListFn,
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

export const Route = createFileRoute("/super-admin/students")({
  component: SuperAdminStudents,
});

interface StudentItem {
  id: string;
  email: string;
  isBanned: boolean;
  deviceLimit: number;
  profile?: {
    name: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
  };
  enrollments?: any[];
  progress?: any[];
  orders?: any[];
  certificates?: any[];
  loginHistories?: any[];
  devices?: any[];
}

function SuperAdminStudents() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"TABLE" | "GRID">("TABLE");

  // Modal control
  const [activeStudent, setActiveStudent] = useState<StudentItem | null>(null);
  const [modalType, setModalType] = useState<
    "DEVICES" | "PROGRESS" | "ORDERS" | "LIMIT" | "PASSWORD" | "SIMULATION" | null
  >(null);

  // Form states
  const [newPassword, setNewPassword] = useState("");
  const [deviceLimitInput, setDeviceLimitInput] = useState(1);
  const [simMode, setSimMode] = useState<"READ_ONLY" | "INTERACTIVE_TEST" | "LIVE_CONTROL">("READ_ONLY");
  const [simReason, setSimReason] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [doubleConfirmLive, setDoubleConfirmLive] = useState(false);

  const handleStartSimulation = async () => {
    if (!activeStudent) return;
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
          targetUserId: activeStudent.id,
          targetRole: "STUDENT",
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
        
        // Redirect to /app
        window.location.href = "/app";
      }
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message || "فشل بدء جلسة المحاكاة.");
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await adminGetStudentsListFn();
      setStudents(res || []);
    } catch (err: any) {
      toast.error("فشل تحميل الطلاب: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleToggleBan = async (student: StudentItem) => {
    try {
      const newVal = !student.isBanned;
      toast.loading(newVal ? "جاري حظر الطالب..." : "جاري إلغاء الحظر...");
      await adminToggleBanUserFn({
        data: {
          userId: student.id,
          isBanned: newVal,
        },
      });
      toast.success(newVal ? "تم حظر الطالب بنجاح وطرد جلساته!" : "تم إلغاء حظر حساب الطالب!");
      loadStudents();
    } catch (err: any) {
      toast.error("فشل حظر/إلغاء حظر الطالب: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !newPassword) return;
    try {
      toast.loading("جاري تعيين كلمة المرور...");
      await adminResetPasswordFn({
        data: {
          userId: activeStudent.id,
          newPassword,
        },
      });
      toast.success("تم تعيين كلمة مرور جديدة للطالب بنجاح!");
      setModalType(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error("فشل تعيين كلمة المرور: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleUpdateDeviceLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    try {
      toast.loading("جاري تحديث حد الأجهزة...");
      await adminUpdateDeviceLimitFn({
        data: {
          userId: activeStudent.id,
          deviceLimit: deviceLimitInput,
        },
      });
      toast.success("تم تحديث حد الأجهزة المسموح بها للطالب!");
      setModalType(null);
      loadStudents();
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleForceLogout = async (deviceId: string) => {
    if (!activeStudent) return;
    if (!confirm("هل تود طرد هذا الجهاز بشكل فوري؟")) return;
    try {
      toast.loading("جاري تسجيل الخروج للجهاز...");
      await adminForceLogoutFn({
        data: {
          userId: activeStudent.id,
          deviceId,
        },
      });
      toast.success("تم طرد وإنهاء جلسة الجهاز!");
      const updatedList = await adminGetStudentsListFn();
      setStudents(updatedList || []);
      const updatedStudent = updatedList.find((s: any) => s.id === activeStudent.id);
      if (updatedStudent) setActiveStudent(updatedStudent);
    } catch (err: any) {
      toast.error("فشل تسجيل الخروج: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const filtered = students.filter((s) => {
    const name = s.profile?.name?.toLowerCase() || "";
    const email = s.email?.toLowerCase() || "";
    const phone = s.profile?.phoneNumber || "";
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
            <div className="h-10 bg-neutral-800 rounded-2xl"></div>
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
            إدارة الطلاب
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            متابعة تقدم الطلاب بالدورات والتقارير الفورية، والتحكم بالجلسات النشطة لضمان حماية
            تراخيص النظام.
          </p>
        </div>
      </div>

      {/* Filter and view switcher */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/10 bg-neutral-900/30 p-4 lg:flex-row backdrop-blur-md">
        {/* Toggle Switcher */}
        <div className="flex items-center gap-1 bg-black/40 p-1 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setViewMode("GRID")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "GRID"
                ? "bg-amber-500 text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>عرض شبكي</span>
          </button>
          <button
            onClick={() => setViewMode("TABLE")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "TABLE"
                ? "bg-amber-500 text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Table2 className="size-3.5" />
            <span>عرض الجدول</span>
          </button>
        </div>

        <div className="w-full flex-1 relative lg:max-w-md">
          <input
            type="search"
            placeholder="البحث باسم الطالب، البريد، أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end font-bold"
          />
          <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
        </div>
      </div>

      {/* Conditional rendering based on mode */}
      {viewMode === "TABLE" ? (
        /* Table View */
        <div className="overflow-x-auto rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)]">
          <table className="w-full border-collapse text-end text-xs text-zinc-300">
            <thead>
              <tr className="border-b border-zinc-900 bg-black/60 text-xs font-black text-amber-400 sticky top-0 backdrop-blur-md z-10">
                <th className="px-5 py-4 text-center">الإجراءات</th>
                <th className="px-5 py-4">الأجهزة</th>
                <th className="px-5 py-4">الشهادات والطلبات</th>
                <th className="px-5 py-4">الدورات مسجل بها</th>
                <th className="px-5 py-4">الحالة</th>
                <th className="px-5 py-4">اسم الطالب والبريد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/80 bg-transparent">
              {filtered.map((s) => {
                const activeSessions = s.devices?.filter((d) => !d.deleted_at).length || 0;
                return (
                  <tr
                    key={s.id}
                    className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors"
                  >
                    <td className="px-5 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="size-8 rounded-xl bg-neutral-900 hover:bg-neutral-850 flex items-center justify-center border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer mx-auto">
                            <MoreVertical className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          sideOffset={5}
                          className="w-48 rounded-2xl border border-amber-500/10 bg-neutral-950 p-2 shadow-2xl text-right"
                        >
                          <DropdownMenuItem
                            onSelect={() => {
                              setActiveStudent(s);
                              setModalType("PROGRESS");
                            }}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                          >
                            <span>تقدم المسار</span>
                            <BookOpen className="size-3.5 text-amber-500" />
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => {
                              setActiveStudent(s);
                              setModalType("ORDERS");
                            }}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                          >
                            <span>الفواتير والطلبات</span>
                            <ShoppingBag className="size-3.5 text-amber-500" />
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => {
                              setActiveStudent(s);
                              setModalType("LIMIT");
                              setDeviceLimitInput(s.deviceLimit);
                            }}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                          >
                            <span>حد أجهزة الدخول</span>
                            <Smartphone className="size-3.5 text-amber-500" />
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => {
                              setActiveStudent(s);
                              setModalType("PASSWORD");
                            }}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                          >
                            <span>تغيير كلمة المرور</span>
                            <Key className="size-3.5 text-amber-500" />
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => {
                              setActiveStudent(s);
                              setModalType("SIMULATION");
                              setSimMode("READ_ONLY");
                              setSimReason("");
                              setAdminPasswordConfirm("");
                              setDoubleConfirmLive(false);
                            }}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                          >
                            <span>محاكاة الطالب</span>
                            <Eye className="size-3.5 text-amber-500" />
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => handleToggleBan(s)}
                            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-400 focus:bg-red-950/20 focus:text-red-400"
                          >
                            <span>{s.isBanned ? "إلغاء حظر" : "حظر الحساب"}</span>
                            <UserX className="size-3.5 text-red-500" />
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => {
                          setActiveStudent(s);
                          setModalType("DEVICES");
                        }}
                        className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1 justify-end cursor-pointer mr-auto"
                      >
                        <span>
                          {activeSessions} / {s.deviceLimit} جهاز
                        </span>
                        <Smartphone className="size-3.5 text-amber-500/70" />
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">
                          {s.orders?.length || 0} طلبات شراء
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          {s.certificates?.length || 0} شهادة إتمام صادرة
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white block">
                          {s.enrollments?.length || 0} دورات مسجلة
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          {s.progress?.filter((p) => p.isCompleted).length || 0} محاضرة مكتملة
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {s.isBanned ? (
                        <span className="inline-flex rounded-full bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                          محظور
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold">
                          نشط
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <div className="text-end">
                          <h4 className="font-extrabold text-xs text-white">
                            {s.profile?.name || "طالب ألتيورا"}
                          </h4>
                          <span className="text-[9px] text-zinc-500 block">{s.email}</span>
                        </div>
                        <div className="size-9 bg-neutral-900 border border-zinc-800 rounded-full flex items-center justify-center overflow-hidden font-bold text-amber-400 text-xs">
                          {s.profile?.name ? (
                            s.profile.name[0]
                          ) : (
                            <GraduationCap className="size-4" />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 text-xs">
                    لا توجد سجلات طلاب مطابقة للبحث حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => {
            const activeSessions = s.devices?.filter((d) => !d.deleted_at).length || 0;
            return (
              <div
                key={s.id}
                className={`rounded-3xl border p-5 space-y-4 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)] transition-all hover:scale-[1.02] flex flex-col justify-between ${
                  s.isBanned ? "border-red-500/30 bg-red-950/5" : "border-amber-500/10"
                }`}
              >
                {/* Header profile info */}
                <div className="flex items-start justify-between gap-3 border-b border-zinc-900/80 pb-3">
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
                            setActiveStudent(s);
                            setModalType("PROGRESS");
                          }}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                        >
                          <span>تقدم المسار</span>
                          <BookOpen className="size-3.5 text-amber-500" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveStudent(s);
                            setModalType("ORDERS");
                          }}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                        >
                          <span>الفواتير والطلبات</span>
                          <ShoppingBag className="size-3.5 text-amber-500" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveStudent(s);
                            setModalType("LIMIT");
                            setDeviceLimitInput(s.deviceLimit);
                          }}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                        >
                          <span>حد أجهزة الدخول</span>
                          <Smartphone className="size-3.5 text-amber-500" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveStudent(s);
                            setModalType("PASSWORD");
                          }}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                        >
                          <span>تغيير كلمة المرور</span>
                          <Key className="size-3.5 text-amber-500" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => {
                            setActiveStudent(s);
                            setModalType("SIMULATION");
                            setSimMode("READ_ONLY");
                            setSimReason("");
                            setAdminPasswordConfirm("");
                            setDoubleConfirmLive(false);
                          }}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 focus:bg-neutral-900 focus:text-amber-400"
                        >
                          <span>محاكاة الطالب</span>
                          <Eye className="size-3.5 text-amber-500" />
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => handleToggleBan(s)}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs font-bold text-red-400 focus:bg-red-950/20 focus:text-red-400"
                        >
                          <span>{s.isBanned ? "إلغاء حظر" : "حظر الحساب"}</span>
                          <UserX className="size-3.5 text-red-500" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {s.isBanned ? (
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
                        {s.profile?.name || "طالب ألتيورا"}
                      </h4>
                      <span className="text-[9px] text-zinc-500 block mt-0.5">{s.email}</span>
                    </div>
                    <div className="size-10 bg-neutral-900 border border-zinc-800 rounded-full flex items-center justify-center overflow-hidden font-bold text-amber-400 text-xs">
                      {s.profile?.name ? s.profile.name[0] : <GraduationCap className="size-4" />}
                    </div>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs border-b border-zinc-900/60 pb-3">
                  <div className="bg-neutral-900/30 p-2 border border-zinc-900 rounded-2xl">
                    <span className="text-zinc-500 text-[9px] block">الكورسات</span>
                    <span className="font-mono text-sm font-black text-amber-400">
                      {s.enrollments?.length || 0}
                    </span>
                  </div>
                  <div className="bg-neutral-900/30 p-2 border border-zinc-900 rounded-2xl">
                    <span className="text-zinc-500 text-[9px] block">الطلبات</span>
                    <span className="font-mono text-sm font-black text-amber-400">
                      {s.orders?.length || 0}
                    </span>
                  </div>
                  <div className="bg-neutral-900/30 p-2 border border-zinc-900 rounded-2xl">
                    <span className="text-zinc-500 text-[9px] block">الأجهزة النشطة</span>
                    <span className="font-mono text-sm font-black text-amber-400">
                      {activeSessions} / {s.deviceLimit}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>الهاتف: {s.profile?.phoneNumber || "غير مسجل"}</span>
                  <span className="font-bold text-zinc-400 flex items-center gap-1">
                    <span>الشهادات الصادرة: {s.certificates?.length || 0}</span>
                    <Award className="size-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Modals with Framer Motion spring popups */}
      <AnimatePresence>
        {/* Devices list modal */}
        {modalType === "DEVICES" && activeStudent && (
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
                  أجهزة وجلهات الطالب المتصلة
                </h3>
              </div>

              <div className="space-y-3">
                {activeStudent.devices &&
                activeStudent.devices.filter((d) => !d.deleted_at).length > 0 ? (
                  activeStudent.devices
                    .filter((d) => !d.deleted_at)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="flex justify-between items-center bg-neutral-900/60 p-3 border border-zinc-800 rounded-xl"
                      >
                        <button
                          onClick={() => handleForceLogout(d.device_id)}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                        >
                          طرد وإنهاء الجلسة
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
                    لا توجد أجهزة متصلة مسجلة.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Progress tracks modal */}
        {modalType === "PROGRESS" && activeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-xl rounded-3xl border border-amber-500/10 bg-neutral-950 p-6 shadow-2xl space-y-4 text-right max-h-[80vh] overflow-y-auto"
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
                  متابعة تقدم الطالب ودوراته
                </h3>
              </div>

              <div className="space-y-4">
                {activeStudent.enrollments && activeStudent.enrollments.length > 0 ? (
                  activeStudent.enrollments.map((en) => {
                    const pct = en.progressPercent || 0;
                    return (
                      <div
                        key={en.id}
                        className="bg-neutral-900/60 p-4 border border-zinc-800 rounded-xl space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-amber-400 text-xs">{pct}%</span>
                          <h4 className="font-bold text-xs text-white">{en.course?.title}</h4>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-zinc-500 text-xs italic">
                    لا توجد اشتراكات في دورات تعليمية بعد.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Orders/billing modal */}
        {modalType === "ORDERS" && activeStudent && (
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
                  فواتير ومعاملات الطالب المالية
                </h3>
              </div>

              <div className="space-y-3">
                {activeStudent.orders && activeStudent.orders.length > 0 ? (
                  activeStudent.orders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-neutral-900/60 p-3.5 border border-zinc-800 rounded-xl flex justify-between items-center"
                    >
                      <span className="text-amber-500 font-mono font-bold text-xs">
                        {o.price} ج.م
                      </span>
                      <div className="text-end">
                        <span className="font-bold text-xs block text-white">
                          رقم الفاتورة: {o.orderCode || o.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          تاريخ الدفع: {new Date(o.created_at).toLocaleDateString("ar-EG")} |
                          الحالة: {o.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-zinc-500 text-xs italic">
                    لا توجد فواتير أو طلبات شراء مسجلة.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Password reset modal */}
        {modalType === "PASSWORD" && activeStudent && (
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
                  إعادة تعيين كلمة مرور الطالب
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
                    placeholder="أدخل كلمة مرور جديدة قوية..."
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
                    حفظ كلمة المرور
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Device Limit Modal */}
        {modalType === "LIMIT" && activeStudent && (
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
                  تعديل حد أجهزة الطالب
                </h3>
              </div>

              <form onSubmit={handleUpdateDeviceLimit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                    الحد الأقصى للأجهزة المتزامنة
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
                    <option value={999}>بلا حدود (غير محدود للأجهزة)</option>
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
                    حفظ الحد الأقصى
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Simulation Modal */}
        {modalType === "SIMULATION" && activeStudent && (
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
                  بدء محاكاة حساب الطالب
                </h3>
              </div>

              <div className="bg-neutral-900/60 p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                أنت على وشك بدء جلسة محاكاة آمنة لحساب الطالب:{" "}
                <span className="font-bold text-white">{activeStudent.profile?.name}</span> (
                <span className="font-mono text-amber-400">{activeStudent.email}</span>)
                <p className="mt-1 text-[10px] text-zinc-500">
                  * هذا الإجراء لا يسجل خروج الطالب ولا يؤثر على جلساته النشطة أو الأجهزة المسجلة له.
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
                        عرض وتشخيص أداء الطالب، الدروس والاختبارات دون إمكانية تعديل البيانات أو إجراء دفع أو تقديم إجابات.
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
                        تجربة تفاعلية آمنة للاختبارات والإعلانات. يتم تخزين وحفظ التعديلات في بيئة اختبار افتراضية بنسبة 100% تفنى تلقائياً بانتهاء الجلسة.
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
                        صلاحيات كاملة لتعديل البيانات الفورية والمساعدة المباشرة في حل المشكلات الفنية الحقيقية. يخضع للرقابة الصارمة.
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
                    id="double-confirm"
                    checked={doubleConfirmLive}
                    onChange={(e) => setDoubleConfirmLive(e.target.checked)}
                    className="mt-1 accent-red-500 cursor-pointer"
                  />
                  <label htmlFor="double-confirm" className="text-[10px] text-red-200 leading-relaxed cursor-pointer select-none">
                    أقر وأؤكد بأنني أتحمل كامل المسؤولية الأمنية والتقنية عن أي تعديل أو كتابة تطرأ مباشرة على قاعدة البيانات الحقيقية للطالب أثناء جلسة المحاكاة.
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
