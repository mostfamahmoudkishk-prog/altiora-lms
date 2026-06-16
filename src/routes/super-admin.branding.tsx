import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Crown, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  getBrandingSubscriptionsFn,
  activateTeacherBrandingFn,
  extendBrandingSubscriptionFn,
  toggleFeaturedTeacherFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/branding")({
  component: SuperAdminBranding,
});

interface SubscriptionItem {
  id: string;
  instructorId: string;
  enabled: boolean;
  brandName: string | null;
  brandColor: string | null;
  brandLogo: string | null;
  introVideoUrl: string | null;
  expiresAt: string | null;
  featuredTeacher: boolean;
  featuredCoursePriority: boolean;
  lifetimeSubscription: boolean;
  featuresAllowed: any;
  instructor?: {
    id: string;
    email: string;
    profile?: {
      name: string;
      avatarUrl: string | null;
    };
  };
}

function SuperAdminBranding() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Activation / Extension Modal state
  const [activeSub, setActiveSub] = useState<SubscriptionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewActivation, setIsNewActivation] = useState(false);

  // New Subscription Form states
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formTeacherEmail, setFormTeacherEmail] = useState("");
  const [formPlanType, setFormPlanType] = useState<
    "1_WEEK" | "1_MONTH" | "3_MONTHS" | "6_MONTHS" | "1_YEAR" | "LIFETIME"
  >("1_MONTH");

  // Features Allowed Toggles
  const [features, setFeatures] = useState({
    videoIntro: true,
    watermark: true,
    pdf: true,
    notes: true,
    attachments: true,
    certificates: true,
    exams: true,
    homework: true,
    downloads: true,
    featuredBadge: false,
    featuredCourses: false,
    featuredHomePage: false,
  });

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await getBrandingSubscriptionsFn();
      setSubscriptions(res || []);
    } catch (err: any) {
      toast.error("فشل تحميل اشتراكات الهوية التجارية: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const handleOpenNewActivation = () => {
    setIsNewActivation(true);
    setFormTeacherId("");
    setFormTeacherEmail("");
    setFormPlanType("1_MONTH");
    setFeatures({
      videoIntro: true,
      watermark: true,
      pdf: true,
      notes: true,
      attachments: true,
      certificates: true,
      exams: true,
      homework: true,
      downloads: true,
      featuredBadge: false,
      featuredCourses: false,
      featuredHomePage: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenExtend = (sub: SubscriptionItem) => {
    setIsNewActivation(false);
    setActiveSub(sub);
    setFormPlanType("1_MONTH");
    setIsModalOpen(true);
  };

  const handleSaveActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      toast.loading("جاري تفعيل الهوية التجارية...");
      if (isNewActivation) {
        if (!formTeacherId && !formTeacherEmail) {
          toast.error("يرجى إدخال معرف المدرس أو البريد الإلكتروني");
          return;
        }

        await activateTeacherBrandingFn({
          data: {
            teacherId: formTeacherId || formTeacherEmail,
            planType: formPlanType,
            featuresAllowed: features,
            enabled: true,
          },
        });
        toast.success("تم تفعيل الهوية التجارية للمدرس بنجاح!");
      } else {
        if (!activeSub) return;
        await extendBrandingSubscriptionFn({
          data: {
            teacherId: activeSub.instructorId,
            planType: formPlanType,
          },
        });
        toast.success("تم تمديد فترة اشتراك الهوية التجارية بنجاح!");
      }
      setIsModalOpen(false);
      loadSubscriptions();
    } catch (err: any) {
      toast.error("فشل إتمام العملية: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const handleToggleFeatured = async (sub: SubscriptionItem) => {
    try {
      toast.loading("جاري تحديث تمييز المدرس...");
      const newVal = !sub.featuredTeacher;
      await toggleFeaturedTeacherFn({
        data: {
          teacherId: sub.instructorId,
          featuredTeacher: newVal,
          featuredCoursePriority: newVal,
        },
      });
      toast.success("تم تحديث حالة تمييز المدرس بنجاح!");
      loadSubscriptions();
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    } finally {
      toast.dismiss();
    }
  };

  const filtered = subscriptions.filter((sub) => {
    const name = sub.instructor?.profile?.name?.toLowerCase() || "";
    const email = sub.instructor?.email?.toLowerCase() || "";
    const brand = sub.brandName?.toLowerCase() || "";
    const query = search.toLowerCase();
    return name.includes(query) || email.includes(query) || brand.includes(query);
  });

  if (loading) {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center bg-black min-h-screen"
        dir="rtl"
      >
        <div className="animate-pulse bg-neutral-800 rounded-3xl p-8 flex flex-col items-center gap-4">
          <div className="size-10 rounded-full bg-neutral-700 animate-bounce"></div>
          <div className="h-4 w-48 bg-neutral-700 rounded"></div>
          <div className="h-3 w-32 bg-neutral-700 rounded mt-2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end p-6 bg-transparent font-display text-white" dir="rtl">
      {/* Premium Luxury Page Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            العلامات التجارية والتميز
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            تراخيص الهويات البصرية المخصصة لمدرسي المنصة، وضبط حدود صلاحيات وتصنيفات المدرسين
            المميزين.
          </p>
        </div>

        <button
          onClick={handleOpenNewActivation}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-black text-black shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer border border-amber-400/30"
        >
          <Plus className="size-4 stroke-[3]" /> تفعيل هوية لمدرس جديد
        </button>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-1">
          <span className="text-zinc-500 text-[10px] font-bold block">إجمالي الهويات النشطة</span>
          <span className="font-mono text-3xl font-black text-white">
            {subscriptions.filter((s) => s.enabled).length}
          </span>
        </div>
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-1">
          <span className="text-zinc-500 text-[10px] font-bold block">اشتراكات مدى الحياة</span>
          <span className="font-mono text-3xl font-black text-white">
            {subscriptions.filter((s) => s.lifetimeSubscription).length}
          </span>
        </div>
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-1">
          <span className="text-zinc-500 text-[10px] font-bold block">المدرسين المميزين</span>
          <span className="font-mono text-3xl font-black text-white">
            {subscriptions.filter((s) => s.featuredTeacher).length}
          </span>
        </div>
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(251,191,36,.08)] text-center space-y-1">
          <span className="text-zinc-500 text-[10px] font-bold block">أوشكت على الانتهاء</span>
          <span className="font-mono text-3xl font-black text-red-500">
            {
              subscriptions.filter(
                (s) =>
                  s.expiresAt &&
                  new Date(s.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000,
              ).length
            }
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/10 bg-neutral-900/30 p-4 lg:flex-row backdrop-blur-md">
        <div className="w-full flex-1 relative">
          <input
            type="search"
            placeholder="البحث باسم المدرس، البريد، أو العلامة التجارية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end font-bold"
          />
          <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
        </div>
      </div>

      {/* Subscription Table */}
      <div className="overflow-x-auto rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)]">
        <table className="w-full border-collapse text-end text-xs text-zinc-300">
          <thead>
            <tr className="border-b border-zinc-900 bg-black/60 text-xs font-black text-amber-400 sticky top-0 backdrop-blur-md z-10">
              <th className="px-5 py-4 text-center">الخيارات</th>
              <th className="px-5 py-4">التميز في البحث</th>
              <th className="px-5 py-4">اسم الهوية واللون</th>
              <th className="px-5 py-4">صلاحيات التخصيص</th>
              <th className="px-5 py-4">تاريخ انتهاء الاشتراك</th>
              <th className="px-5 py-4">المدرس</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 bg-transparent">
            {filtered.map((sub) => {
              const daysLeft = sub.expiresAt
                ? Math.ceil(
                    (new Date(sub.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
                  )
                : 0;

              return (
                <tr
                  key={sub.id}
                  className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors"
                >
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => handleOpenExtend(sub)}
                        className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                      >
                        تجديد / تمديد
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(sub)}
                        className={`rounded-lg border px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                          sub.featuredTeacher
                            ? "bg-amber-500 text-black border-amber-500 font-extrabold shadow-lg"
                            : "bg-neutral-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        {sub.featuredTeacher ? "نجم مميز" : "تمييز المدرس"}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${
                        sub.featuredCoursePriority
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-zinc-800/40 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      {sub.featuredCoursePriority ? "أولوية قصوى" : "افتراضي"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {sub.brandName ? (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className="font-bold text-xs"
                          style={{ color: sub.brandColor || "#d97706" }}
                        >
                          {sub.brandName}
                        </span>
                        {sub.brandLogo && (
                          <img src={sub.brandLogo} alt="Logo" className="h-6 object-contain" />
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs italic">لم يتم إعداد الهوية بعد</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1 flex-wrap max-w-xs">
                      {sub.featuresAllowed &&
                        Object.keys(sub.featuresAllowed).map((key) => {
                          const val = sub.featuresAllowed[key];
                          if (!val) return null;
                          return (
                            <span
                              key={key}
                              className="text-[9px] bg-neutral-900 text-amber-400 border border-zinc-800 rounded px-1.5 py-0.5 font-semibold"
                            >
                              {key}
                            </span>
                          );
                        })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {sub.lifetimeSubscription ? (
                      <span className="text-[10px] bg-amber-500/15 text-amber-400 font-black border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                        مدى الحياة
                      </span>
                    ) : sub.expiresAt ? (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block text-white">
                          {new Date(sub.expiresAt).toLocaleDateString("ar-EG")}
                        </span>
                        <span
                          className={`text-[9px] font-bold block ${
                            daysLeft <= 7 ? "text-red-400" : "text-zinc-500"
                          }`}
                        >
                          {daysLeft > 0 ? `متبقي ${daysLeft} يوم` : "منتهي الاشتراك"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs">غير محدد</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <div className="text-end">
                        <h4 className="font-black text-xs text-white">
                          {sub.instructor?.profile?.name || "معلم ألتيورا"}
                        </h4>
                        <span className="text-[9px] text-zinc-500 block">
                          {sub.instructor?.email}
                        </span>
                      </div>
                      <div className="size-9 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center overflow-hidden">
                        {sub.instructor?.profile?.avatarUrl ? (
                          <img
                            src={sub.instructor.profile.avatarUrl}
                            alt="Avatar"
                            className="size-full object-cover"
                          />
                        ) : (
                          <Crown className="size-4 text-amber-500" />
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
                  لا توجد سجلات اشتراك هوية للمدرسين حالياً.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Activation/Extension Modal with spring transitions */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="w-full max-w-lg rounded-3xl border border-amber-500/10 bg-neutral-950 p-6 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
                <h3 className="font-display text-sm font-black text-amber-400">
                  {isNewActivation
                    ? "تفعيل اشتراك الهوية التجارية لمدرس"
                    : "تمديد فترة اشتراك الهوية التجارية"}
                </h3>
              </div>

              <form onSubmit={handleSaveActivation} className="space-y-4">
                {isNewActivation ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1 font-bold">
                        البريد الإلكتروني للمدرس أو المعرف ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="أدخل بريد المدرس أو المعرف..."
                        value={formTeacherEmail}
                        onChange={(e) => setFormTeacherEmail(e.target.value)}
                        className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-amber-500 text-end"
                      />
                    </div>

                    <div className="space-y-2 border-t border-zinc-900 pt-3">
                      <span className="block text-[10px] font-bold text-zinc-400 mb-2">
                        ميزات الهوية المسموح بها للمدرس:
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.keys(features).map((featKey) => {
                          const labelText =
                            {
                              videoIntro: "فيديو مقدمة المحاضرة",
                              watermark: "العلام المائية بالفيديو",
                              pdf: "شعار في ملفات PDF",
                              notes: "شعار في الملاحظات",
                              attachments: "شعار في المرفقات",
                              certificates: "شعار في الشهادات",
                              exams: "شعار في الامتحانات",
                              homework: "شعار في الواجبات",
                              downloads: "شعار في صفحة التحميلات",
                              featuredBadge: "شارة معلم مميز",
                              featuredCourses: "أولوية ظهور الكورسات",
                              featuredHomePage: "إظهار في الرئيسية",
                            }[featKey] || featKey;

                          const val = (features as any)[featKey];

                          return (
                            <label
                              key={featKey}
                              className="flex items-center gap-2 cursor-pointer select-none justify-end"
                            >
                              <span className="text-[11px] text-zinc-300">{labelText}</span>
                              <input
                                type="checkbox"
                                checked={val}
                                onChange={(e) => {
                                  setFeatures((prev) => ({ ...prev, [featKey]: e.target.checked }));
                                }}
                                className="size-4 rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-neutral-900/50 p-4 border border-zinc-800 rounded-xl space-y-1">
                    <div className="text-[10px] text-zinc-400">اسم المدرس:</div>
                    <div className="font-extrabold text-sm text-white">
                      {activeSub?.instructor?.profile?.name || activeSub?.instructor?.email}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-2">
                      الاشتراك الحالي ينتهي في:{" "}
                      <span className="text-zinc-300 font-bold">
                        {activeSub?.expiresAt
                          ? new Date(activeSub.expiresAt).toLocaleDateString("ar-EG")
                          : "لا يوجد اشتراك مسبق"}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                    خطة الاشتراك الجديدة
                  </label>
                  <select
                    value={formPlanType}
                    onChange={(e) => setFormPlanType(e.target.value as any)}
                    className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-amber-500 text-end font-bold"
                  >
                    <option value="1_WEEK">أسبوع واحد (بث تجريبي)</option>
                    <option value="1_MONTH">شهر واحد</option>
                    <option value="3_MONTHS">ثلاثة أشهر (ربع سنوي)</option>
                    <option value="6_MONTHS">ستة أشهر (نصف سنوي)</option>
                    <option value="1_YEAR">سنة واحدة (سنوي)</option>
                    <option value="LIFETIME">اشتراك مدى الحياة</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-zinc-800 bg-neutral-900 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-neutral-850 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-400/20 px-5 py-2.5 text-xs font-extrabold text-black hover:opacity-95 shadow cursor-pointer"
                  >
                    تأكيد وحفظ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
