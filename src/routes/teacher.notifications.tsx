import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Send, Calendar, Clock, CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getSentMessagesFn,
  sendMessageFn,
  deleteMessageFn,
  getCoursesFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/teacher/notifications")({
  component: TeacherNotifications,
});

interface CourseOpt {
  id: string;
  title: string;
}

interface DBMessage {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  recipients?: any[];
}

function TeacherNotifications() {
  const [logs, setLogs] = useState<DBMessage[]>([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("ALL");
  const [type, setType] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [scheduledTime, setScheduledTime] = useState("");

  useEffect(() => {
    loadSentMessages();
    loadCourses();
  }, []);

  const loadSentMessages = () => {
    setLoading(true);
    getSentMessagesFn()
      .then((res: any) => {
        setLogs(res || []);
      })
      .catch((err) => {
        toast.error("فشل تحميل سجل الإشعارات: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const loadCourses = () => {
    getCoursesFn()
      .then((res: any) => {
        const mapped = (res || []).map((c: any) => ({
          id: c.id,
          title: c.title,
        }));
        setCourses(mapped);
      })
      .catch(console.error);
  };

  const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title || !body) {
      toast.error("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    if (type === "SCHEDULED" && !scheduledTime) {
      toast.error("يرجى تحديد وقت الجدولة");
      return;
    }

    try {
      const isAll = target === "ALL";
      await sendMessageFn({
        data: {
          title,
          content: body,
          sendToAllStudents: isAll,
          courseId: isAll ? undefined : target,
          type: type === "IMMEDIATE" ? "ANNOUNCEMENT" : "WARNING",
        },
      });

      setTitle("");
      setBody("");
      setScheduledTime("");
      toast.success(
        type === "IMMEDIATE" ? "تم إرسال الإشعار لجميع المشتركين بنجاح" : "تمت جدولة الإشعار بنجاح",
      );
      loadSentMessages();
    } catch (err: any) {
      toast.error("فشل إرسال الإشعار: " + err.message);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    try {
      await deleteMessageFn({ data: { id } });
      toast.success("تم الحذف بنجاح");
      loadSentMessages();
    } catch (err: any) {
      toast.error("فشل حذف السجل: " + err.message);
    }
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">الإعلانات والإشعارات</h2>
          <p className="text-xs text-muted-foreground mt-1">
            أرسل تنبيهات عاجلة لطلابك أو قم بجدولة إشعارات تذكيرية
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Creator panel */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            إنشاء إعلان جديد
          </h3>
          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                عنوان الإشعار
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="أدخل عنواناً واضحاً..."
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                محتوى الإعلان
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={4}
                placeholder="اكتب تفاصيل الإعلان هنا..."
                className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الفئة المستهدفة
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="ALL">جميع دوراتي</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Type tabs */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">
                طريقة الإرسال
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/40 p-1">
                <button
                  type="button"
                  onClick={() => setType("SCHEDULED")}
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
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
                  className={`rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    type === "IMMEDIATE"
                      ? "bg-card text-primary shadow-sm"
                      : "text-foreground/80 hover:bg-card/40"
                  }`}
                >
                  إرسال فوري
                </button>
              </div>
            </div>

            {type === "SCHEDULED" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  وقت الإرسال المجدول
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all cursor-pointer"
            >
              {type === "IMMEDIATE" ? (
                <>
                  <Send className="size-4 animate-pulse" /> <span>إرسال الآن</span>
                </>
              ) : (
                <>
                  <Calendar className="size-4" /> <span>تأكيد الجدولة</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History log */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card lg:col-span-2 space-y-4">
          <h3 className="font-display text-base font-bold text-foreground">
            سجل الإشعارات المرسلة والمجدولة
          </h3>

          <div className="divide-y divide-border">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                جاري تحميل صندوق الرسائل...
              </div>
            ) : logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 self-center cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="size-4" />
                  </button>

                  <div className="flex-1 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <span className="inline-flex items-center gap-0.5 rounded bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <CheckCircle className="size-3" /> تم الإرسال
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("ar-EG")}
                      </span>
                    </div>

                    <h4 className="mt-1 font-bold text-foreground text-sm">{log.title}</h4>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      {log.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد إشعارات سابقة
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
