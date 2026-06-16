import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { FileDown, Search, Download, ExternalLink, Calendar, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/downloads")({
  head: () => ({
    meta: [{ title: "سجل الملفات المحملة | Altiora" }],
  }),
  component: DownloadsPage,
});

interface DownloadedFile {
  id: string;
  fileName: string;
  courseTitle: string;
  fileSize: string;
  downloadedAt: string;
  fileUrl: string;
}

const INITIAL_DOWNLOADS: DownloadedFile[] = [
  {
    id: "f1",
    fileName: "ملخص شرح زمن المضارع البسيط والمستمر PDF",
    courseTitle: "Epic Grammar 2026",
    fileSize: "1.2 MB",
    downloadedAt: "6/14/2026",
    fileUrl: "http://example.com/grammar-pdf.pdf",
  },
  {
    id: "f2",
    fileName: "تمارين وتدريبات الوحدة الأولى في الجبر",
    courseTitle: "أساسيات الرياضيات للثانوية العامة 2026",
    fileSize: "2.4 MB",
    downloadedAt: "6/13/2026",
    fileUrl: "http://example.com/algebra-practice.pdf",
  },
];

import { getDownloadsHistoryFn } from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";
import { getStudentCodeFn } from "@/lib/api/auth.functions";

async function loadPdfLib(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).PDFLib) {
    return (window as any).PDFLib;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
    script.onload = () => {
      resolve((window as any).PDFLib);
    };
    script.onerror = (err) => {
      reject(new Error("Failed to load PDF watermarking library."));
    };
    document.body.appendChild(script);
  });
}

async function watermarkPdf(pdfUrl: string, studentCode: string, fileName: string) {
  const toastId = toast.loading("جاري معالجة وتحميل الملف وحقن العلامة المائية...");
  try {
    const PDFLib = await loadPdfLib();
    if (!PDFLib) throw new Error("PDFLib not available");
    
    let response;
    try {
      response = await fetch(pdfUrl);
    } catch (corsErr) {
      console.warn("CORS block when fetching PDF, falling back to direct download", corsErr);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
      toast.success("تم بدء تحميل الملف مباشرة.");
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const { rgb, degrees, StandardFonts } = PDFLib;
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const watermarkText = `ID: ${studentCode}`;
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width / 3,
        y: height / 2,
        size: Math.min(width, height) / 12,
        font: helveticaFont,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.15,
        rotate: degrees(45),
      });
    }
    
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.dismiss(toastId);
    toast.success("تم تحميل الملف وحقن العلامة المائية بنجاح.");
  } catch (err: any) {
    console.error("Failed to watermark PDF:", err);
    toast.dismiss(toastId);
    toast.error("حدث خطأ أثناء معالجة الملف، جاري التحميل المباشر...");
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadedFile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [studentCode, setStudentCode] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    getDownloadsHistoryFn({ data: { email: user.email } })
      .then((records) => {
        const mapped: DownloadedFile[] = records.map((r: any) => ({
          id: r.id,
          fileName: r.file_name,
          courseTitle:
            r.course_title ||
            (r.file_name.includes("الرياضيات") || r.file_name.includes("الجبر")
              ? "أساسيات الرياضيات للثانوية العامة 2026"
              : "Epic Grammar 2026"),
          fileSize: r.size || "1.2 MB",
          downloadedAt: new Date(r.downloaded_at).toLocaleDateString("ar-EG"),
          fileUrl: r.file_url || "#",
        }));
        setDownloads(mapped);
        setLoading(false);
      })
      .catch(() => {
        setDownloads(INITIAL_DOWNLOADS);
        setLoading(false);
      });

    // Resolve studentCode
    if (user.studentCode) {
      setStudentCode(user.studentCode);
    } else {
      getStudentCodeFn({ data: { email: user.email } })
        .then((res: any) => {
          if (res?.studentCode) {
            setStudentCode(res.studentCode);
          }
        })
        .catch(() => {});
    }
  }, []);

  const filtered = downloads.filter(
    (d) =>
      d.fileName.toLowerCase().includes(search.toLowerCase()) ||
      d.courseTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRedownload = async (fileUrl: string, fileName: string) => {
    const isPdf = fileUrl.toLowerCase().includes(".pdf") || fileName.toLowerCase().includes(".pdf");
    if (isPdf && studentCode && fileUrl && fileUrl !== "#") {
      await watermarkPdf(fileUrl, studentCode, fileName);
    } else {
      toast.success(`بدء إعادة تحميل الملف: ${fileName}`);
      if (fileUrl && fileUrl !== "#") {
        window.open(fileUrl, "_blank");
      }
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-end" dir="rtl">
      {/* Header Title */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card sm:flex-row">
        <div className="relative w-full sm:w-72">
          <input
            type="search"
            placeholder="البحث في الملفات المحملة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card px-4 pl-10 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-end"
          />
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <span>سجل الملفات والمرفقات المحملة</span>
          <FileDown className="size-6 text-primary" />
        </h2>
      </div>

      {/* Downloads list table */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
          جاري تحميل سجل التنزيلات من الخادم...
        </div>
      ) : filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs">
              <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 text-center">التحميل</th>
                  <th className="px-5 py-4">تاريخ التحميل</th>
                  <th className="px-5 py-4">الحجم</th>
                  <th className="px-5 py-4">الكورس</th>
                  <th className="px-5 py-4">اسم الملف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-secondary/20">
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleRedownload(item.fileUrl, item.fileName)}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        title="إعادة تحميل"
                      >
                        <Download className="size-4" />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground" /> {item.downloadedAt}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground font-semibold">
                      {item.fileSize}
                    </td>
                    <td className="px-5 py-4 text-primary font-bold">
                      <span className="inline-flex items-center gap-1.5 justify-end">
                        <span>{item.courseTitle}</span>
                        <BookOpen className="size-3.5" />
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-foreground">{item.fileName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
          لا توجد ملفات محملة تطابق شروط بحثك حالياً.
        </div>
      )}
    </div>
  );
}
