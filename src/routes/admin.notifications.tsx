import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Send, Calendar, Clock, CheckCircle, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotifications,
});

interface BroadcastLog {
  id: string;
  title: string;
  body: string;
  audience: "ALL" | "STUDENTS" | "TEACHERS";
  type: "IMMEDIATE" | "SCHEDULED";
  status: "SENT" | "SCHEDULED";
  scheduledTime?: string;
}

const initialLogs: BroadcastLog[] = [
  {
    id: "br-1",
    title: "تحديث شروط الاستخدام والسياسة",
    body: "يرجى العلم بأنه تم تحديث سياسة الخصوصية وشروط الاستخدام للمنصة ابتداءً من يونيو 2026.",
    audience: "ALL",
    type: "IMMEDIATE",
    status: "SENT",
  },
  {
    id: "br-2",
    title: "حملة خصومات الصيف الكبرى",
    body: "احصل على خصم 20% على جميع كودات المواد الدراسية الثانوية باستخدام الكوبون ALTIORA2026.",
    audience: "STUDENTS",
    type: "SCHEDULED",
    status: "SCHEDULED",
    scheduledTime: "2026-06-20 12:00",
  },
];

function AdminNotifications() {
  const [logs, setLogs] = useState<BroadcastLog[]>(initialLogs);

  // Form states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "STUDENTS" | "TEACHERS">("ALL");
  const [type, setType] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    if (type === "SCHEDULED" && !scheduledTime) return;

    const newLog: BroadcastLog = {
      id: "br_" + Date.now(),
      title,
      body,
      audience,
      type,
      status: type === "IMMEDIATE" ? "SENT" : "SCHEDULED",
      scheduledTime: type === "SCHEDULED" ? scheduledTime.replace("T", " ") : undefined,
    };

    setLogs((prev) => [newLog, ...prev]);
    setTitle("");
    setBody("");
    setScheduledTime("");

    toast.success(
      type === "IMMEDIATE"
        ? "تم إرسال الإشعار العام لجميع المستخدمين المستهدفين"
        : "تمت جدولة إرسال الإشعار بنجاح",
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل تريد حذف هذا الإشعار من السجلات؟")) return;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    toast.success("تم الحذف بنجاح");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          أرسل إشعارات عاجلة وتحديثات هامة لمختلف مستخدمي المنصة
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          بث الإعلانات والإشعارات العامة
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Creation panel */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">إنشاء بث جديد</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                عنوان التنبيه
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="أدخل عنوان البث العام..."
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                مضمون الرسالة
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                placeholder="تفاصيل التحديث أو العرض..."
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                المستهدفون بالبث
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="ALL">جميع مستخدمي المنصة (طلاب ومعلمون)</option>
                <option value="STUDENTS">الطلاب فقط</option>
                <option value="TEACHERS">المعلمون فقط</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                طريقة الإرسال
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/40 p-1">
                <button
                  type="button"
                  onClick={() => setType("SCHEDULED")}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                    type === "SCHEDULED"
                      ? "bg-card text-primary shadow-sm"
                      : "text-foreground/80 hover:bg-card/40"
                  }`}
                >
                  جدولة الإرسال
                </button>
                <button
                  type="button"
                  onClick={() => setType("IMMEDIATE")}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                    type === "IMMEDIATE"
                      ? "bg-card text-primary shadow-sm"
                      : "text-foreground/80 hover:bg-card/40"
                  }`}
                >
                  بث فوري
                </button>
              </div>
            </div>

            {type === "SCHEDULED" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  تاريخ ووقت الإرسال
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              {type === "IMMEDIATE" ? (
                <>
                  <Send className="size-4" /> <span>بث الآن</span>
                </>
              ) : (
                <>
                  <Calendar className="size-4" /> <span>تأكيد الجدولة</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Logs */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2 space-y-4">
          <h3 className="font-display text-base font-bold text-foreground">
            سجلات الإعلانات المرسلة والمجدولة
          </h3>

          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                <button
                  onClick={() => handleDelete(log.id)}
                  className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 self-center"
                  title="حذف"
                >
                  <Trash2 className="size-4" />
                </button>

                <div className="flex-1 text-end">
                  <div className="flex items-center justify-end gap-2">
                    {log.status === "SENT" ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <CheckCircle className="size-3" /> تم البث
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        <Clock className="size-3" /> مجدول ({log.scheduledTime})
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Users className="size-3 text-primary" />
                      الجمهور:{" "}
                      {log.audience === "ALL"
                        ? "الجميع"
                        : log.audience === "STUDENTS"
                          ? "الطلاب"
                          : "المعلمون"}
                    </span>
                  </div>

                  <h4 className="mt-1 font-bold text-foreground text-sm">{log.title}</h4>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{log.body}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد إشعارات عامة سابقة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
