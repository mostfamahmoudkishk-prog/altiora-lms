import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Plus, RefreshCw, CheckCircle, Trash2, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  getBackupLogsFn,
  createBackupLogFn,
  restoreBackupFn,
  deleteBackupLogFn,
} from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/backup")({
  component: SuperAdminBackup,
});

interface BackupItem {
  id: string;
  filename: string;
  size: string;
  date: string;
  status: "SUCCESS" | "FAILED";
}

function SuperAdminBackup() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load backups from database
  const loadBackups = async () => {
    try {
      const logs = await getBackupLogsFn();
      const mapped: BackupItem[] = logs.map((log: any) => ({
        id: log.id,
        filename: log.fileName,
        size: log.fileSize > 0 ? `${(log.fileSize / (1024 * 1024)).toFixed(1)} MB` : "0 MB",
        date: new Date(log.created_at).toLocaleString("ar-EG"),
        status: log.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      }));
      setBackups(mapped);
    } catch (err: any) {
      toast.error("فشل تحميل سجل النسخ الاحتياطي: " + err.message);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setLoading(true);
    toast.info("جاري إنشاء نسخة احتياطية من قاعدة البيانات والملفات...");

    try {
      const res = await createBackupLogFn({
        data: {
          action: "CREATE",
        },
      });

      await loadBackups();
      toast.success("تم إنشاء وحفظ النسخة الاحتياطية بنجاح: " + res.fileName);
    } catch (err: any) {
      toast.error("فشل إنشاء نسخة احتياطية: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (
      !confirm(
        `هل أنت متأكد من استعادة النسخة الاحتياطية (${filename})؟ سيتم إعادة قاعدة البيانات لهذه النقطة الزمنية.`,
      )
    )
      return;

    setLoading(true);
    toast.info("جاري تهيئة النظام واستعادة البيانات...");

    try {
      await restoreBackupFn({ data: { fileName: filename } });
      await loadBackups();
      toast.success("تم استعادة قاعدة البيانات والملفات بنجاح وأعيد تشغيل النظام.");
    } catch (err: any) {
      toast.error("فشل استعادة النسخة الاحتياطية: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الملف الاحتياطي نهائياً؟")) return;
    try {
      await deleteBackupLogFn({ data: { id } });
      await loadBackups();
      toast.success("تم حذف ملف النسخة الاحتياطية بنجاح");
    } catch (err: any) {
      toast.error("فشل حذف النسخة الاحتياطية: " + err.message);
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
            النسخ الاحتياطي والاستعادة (Backup & Restore)
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            إنشاء نسخ احتياطية شاملة لقاعدة البيانات والملفات بشكل يدوي واستعادتها في أي وقت لضمان عدم فقدان بيانات المنصة.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Plus className="size-4" /> إنشاء نسخة احتياطية فورية
          </button>
          <h3 className="font-display text-base font-bold text-amber-400 flex items-center gap-1.5">
            <Database className="size-5" />
            <span>الملفات وسجلات النسخ</span>
          </h3>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-zinc-400">
            <RefreshCw className="size-4 animate-spin text-amber-400" />
            <span className="font-bold">جاري معالجة العملية... يرجى الانتظار ولا تغلق الصفحة</span>
          </div>
        )}

        <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950/40">
          {backups.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 font-bold">
              لا توجد ملفات نسخ احتياطي مسجلة حالياً
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-end text-sm text-zinc-300">
                <thead>
                  <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                    <th className="px-6 py-4">الخيارات</th>
                    <th className="px-6 py-4">تاريخ الإنشاء</th>
                    <th className="px-6 py-4">الحجم</th>
                    <th className="px-6 py-4">حالة العملية</th>
                    <th className="px-6 py-4">اسم الملف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/80">
                  {backups.map((b) => (
                    <tr
                      key={b.id}
                      className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteBackup(b.id)}
                            disabled={loading}
                            className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all"
                            title="حذف الملف"
                          >
                            <Trash2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleRestore(b.filename)}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-black text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-all cursor-pointer"
                          >
                            <RefreshCw className="size-3.5" /> استعادة
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{b.date}</td>
                      <td className="px-6 py-4 font-mono font-bold text-white">{b.size}</td>
                      <td className="px-6 py-4">
                        {b.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="size-3" /> ناجحة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                            <ShieldAlert className="size-3" /> فشلت
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white text-xs">
                        {b.filename}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
