import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Send,
  Trash2,
  AlertTriangle,
  UserCheck,
  CalendarDays,
  Smartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/notifications")({
  component: SuperAdminNotifications,
});

interface BroadcastLog {
  id: string;
  title: string;
  body: string;
  audience: string;
  date: string;
}

interface SmartAlert {
  id: string;
  category: "TEACHER_REQUEST" | "EXPIRED_SUB" | "SUSPICIOUS_REVIEW" | "BANNED_STUDENT";
  title: string;
  detail: string;
  badgeText: string;
  badgeType: "RED" | "GOLD";
  time: string;
}

const initialLogs: BroadcastLog[] = [
  {
    id: "b-1",
    title: "تحديث الصيانة المجدولة",
    body: "سيتم إجراء صيانة فنية للموقع اليوم الساعة 2 صباحاً ولمدة نصف ساعة.",
    audience: "الكل",
    date: "2026-06-13",
  },
];

const initialSmartAlerts: SmartAlert[] = [
  {
    id: "s-1",
    category: "TEACHER_REQUEST",
    title: "طلب ترقية وعلامة تجارية جديدة",
    detail: "أرسل المعلم أ. محمد عبد الله طلباً لتفعيل الهوية المخصصة لرفع الشعار الخاص به.",
    badgeText: "طلب مدرس جديد",
    badgeType: "GOLD",
    time: "منذ دقيقتين",
  },
  {
    id: "s-2",
    category: "EXPIRED_SUB",
    title: "اشتراك الهوية المخصصة منتهي",
    detail: "انتهى ترخيص الهوية التجارية لـ أ. مصطفى حسني (دورة الرياضيات) اليوم.",
    badgeText: "اشتراك منتهي",
    badgeType: "RED",
    time: "منذ ساعة",
  },
  {
    id: "s-3",
    category: "SUSPICIOUS_REVIEW",
    title: "مؤشر هجوم تقييمات سلبي (Review Bomb)",
    detail:
      "تم رصد 5 تقييمات متتالية بنجمة واحدة من أجهزة مجهولة خلال 10 دقائق على المعلم أ. خالد.",
    badgeText: "تقييم مشبوه",
    badgeType: "RED",
    time: "منذ ساعتين",
  },
  {
    id: "s-4",
    category: "BANNED_STUDENT",
    title: "تم تقييد حساب طالب تلقائياً",
    detail: "تم حظر الطالب عمر علي لتخطيه الحد الأقصى للجلسات المتصلة من 4 أجهزة مختلفة.",
    badgeText: "طالب محظور",
    badgeType: "GOLD",
    time: "منذ 4 ساعات",
  },
];

function SuperAdminNotifications() {
  const [logs, setLogs] = useState<BroadcastLog[]>(initialLogs);
  const [alerts, setAlerts] = useState<SmartAlert[]>(initialSmartAlerts);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("ALL");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    const newLog = {
      id: "b_" + Date.now(),
      title,
      body,
      audience:
        audience === "ALL" ? "الجميع" : audience === "TEACHERS" ? "المعلمون فقط" : "الطلاب فقط",
      date: new Date().toISOString().split("T")[0],
    };

    setLogs((prev) => [newLog, ...prev]);
    setTitle("");
    setBody("");
    toast.success("تم إرسال بث التنبيه العام بنجاح");
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    toast.success("تمت معالجة التنبيه بنجاح");
  };

  return (
    <div className="space-y-6 text-end bg-transparent font-display text-white" dir="rtl">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)]">
        <h3 className="font-display text-lg font-black text-amber-400">
          مركز التنبيهات الذكي وبث الإعلانات
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          مراقبة الإشعارات الإدارية، طلبات المعلمين، حماية الجلسات، وبث الإعلانات الفورية لكافة
          شرائح المنصة.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Side: Broadcast alerts center */}
        <div className="space-y-6">
          {/* Send Broadcast form */}
          <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
            <h4 className="font-bold text-amber-400 text-sm mb-4 flex items-center justify-end gap-1.5">
              <span>بث إعلان عام جديد</span>
              <Send className="size-4" />
            </h4>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  عنوان التنبيه
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-amber-500 text-end"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  تفاصيل الرسالة
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-neutral-900 p-3 text-xs text-white outline-none focus:border-amber-500 text-end"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">المستهدفون</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-amber-500 text-end font-bold"
                >
                  <option value="ALL">جميع مستخدمي المنصة</option>
                  <option value="TEACHERS">المعلمون فقط</option>
                  <option value="STUDENTS">الطلاب فقط</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-black text-black hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                بث التنبيه
              </button>
            </form>
          </div>

          {/* Broadcast Logs list */}
          <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
            <h4 className="font-bold text-amber-400 text-sm border-b border-zinc-900/80 pb-3">
              سجل التنبيهات المذاعة
            </h4>
            <div className="divide-y divide-zinc-900">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex items-start gap-4 justify-between">
                  <button
                    onClick={() => setLogs((prev) => prev.filter((l) => l.id !== log.id))}
                    className="rounded-xl bg-red-950/20 border border-red-500/15 p-2 text-red-400 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <div className="flex-1 text-right">
                    <div className="text-[9px] text-zinc-500 font-mono">
                      {log.date} — الجمهور المستهدف: {log.audience}
                    </div>
                    <h5 className="font-extrabold text-xs text-white mt-1">{log.title}</h5>
                    <p className="text-[11px] text-zinc-400 mt-1">{log.body}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="py-8 text-center text-zinc-500 text-xs italic">
                  لا توجد تنبيهات إذاعية مسجلة.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Smart Notifications center feed */}
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-amber-400 text-sm border-b border-zinc-900/80 pb-3 flex items-center justify-end gap-1.5">
              <span>تنبيهات النظام الموجهة</span>
              <Bell className="size-4" />
            </h4>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {alerts.map((item) => {
              const badgeStyle =
                item.badgeType === "RED"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20";

              const AlertIcon =
                {
                  TEACHER_REQUEST: UserCheck,
                  EXPIRED_SUB: CalendarDays,
                  SUSPICIOUS_REVIEW: AlertTriangle,
                  BANNED_STUDENT: Smartphone,
                }[item.category] || Bell;

              return (
                <div
                  key={item.id}
                  className="bg-neutral-900/30 border border-zinc-900 hover:border-amber-500/15 transition-all p-4 rounded-2xl space-y-3 text-right"
                >
                  <div className="flex justify-between items-center flex-row-reverse">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-black rounded-full px-2.5 py-0.5 ${badgeStyle}`}
                      >
                        {item.badgeText}
                      </span>
                      <div className="size-7 rounded-lg bg-neutral-950 flex items-center justify-center border border-zinc-800 text-amber-400">
                        <AlertIcon className="size-4" />
                      </div>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono">{item.time}</span>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-xs text-white">{item.title}</h5>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">{item.detail}</p>
                  </div>

                  <div className="flex justify-start gap-2 pt-1">
                    <button
                      onClick={() => handleDismissAlert(item.id)}
                      className="rounded-lg bg-neutral-900 border border-zinc-800 hover:border-amber-500/20 px-3 py-1 text-[10px] font-bold text-zinc-300 hover:text-amber-400 transition-all cursor-pointer"
                    >
                      معالجة وإغلاق التنبيه
                    </button>
                  </div>
                </div>
              );
            })}
            {alerts.length === 0 && (
              <div className="py-12 text-center text-zinc-500 text-xs italic flex flex-col items-center gap-2">
                <ShieldCheck className="size-8 text-emerald-500/80" />
                <span>جميع تنبيهات النظام معالجة وآمنة 100%!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
