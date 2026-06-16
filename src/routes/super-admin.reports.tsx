import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Paperclip, FileText, User } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getSuperAdminAttachmentStatsFn } from "@/lib/api/db.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/reports")({
  component: SuperAdminReports,
});

const reportData = [
  { month: "يناير", revenue: 45000, students: 280 },
  { month: "فبراير", revenue: 52000, students: 390 },
  { month: "مارس", revenue: 68000, students: 510 },
  { month: "أبريل", revenue: 74000, students: 600 },
  { month: "مايو", revenue: 95000, students: 820 },
  { month: "يونيو", revenue: 125000, students: 1050 },
];

function SuperAdminReports() {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  useEffect(() => {
    loadAttachmentsStats();
  }, []);

  const loadAttachmentsStats = () => {
    setLoadingAttachments(true);
    getSuperAdminAttachmentStatsFn()
      .then((res: any) => {
        setAttachments(res || []);
      })
      .catch((err) => {
        toast.error("فشل تحميل إحصائيات المرفقات: " + err.message);
      })
      .finally(() => {
        setLoadingAttachments(false);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-end bg-transparent font-display text-white"
      dir="rtl"
    >
      {/* Title */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            التقارير التحليلية العامة للمنصة
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            عرض ملخص نمو الإيرادات، التوزيع الطلابي، وإحصائيات ملفات ومرفقات المحاضرات المرفوعة بالمنصة.
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
          <h4 className="font-bold text-amber-400 text-sm mb-2 flex items-center gap-2 justify-end">
            <span>نمو إيرادات المنصة الإجمالية</span>
            <TrendingUp className="size-4" />
          </h4>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData}>
                <defs>
                  <linearGradient id="colorReportRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "rgba(245,158,11,0.2)",
                    borderRadius: "16px",
                    color: "#fff",
                    direction: "rtl",
                    textAlign: "right",
                  }}
                  formatter={(value) => [`${value} ج.م`]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="الإيرادات"
                  stroke="#fbbf24"
                  fillOpacity={1}
                  fill="url(#colorReportRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-4">
          <h4 className="font-bold text-amber-400 text-sm mb-2 flex items-center gap-2 justify-end">
            <span>نمو قاعدة الطلاب المسجلين بالمنصة</span>
            <Users className="size-4" />
          </h4>
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f23" />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09090b",
                    borderColor: "rgba(245,158,11,0.2)",
                    borderRadius: "16px",
                    color: "#fff",
                    direction: "rtl",
                    textAlign: "right",
                  }}
                  formatter={(value) => [`${value} طالب`]}
                />
                <Bar
                  dataKey="students"
                  name="الطلاب الجدد"
                  fill="#fbbf24"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Attachments & Downloads statistics */}
      <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.08)] overflow-hidden">
        <div className="p-6 border-b border-zinc-900/80">
          <h3 className="font-display text-base font-bold text-amber-400 flex items-center gap-2 justify-end">
            <span>ملفات المرفقات المرفوعة وإحصائيات التحميل</span>
            <Paperclip className="size-5" />
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1">
            تتبع كافة الملفات والمستندات المرفوعة من قبل المعلمين ومعدل تحميل الطلاب لها.
          </p>
        </div>

        {loadingAttachments ? (
          <div className="p-10 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
            ))}
          </div>
        ) : attachments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-end text-xs text-zinc-300">
              <thead>
                <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-amber-500/80 font-bold text-[11px]">
                  <th className="px-6 py-4 text-start">مرات التحميل</th>
                  <th className="px-6 py-4 text-start">حجم الملف</th>
                  <th className="px-6 py-4 text-start">نوع الملف</th>
                  <th className="px-6 py-4 text-start">المحاضرة / الكورس</th>
                  <th className="px-6 py-4 text-right">المعلم</th>
                  <th className="px-6 py-4 text-right">اسم المرفق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {attachments.map((a) => {
                  const teacherName = a.uploader?.profile?.name || a.uploader?.email || "معلم عام";
                  const courseTitle = a.lesson?.module?.course?.title || "كورس غير معروف";
                  const lessonTitle = a.lesson?.title || "درس غير معروف";

                  return (
                    <tr
                      key={a.id}
                      className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                    >
                      <td className="px-6 py-4 text-start">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          {a._count?.downloads || 0} مرات تحميل
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-start font-mono font-bold">
                        {a.fileSize}
                      </td>
                      <td className="px-6 py-4 text-start uppercase font-bold text-white">
                        {a.fileType}
                      </td>
                      <td className="px-6 py-4 text-start">
                        <div className="font-bold text-white">{lessonTitle}</div>
                        <div className="text-[10px] text-zinc-500 font-bold mt-0.5">{courseTitle}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-right">{teacherName}</td>
                      <td className="px-6 py-4 font-bold text-white text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={a.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-amber-400 transition-all text-white font-black"
                          >
                            {a.name}
                          </a>
                          <Paperclip className="size-3.5 text-amber-400 shrink-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-500 font-bold bg-neutral-900/10">
            لا توجد ملفات مرفوعة على المنصة بعد.
          </div>
        )}
      </div>
    </motion.div>
  );
}
