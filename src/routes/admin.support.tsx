import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupport,
});

interface TicketItem {
  id: string;
  studentName: string;
  subject: string;
  category: "BUG" | "PAYMENT" | "COMPLAINT" | "QUESTION";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  date: string;
  message: string;
  replies: { sender: string; text: string; date: string }[];
}

const initialTickets: TicketItem[] = [
  {
    id: "TCK-4812",
    studentName: "محمد أحمد علي",
    subject: "مشكلة في تحميل ملفات PDF الدرس الثاني",
    category: "BUG",
    status: "OPEN",
    date: "2026-06-13",
    message: "عند محاولة تحميل مذكرة الشرح للدرس الثاني تظهر لي صفحة خطأ 404. يرجى المساعدة.",
    replies: [],
  },
  {
    id: "TCK-3291",
    studentName: "منى عبد الرحمن أحمد",
    subject: "سؤال بخصوص كود الشحن عبر فوري",
    category: "PAYMENT",
    status: "IN_PROGRESS",
    date: "2026-06-12",
    message: "قمت بدفع قيمة الاشتراك وحصلت على إيصال فوري، ولكن الدورة لم تفعل في حسابي حتى الآن.",
    replies: [
      {
        sender: "الدعم الفني",
        text: "أهلاً بكِ منى، يرجى تزويدنا برقم الطلب المرجعي الموضح في إيصال الدفع للتحقق منه فوراً.",
        date: "2026-06-12",
      },
    ],
  },
  {
    id: "TCK-1982",
    studentName: "يوسف خالد محمود",
    subject: "شكوى بخصوص بطء استجابة المدرس",
    category: "COMPLAINT",
    status: "RESOLVED",
    date: "2026-06-08",
    message:
      "أرسلت سؤالاً في بنك الأسئلة قبل 4 أيام ولم أتلق إجابة حتى الآن. الدورة مدفوعة ويجب تسريع الردود.",
    replies: [
      {
        sender: "مسؤول المنصة",
        text: "مرحباً يوسف، نعتذر بشدة عن التأخير. تم التواصل مع المعلم والإجابة على سؤالك وتنبيه المعلم بضرورة متابعة بنك الأسئلة بشكل يومي.",
        date: "2026-06-09",
      },
    ],
  },
];

function AdminSupport() {
  const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
  const [activeTicket, setActiveTicket] = useState<TicketItem | null>(null);
  const [replyTextInput, setReplyTextInput] = useState("");

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => filterCategory === "ALL" || t.category === filterCategory)
      .filter((t) => filterStatus === "ALL" || t.status === filterStatus)
      .filter(
        (t) =>
          t.studentName.toLowerCase().includes(search.toLowerCase()) ||
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.id.includes(search),
      );
  }, [tickets, filterCategory, filterStatus, search]);

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, page]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;

  // Open reply dialog
  const handleOpenReply = (t: TicketItem) => {
    setActiveTicket(t);
    setReplyTextInput("");
  };

  // Submit reply
  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyTextInput.trim()) return;

    const newReply = {
      sender: "مسؤول المنصة",
      text: replyTextInput.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === activeTicket.id) {
          return {
            ...t,
            status: "RESOLVED", // Auto resolve upon replying, or user can toggle
            replies: [...t.replies, newReply],
          };
        }
        return t;
      }),
    );

    toast.success("تم إرسال الرد وتغيير حالة التذكرة إلى مكتملة");
    setActiveTicket(null);
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "المعرف,الطالب,الموضوع,الفئة,الحالة,التاريخ\n";
    filteredTickets.forEach((t) => {
      csvContent += `"${t.id}","${t.studentName}","${t.subject}","${t.category}","${t.status}","${t.date}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "support_tickets.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجل تذاكر الدعم بنجاح");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          متابعة وحل المشاكل الفنية والمالية وشكاوى طلاب المنصة
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">مركز الدعم والشكاوى</h2>
      </div>

      {/* Filters bar */}
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
            <option value="OPEN">مفتوحة</option>
            <option value="IN_PROGRESS">قيد المعالجة</option>
            <option value="RESOLVED">محلولة (Resolved)</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">جميع الأقسام</option>
            <option value="BUG">عطل فني (Bug)</option>
            <option value="PAYMENT">مشكلة مالية (Payment)</option>
            <option value="COMPLAINT">شكوى (Complaint)</option>
            <option value="QUESTION">استفسار عام</option>
          </select>

          <input
            type="search"
            placeholder="البحث باسم الطالب أو برقم التذكرة..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
          />
        </div>
      </div>

      {/* Tickets table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">التاريخ</th>
              <th className="px-5 py-4">الحالة</th>
              <th className="px-5 py-4">القسم</th>
              <th className="px-5 py-4">الموضوع</th>
              <th className="px-5 py-4">اسم الطالب</th>
              <th className="px-5 py-4">رقم التذكرة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTickets.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-secondary/20">
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleOpenReply(t)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                  >
                    <MessageSquare className="size-3.5" /> عرض والرد
                  </button>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{t.date}</td>
                <td className="px-5 py-3">
                  {t.status === "OPEN" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                      <Clock className="size-3" /> مفتوحة
                    </span>
                  ) : t.status === "IN_PROGRESS" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                      <Clock className="size-3" /> قيد المراجعة
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                      <CheckCircle className="size-3" /> تم الحل
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 font-semibold text-primary">
                  {t.category === "BUG"
                    ? "عطل فني"
                    : t.category === "PAYMENT"
                      ? "دفع ورسوم"
                      : t.category === "COMPLAINT"
                        ? "شكوى"
                        : "استفسار"}
                </td>
                <td className="px-5 py-3 font-bold text-foreground truncate max-w-xs">
                  {t.subject}
                </td>
                <td className="px-5 py-3 font-medium text-foreground">{t.studentName}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{t.id}</td>
              </tr>
            ))}
            {paginatedTickets.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
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

      {/* Support Chat Reply Dialog */}
      <Dialog open={!!activeTicket} onOpenChange={() => setActiveTicket(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              الرد على تذكرة الدعم
            </DialogTitle>
          </DialogHeader>
          {activeTicket && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-2 bg-secondary/20">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>التاريخ: {activeTicket.date}</span>
                  <span className="font-bold text-foreground">{activeTicket.studentName}</span>
                </div>
                <h4 className="font-bold text-foreground text-sm">{activeTicket.subject}</h4>
                <p className="text-xs text-foreground leading-relaxed">{activeTicket.message}</p>
              </div>

              {/* Chat thread replies */}
              {activeTicket.replies.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-muted-foreground">
                    الردود السابقة:
                  </span>
                  {activeTicket.replies.map((rep, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed"
                    >
                      <div className="flex items-center justify-between mb-1 font-bold text-primary">
                        <span>{rep.date}</span>
                        <span>{rep.sender}</span>
                      </div>
                      <p>{rep.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              <form onSubmit={handleSubmitReply} className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    اكتب الرد الرسمي
                  </label>
                  <textarea
                    required
                    value={replyTextInput}
                    onChange={(e) => setReplyTextInput(e.target.value)}
                    rows={3}
                    placeholder="أدخل رسالة الرد والحل هنا..."
                    className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
                >
                  <Send className="size-4" /> إرسال الرد وحل التذكرة
                </button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
