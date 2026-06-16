import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Award,
  CheckCircle,
  XCircle,
  Search,
  HelpCircle,
  Plus,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/certificates")({
  component: AdminCertificates,
});

interface CertificateItem {
  code: string;
  studentName: string;
  courseTitle: string;
  issueDate: string;
  status: "ACTIVE" | "CANCELLED";
}

const initialCertificates: CertificateItem[] = [
  {
    code: "CERT-2026-091A",
    studentName: "يوسف خالد محمود",
    courseTitle: "Epic Grammer 2026",
    issueDate: "2026-06-01",
    status: "ACTIVE",
  },
  {
    code: "CERT-2026-140B",
    studentName: "أحمد محمود حسن",
    courseTitle: "أساسيات الرياضيات 2026",
    issueDate: "2026-05-20",
    status: "ACTIVE",
  },
  {
    code: "CERT-2026-782C",
    studentName: "سارة خالد أحمد",
    courseTitle: "PrePre IQ Intermediate",
    issueDate: "2026-04-15",
    status: "CANCELLED",
  },
];

function AdminCertificates() {
  const [certs, setCerts] = useState<CertificateItem[]>(initialCertificates);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);

  // Form states
  const [formStudent, setFormStudent] = useState("");
  const [formCourse, setFormCourse] = useState("Epic Grammer 2026");

  // Verification states
  const [verifyCodeInput, setVerifyCodeInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    found: boolean;
    cert?: CertificateItem;
  } | null>(null);

  // Search, Filter & Pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredCerts = useMemo(() => {
    return certs
      .filter((c) => filterStatus === "ALL" || c.status === filterStatus)
      .filter(
        (c) =>
          c.studentName.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      );
  }, [certs, filterStatus, search]);

  const paginatedCerts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCerts.slice(start, start + itemsPerPage);
  }, [filteredCerts, page]);

  const totalPages = Math.ceil(filteredCerts.length / itemsPerPage) || 1;

  // Issue Certificate
  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudent) {
      toast.error("يرجى إدخال اسم الطالب");
      return;
    }

    const newCert: CertificateItem = {
      code:
        "CERT-2026-" +
        Math.floor(100 + Math.random() * 900) +
        String.fromCharCode(65 + Math.floor(Math.random() * 26)),
      studentName: formStudent,
      courseTitle: formCourse,
      issueDate: new Date().toISOString().split("T")[0],
      status: "ACTIVE",
    };

    setCerts((prev) => [newCert, ...prev]);
    setIsIssueOpen(false);
    setFormStudent("");
    toast.success("تم إصدار الشهادة بنجاح للكود: " + newCert.code);
  };

  // Verify Certificate
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verifyCodeInput.toUpperCase().trim();
    const foundCert = certs.find((c) => c.code.toUpperCase().trim() === cleanCode);

    if (foundCert) {
      setVerifyResult({ found: true, cert: foundCert });
    } else {
      setVerifyResult({ found: false });
    }
  };

  // Cancel Certificate
  const handleCancelCert = (code: string) => {
    if (!confirm("هل أنت متأكد من إلغاء صلاحية هذه الشهادة؟ لن تعود صالحة للتحقق.")) return;
    setCerts((prev) => prev.map((c) => (c.code === code ? { ...c, status: "CANCELLED" } : c)));
    toast.success("تم إلغاء الشهادة بنجاح");
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "الرقم التسلسلي,الطالب,الدورة,تاريخ الإصدار,الحالة\n";
    filteredCerts.forEach((c) => {
      csvContent += `"${c.code}","${c.studentName}","${c.courseTitle}","${c.issueDate}","${c.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "certificates_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجل الشهادات بنجاح");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Top tools bar */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:flex-row">
        {/* Actions left (RTL) */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير Excel
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <FileText className="size-4 text-blue-500" /> تصدير PDF
          </button>
          <button
            onClick={() => {
              setVerifyCodeInput("");
              setVerifyResult(null);
              setIsVerifyOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-all"
          >
            <HelpCircle className="size-4 text-primary" /> تحقق من شهادة
          </button>
          <button
            onClick={() => setIsIssueOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
          >
            <Plus className="size-4" /> إصدار شهادة
          </button>
        </div>

        {/* Filters right (RTL) */}
        <div className="flex w-full flex-1 items-center justify-end gap-3 lg:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="ACTIVE">صالحة (نشطة)</option>
            <option value="CANCELLED">ملغاة (Cancelled)</option>
          </select>
          <input
            type="search"
            placeholder="البحث باسم الطالب أو رقم الشهادة..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">تاريخ الإصدار</th>
              <th className="px-5 py-4">الحالة</th>
              <th className="px-5 py-4">الدورة التعليمية</th>
              <th className="px-5 py-4">اسم الطالب</th>
              <th className="px-5 py-4">الرقم التسلسلي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedCerts.map((c) => (
              <tr key={c.code} className="transition-colors hover:bg-secondary/20">
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleCancelCert(c.code)}
                    disabled={c.status === "CANCELLED"}
                    className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 bg-card px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                  >
                    <XCircle className="size-3.5" /> إلغاء الشهادة
                  </button>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{c.issueDate}</td>
                <td className="px-5 py-3">
                  {c.status === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                      <CheckCircle className="size-3" /> صالحة
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                      <XCircle className="size-3" /> ملغاة
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-semibold text-primary">{c.courseTitle}</td>
                <td className="px-5 py-3 font-bold text-foreground">{c.studentName}</td>
                <td className="px-5 py-3 font-mono font-bold text-foreground">{c.code}</td>
              </tr>
            ))}
            {paginatedCerts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === totalPages}
            onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page === 1}
            onClick={() => setPage((v) => Math.max(v - 1, 1))}
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      )}

      {/* Issue Certificate Dialog */}
      <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              إصدار شهادة نجاح جديدة
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIssue} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                اسم الطالب الكامل
              </label>
              <input
                type="text"
                value={formStudent}
                onChange={(e) => setFormStudent(e.target.value)}
                required
                placeholder="أدخل اسم الطالب..."
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الدورة التعليمية
              </label>
              <select
                value={formCourse}
                onChange={(e) => setFormCourse(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="Epic Grammer 2026">Epic Grammer 2026</option>
                <option value="أساسيات الرياضيات 2026">أساسيات الرياضيات 2026</option>
                <option value="PrePre IQ Intermediate">PrePre IQ Intermediate</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
            >
              إصدار الشهادة الآن
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              التحقق من صحة الشهادة
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVerify} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                الرقم التسلسلي للشهادة (Serial Code)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="مثال: CERT-2026-091A"
                  value={verifyCodeInput}
                  onChange={(e) => setVerifyCodeInput(e.target.value)}
                  className="h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary font-mono text-center"
                />
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-card hover:opacity-95"
                >
                  فحص
                </button>
              </div>
            </div>

            {verifyResult !== null && (
              <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
                {verifyResult.found ? (
                  verifyResult.cert?.status === "ACTIVE" ? (
                    <div className="text-center space-y-2">
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-success/20 text-success">
                        <Award className="size-6" />
                      </span>
                      <span className="block text-sm font-bold text-success">
                        الشهادة صالحة ومعتمدة ✓
                      </span>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        طالب:{" "}
                        <span className="font-semibold text-foreground">
                          {verifyResult.cert.studentName}
                        </span>
                        <br />
                        دورة:{" "}
                        <span className="font-semibold text-foreground">
                          {verifyResult.cert.courseTitle}
                        </span>
                        <br />
                        تاريخ الإصدار: {verifyResult.cert.issueDate}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                        <XCircle className="size-6" />
                      </span>
                      <span className="block text-sm font-bold text-destructive">
                        تم إلغاء هذه الشهادة مسبقاً ✗
                      </span>
                    </div>
                  )
                ) : (
                  <div className="text-center space-y-1 py-2 text-destructive">
                    <span className="block text-sm font-bold">هذه الشهادة غير مسجلة بالنظام ✗</span>
                    <span className="text-xs text-muted-foreground">
                      تأكد من كتابة الرقم التسلسلي بشكل صحيح.
                    </span>
                  </div>
                )}
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
