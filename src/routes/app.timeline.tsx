import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Activity, Play, ClipboardList, FileDown, MessageSquare, Award, Clock } from "lucide-react";

export const Route = createFileRoute("/app/timeline")({
  head: () => ({
    meta: [{ title: "سجل أنشطتي | Altiora" }],
  }),
  component: ActivityTimelinePage,
});

interface TimelineItem {
  id: string;
  type: "video" | "exam" | "download" | "comment" | "certificate";
  title: string;
  details: string;
  timestamp: string;
}

const INITIAL_ACTIVITIES: TimelineItem[] = [
  {
    id: "a1",
    type: "video",
    title: "شاهدت درساً",
    details: "مشاهدة Present Simple & Continuous في كورس Epic Grammar 2026",
    timestamp: "اليوم - 12:40 م",
  },
  {
    id: "a2",
    type: "exam",
    title: "أكملت اختباراً",
    details: "حل اختبار زمن المضارع البسيط وحصلت على درجة 66.6% (ناجح)",
    timestamp: "اليوم - 12:35 م",
  },
  {
    id: "a3",
    type: "download",
    title: "تحميل ملف تعليمي",
    details: "تنزيل ملخص شرح زمن المضارع البسيط والمستمر PDF",
    timestamp: "اليوم - 12:02 م",
  },
  {
    id: "a4",
    type: "comment",
    title: "أضفت تعليقاً",
    details: "كتابة سؤال استفساري في درس المضارع البسيط",
    timestamp: "أمس - 04:15 م",
  },
  {
    id: "a5",
    type: "certificate",
    title: "حصلت على شهادة",
    details: "شهادة إتمام كورس أساسيات الرياضيات للثانوية العامة 2026",
    timestamp: "6/13/2026",
  },
];

import { getTimelineFn } from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";

function ActivityTimelinePage() {
  const [activities, setActivities] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    getTimelineFn({ data: { email: user.email } })
      .then((records) => {
        const mapped: TimelineItem[] = records.map((r: any) => {
          let title = "نشاط تعليمي";
          let details = "تفاصيل النشاط";

          if (r.type === "video") {
            title = "شاهدت درساً";
            details = `مشاهدة الدرس والتقدم إلى ${Math.floor(r.metadata?.second || 0)} ثانية.`;
          } else if (r.type === "exam") {
            title = "أكملت اختباراً";
            details = `حل اختبار وحصلت على درجة ${r.metadata?.score}% (${r.metadata?.passed ? "ناجح" : "راسب"}) مع رصد ${r.metadata?.violationsCount || 0} مخالفات.`;
          } else if (r.type === "download") {
            title = "تحميل ملف تعليمي";
            details = `تنزيل ملف: ${r.metadata?.file_name || ""} (${r.metadata?.size || ""})`;
          } else if (r.type === "comment") {
            title = "أضفت ملاحظة/تعليق";
            details = `كتابة ملاحظة: "${r.metadata?.note || ""}"`;
          } else if (r.type === "certificate") {
            title = "حصلت على شهادة";
            details = `تم إصدار شهادة إتمام بنجاح بنسبة نجاح ${r.metadata?.score}%.`;
          } else if (r.type === "login") {
            title = "سجلت الدخول";
            details = `تسجيل دخول ناجح للمنصة من جهاز (${r.metadata?.device || ""})`;
          } else if (r.type === "logout") {
            title = "سجلت الخروج";
            details = `تسجيل خروج أو إنهاء جلسة (${r.metadata?.info || ""})`;
          } else if (r.type === "password_change") {
            title = "تغيير كلمة المرور";
            details = "تحديث كلمة المرور وأمن الحساب بنجاح.";
          }

          return {
            id: r.id,
            type: r.type,
            title,
            details,
            timestamp: new Date(r.created_at).toLocaleString("ar-EG", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        });
        setActivities(mapped);
        setLoading(false);
      })
      .catch(() => {
        setActivities(INITIAL_ACTIVITIES);
        setLoading(false);
      });
  }, []);

  const getIcon = (type: TimelineItem["type"]) => {
    switch (type) {
      case "video":
        return <Play className="size-4 text-primary" />;
      case "exam":
        return <ClipboardList className="size-4 text-success" />;
      case "download":
        return <FileDown className="size-4 text-info" />;
      case "comment":
        return <MessageSquare className="size-4 text-amber-500" />;
      case "certificate":
        return <Award className="size-4 text-accent" />;
    }
  };

  const getBadgeColor = (type: TimelineItem["type"]) => {
    switch (type) {
      case "video":
        return "bg-primary/10 border-primary/20 text-primary";
      case "exam":
        return "bg-success/10 border-success/20 text-success";
      case "download":
        return "bg-info/10 border-info/20 text-info";
      case "comment":
        return "bg-amber-500/10 border-amber-500/20 text-amber-500";
      case "certificate":
        return "bg-accent/10 border-accent/20 text-accent";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-end" dir="rtl">
      {/* Title Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card sm:flex-row sm:items-center">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <span>سجل أنشطتي التعليمية (خط الزمن)</span>
          <Activity className="size-6 text-primary" />
        </h2>
        <span className="text-xs text-muted-foreground">تتبع كامل لمراحل وخطوات تقدمك</span>
      </div>

      {/* Timeline flow */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
          جاري تحميل سجل الأنشطة من الخادم...
        </div>
      ) : activities.length > 0 ? (
        <div className="relative border-r-2 border-border/80 mr-4 space-y-8 py-2">
          {activities.map((item) => (
            <div key={item.id} className="relative pr-8">
              {/* Timeline Dot */}
              <div
                className={`absolute -right-3 top-1.5 flex size-6 items-center justify-center rounded-full border bg-card shadow-sm`}
              >
                {getIcon(item.type)}
              </div>

              {/* Timeline Card */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="size-3" /> {item.timestamp}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getBadgeColor(item.type)}`}
                  >
                    {item.title}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  {item.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
          لا يوجد أي نشاط مسجل في حسابك حتى الآن.
        </div>
      )}
    </div>
  );
}
