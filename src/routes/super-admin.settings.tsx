import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Globe, ShieldAlert, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/settings")({
  component: SuperAdminSettings,
});

function SuperAdminSettings() {
  // Mock states
  const [platformName, setPlatformName] = useState("Altiora Learning Studio");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [metaDesc, setMetaDesc] = useState(
    "منصة تعليمية متطورة توفر أفضل الكورسات لطلاب الثانوي والإعدادي.",
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("تم حفظ إعدادات الموقع العامة بنجاح");
  };

  const handleToggleMaintenance = () => {
    const nextVal = !maintenanceMode;
    setMaintenanceMode(nextVal);
    if (nextVal) {
      toast.warning("تم تفعيل وضع الصيانة! ستظهر رسالة صيانة لجميع الزوار باستثناء المسؤولين.");
    } else {
      toast.success("تم إلغاء وضع الصيانة والموقع متاح للجميع الآن.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-end bg-transparent font-display text-white"
      dir="rtl"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            إعدادات الموقع ووضع الصيانة
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            تعديل الإعدادات العامة للموقع، الـ SEO، وتفعيل أو إيقاف وضع الصيانة الفورية على مستوى المنصة.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Maintenance mode */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-end gap-2 border-b border-zinc-900 pb-3">
              <span className="font-display text-base font-bold text-amber-400">
                وضع الصيانة (Maintenance Mode)
              </span>
              <ShieldAlert className="size-5 text-red-500" />
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mt-4">
              عند تفعيل وضع الصيانة، سيتم توجيه جميع الطلاب والزوار لصفحة توضح أن المنصة تحت الصيانة
              الفنية حالياً. ستظل لوحة الإدارة والتحكم العليا متاحة للمسؤولين فقط.
            </p>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-zinc-900 pt-4 mt-6">
            <button
              onClick={handleToggleMaintenance}
              className={`relative flex h-6 w-11 items-center rounded-full transition-colors outline-none cursor-pointer ${
                maintenanceMode ? "bg-red-500" : "bg-zinc-800"
              }`}
            >
              <span
                className={`size-4 rounded-full bg-white transition-transform ${
                  maintenanceMode ? "translate-x-1" : "translate-x-6"
                }`}
              />
            </button>
            <span className="text-xs font-bold text-white">
              {maintenanceMode ? "وضع الصيانة: مفعل" : "وضع الصيانة: معطل"}
            </span>
          </div>
        </div>

        {/* Global metadata config */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] md:col-span-2 space-y-4">
          <div className="flex items-center justify-end gap-2 border-b border-zinc-900 pb-3">
            <span className="font-display text-base font-bold text-amber-400">
              إعدادات الهوية العامة
            </span>
            <Globe className="size-5 text-amber-400" />
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 mb-1 text-right">
                اسم المنصة الأساسي
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 mb-1 text-right">
                وصف المنصة الافتراضي (SEO Meta Description)
              </label>
              <textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                required
                rows={3}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-white font-bold text-end outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-all cursor-pointer"
            >
              حفظ وتطبيق التغييرات
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
