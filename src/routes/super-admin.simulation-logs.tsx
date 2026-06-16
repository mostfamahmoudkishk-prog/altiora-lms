import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  getSimulationLogsFn, 
  exportSimulationLogsFn 
} from "../lib/api/simulation.functions";
import { 
  Shield, 
  ArrowRight, 
  Search, 
  FileDown, 
  Download, 
  Eye, 
  Activity, 
  Layers, 
  ShieldAlert, 
  Clock, 
  Terminal, 
  Calendar, 
  Smartphone,
  Globe,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/super-admin/simulation-logs")({
  component: SimulationLogsPage,
});

interface LogEntry {
  id: string;
  adminEmail: string;
  adminName: string;
  targetEmail: string;
  targetName: string;
  targetRole: string;
  action: string;
  entityType: string;
  beforeValues: string | null;
  afterValues: string | null;
  ipAddress: string;
  device: string;
  timestamp: string;
  reason: string;
}

function SimulationLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [filterAction, setFilterAction] = useState("ALL");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getSimulationLogsFn();
      setLogs(res as LogEntry[]);
    } catch (err: any) {
      toast.error(err.message || "فشل تحميل سجلات المحاكاة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExport = async (format: "csv" | "excel") => {
    try {
      const res = await exportSimulationLogsFn({ data: { format } });
      if (format === "csv") {
        const blob = new Blob([res], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `simulation_audit_logs_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const base64 = res;
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
        link.download = `simulation_audit_logs_${Date.now()}.xlsx`;
        link.click();
      }
      toast.success("تم تصدير السجلات بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل تصدير السجلات");
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.adminName.toLowerCase().includes(search.toLowerCase()) ||
      log.targetEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.targetName.toLowerCase().includes(search.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(search.toLowerCase())) ||
      (log.entityType && log.entityType.toLowerCase().includes(search.toLowerCase()));

    const actionMatch = filterAction === "ALL" || log.action === filterAction;
    return searchMatch && actionMatch;
  });

  // Calculate statistics
  const stats = {
    totalSessions: logs.filter(l => l.action === "START_SIMULATION").length,
    activeSimulations: logs.filter(l => l.action === "START_SIMULATION").length - logs.filter(l => l.action === "STOP_SIMULATION").length,
    modifications: logs.filter(l => l.action !== "START_SIMULATION" && l.action !== "STOP_SIMULATION").length,
    criticalBlocks: logs.filter(l => l.action?.includes("BLOCKED") || l.action === "DELETE_BLOCKED").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            to="/super-admin"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-3"
          >
            <ArrowRight className="size-3.5" />
            العودة للوحة الإدارة الرئيسية
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold flex items-center gap-3">
            <Terminal className="size-8 text-primary" />
            سجلات ورقابة جلسات المحاكاة
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            متابعة كاملة لجميع الإجراءات التي يقوم بها مسؤولو النظام أثناء محاكاة حسابات الطلاب والمدرسين.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileDown className="size-4 text-emerald-500" />
            تصدير CSV
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-95 text-sm font-bold flex items-center gap-2 transition-all shadow-card cursor-pointer"
          >
            <Download className="size-4" />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Analytical Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between shadow-card">
          <div className="text-start">
            <span className="text-xs text-muted-foreground">إجمالي الجلسات</span>
            <h3 className="font-display text-2xl font-black text-foreground mt-1">{stats.totalSessions}</h3>
          </div>
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Clock className="size-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between shadow-card">
          <div className="text-start">
            <span className="text-xs text-muted-foreground">التعديلات المباشرة</span>
            <h3 className="font-display text-2xl font-black text-foreground mt-1">{stats.modifications}</h3>
          </div>
          <div className="size-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Activity className="size-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between shadow-card">
          <div className="text-start">
            <span className="text-xs text-muted-foreground">المنع الوقائي للمنشآت</span>
            <h3 className="font-display text-2xl font-black text-foreground mt-1">{stats.criticalBlocks}</h3>
          </div>
          <div className="size-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <ShieldAlert className="size-6" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between shadow-card">
          <div className="text-start">
            <span className="text-xs text-muted-foreground">محاكاة نشطة حالياً</span>
            <h3 className="font-display text-2xl font-black text-foreground mt-1">
              {stats.activeSimulations < 0 ? 0 : stats.activeSimulations}
            </h3>
          </div>
          <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Layers className="size-6" />
          </div>
        </div>
      </div>

      {/* Main Logs Table / View */}
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="البحث باسم المسؤول، البريد، الكيان، أو السبب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">نوع الإجراء:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">الكل</option>
              <option value="START_SIMULATION">بدء محاكاة</option>
              <option value="STOP_SIMULATION">إنهاء محاكاة</option>
              <option value="CREATE">إنشاء (Sandbox/Live)</option>
              <option value="UPDATE">تحديث (Sandbox/Live)</option>
              <option value="DELETE">حذف</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="size-8 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">جاري تحميل سجلات المراجعة...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-sm">
              لا توجد سجلات تطابق خيارات البحث الخاصة بك.
            </div>
          ) : (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted/10 border-b border-border text-xs text-muted-foreground font-bold">
                  <th className="p-4">المسؤول</th>
                  <th className="p-4">المستخدم المستهدف</th>
                  <th className="p-4">الإجراء</th>
                  <th className="p-4">الكيان المتأثر</th>
                  <th className="p-4">IP / الجهاز</th>
                  <th className="p-4">التوقيت</th>
                  <th className="p-4 text-center">البيانات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredLogs.map((log) => {
                  let actionBadge = "bg-neutral-800 text-neutral-300";
                  if (log.action === "START_SIMULATION") actionBadge = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
                  else if (log.action === "STOP_SIMULATION") actionBadge = "bg-rose-500/10 text-rose-500 border border-rose-500/20";
                  else if (log.action === "CREATE") actionBadge = "bg-blue-500/10 text-blue-500 border border-blue-500/20";
                  else if (log.action === "UPDATE") actionBadge = "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                  else if (log.action === "DELETE") actionBadge = "bg-red-500/10 text-red-500 border border-red-500/20";

                  return (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{log.adminName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{log.adminEmail}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">{log.targetName}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.targetEmail} ({log.targetRole === "STUDENT" ? "طالب" : "معلم"})
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${actionBadge}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs text-white bg-white/5 border border-white/10 px-2 py-1 rounded">
                          {log.entityType || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Globe className="size-3" />
                            {log.ipAddress}
                          </span>
                          <span className="flex items-center gap-1 truncate max-w-[150px]" title={log.device}>
                            <Smartphone className="size-3" />
                            {log.device}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="size-3" />
                            {new Date(log.timestamp).toLocaleDateString("ar-EG")}
                          </span>
                          <span className="font-mono mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString("ar-EG")}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="عرض تفاصيل التعديلات"
                        >
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Dialog Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-elevated flex flex-col max-h-[85vh] text-right" dir="rtl">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <h2 className="font-display text-lg font-bold">تفاصيل العملية وتغييرات البيانات</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold bg-white/5 border border-white/10 rounded-lg p-1.5 cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              {/* Summary Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/60">
                <div>
                  <span className="text-xs text-muted-foreground block">المسؤول المنفذ:</span>
                  <span className="font-bold">{selectedLog.adminName} ({selectedLog.adminEmail})</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">الحساب المستهدف:</span>
                  <span className="font-bold">{selectedLog.targetName} ({selectedLog.targetEmail})</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">نوع العملية:</span>
                  <span className="font-bold font-mono text-primary">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">سبب المحاكاة:</span>
                  <span className="italic">{selectedLog.reason || "لا يوجد سبب محدد"}</span>
                </div>
              </div>

              {/* Data Diff (Before/After) */}
              {(selectedLog.beforeValues || selectedLog.afterValues) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before */}
                  <div>
                    <span className="text-xs font-bold text-rose-400 block mb-2">القيم السابقة (قبل التعديل):</span>
                    <pre className="p-4 rounded-xl border border-border bg-neutral-950 font-mono text-[11px] text-rose-300 overflow-x-auto max-h-[300px] text-left" dir="ltr">
                      {selectedLog.beforeValues 
                        ? JSON.stringify(JSON.parse(selectedLog.beforeValues), null, 2) 
                        : "null (إنشاء جديد)"}
                    </pre>
                  </div>
                  {/* After */}
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block mb-2">القيم الجديدة (بعد التعديل):</span>
                    <pre className="p-4 rounded-xl border border-border bg-neutral-950 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-[300px] text-left" dir="ltr">
                      {selectedLog.afterValues 
                        ? JSON.stringify(JSON.parse(selectedLog.afterValues), null, 2) 
                        : "null (حذف)"}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground italic border border-dashed border-border rounded-xl">
                  هذه العملية لا تحتوي على أي تغييرات في قيم قواعد البيانات (بدء أو إنهاء محاكاة).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
