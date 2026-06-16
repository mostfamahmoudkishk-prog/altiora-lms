import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Eye,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  Activity,
  Loader2,
  Bell,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherStudentsFn, sendTeacherNotificationFn, getCoursesFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/teacher/students")({
  component: TeacherStudents,
});

interface StudentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  courseTitle: string;
  completionRate: number;
  examScore: string;
  joinDate: string;
}

function TeacherStudents() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Send Notification States
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [notifTargetType, setNotifTargetType] = useState<"STUDENTS" | "COURSE">("STUDENTS");
  const [notifSelectedStudentIds, setNotifSelectedStudentIds] = useState<string[]>([]);
  const [notifSelectedCourseId, setNotifSelectedCourseId] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifLink, setNotifLink] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);

  useEffect(() => {
    getCoursesFn()
      .then((res: any) => {
        setTeacherCourses(res || []);
      })
      .catch((err) => console.error("Error loading courses:", err));
  }, []);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = () => {
    const user = getCurrentUser();
    if (user) {
      setLoading(true);
      getTeacherStudentsFn({ data: { teacherEmail: user.email } })
        .then((res: any) => {
          setStudents(res || []);
        })
        .catch((err) => {
          toast.error("فشل تحميل قائمة الطلاب: " + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim()) {
      toast.error("يرجى إدخال عنوان التنبيه");
      return;
    }
    if (!notifMessage.trim()) {
      toast.error("يرجى إدخال محتوى التنبيه");
      return;
    }
    if (notifTargetType === "STUDENTS" && notifSelectedStudentIds.length === 0) {
      toast.error("يرجى اختيار طالب واحد على الأقل");
      return;
    }
    if (notifTargetType === "COURSE" && !notifSelectedCourseId) {
      toast.error("يرجى اختيار الدورة المستهدفة");
      return;
    }

    setSendingNotif(true);
    try {
      const res = await sendTeacherNotificationFn({
        data: {
          targetType: notifTargetType,
          studentIds: notifTargetType === "STUDENTS" ? notifSelectedStudentIds : undefined,
          courseId: notifTargetType === "COURSE" ? notifSelectedCourseId : undefined,
          title: notifTitle,
          message: notifMessage,
          actionUrl: notifLink || undefined,
        },
      });

      if (res.success) {
        toast.success(`تم إرسال التنبيه بنجاح إلى ${res.count} طالب.`);
        setNotifDialogOpen(false);
        // Reset inputs
        setNotifTitle("");
        setNotifMessage("");
        setNotifLink("");
        setNotifSelectedStudentIds([]);
      } else {
        toast.error("فشل إرسال التنبيه");
      }
    } catch (err: any) {
      toast.error("حدث خطأ أثناء إرسال التنبيه: " + err.message);
    } finally {
      setSendingNotif(false);
    }
  };

  // Get unique courses for filter
  const uniqueCourses = useMemo(() => {
    const courses = new Set<string>();
    students.forEach((s) => {
      if (s.courseTitle) courses.add(s.courseTitle);
    });
    return Array.from(courses);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => filterCourse === "ALL" || s.courseTitle === filterCourse)
      .filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase()) ||
          s.phone.includes(search),
      );
  }, [students, filterCourse, search]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, page]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;

  // Export Excel (CSV format)
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent +=
      "الاسم,البريد الإلكتروني,الهاتف,الصف الدراسي,الدورة,نسبة الإنجاز,درجات الاختبارات,تاريخ الانضمام\n";
    filteredStudents.forEach((s) => {
      csvContent += `"${s.name}","${s.email}","${s.phone}","${s.grade}","${s.courseTitle}","${s.completionRate}%","${s.examScore}","${s.joinDate}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `طلاب_المعلم_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير قائمة الطلاب بنجاح");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary me-2" />
        جارٍ تحميل قائمة الطلاب المشتركين بدوراتك…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-end animate-fade-in" dir="rtl">
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
            <FileText className="size-4 text-blue-500" /> طباعة
          </button>
          <button
            onClick={() => {
              setNotifTargetType("STUDENTS");
              setNotifSelectedStudentIds([]);
              setNotifDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
          >
            <Bell className="size-4 text-primary" /> إرسال تنبيه للطلاب
          </button>
        </div>

        {/* Filters right (RTL) */}
        <div className="flex w-full flex-1 items-center justify-end gap-3 lg:w-auto">
          <select
            value={filterCourse}
            onChange={(e) => {
              setFilterCourse(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary font-bold text-foreground"
          >
            <option value="ALL">جميع الدورات</option>
            {uniqueCourses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="البحث باسم الطالب، البريد، أو الهاتف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-80 text-end"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">درجات الاختبارات</th>
              <th className="px-5 py-4">تاريخ الانضمام</th>
              <th className="px-5 py-4">نسبة الإنجاز</th>
              <th className="px-5 py-4">الدورة الدراسية</th>
              <th className="px-5 py-4">رقم الهاتف</th>
              <th className="px-5 py-4">الصف الدراسي</th>
              <th className="px-5 py-4">الطالب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-semibold">
            {paginatedStudents.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-secondary/20">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      onClick={() => {
                        setNotifTargetType("STUDENTS");
                        setNotifSelectedStudentIds([s.id]);
                        setNotifDialogOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      <Bell className="size-3.5" /> إرسال تنبيه
                    </button>
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
                    >
                      <Eye className="size-3.5" /> تفاصيل الطالب
                    </button>
                  </div>
                </td>
                <td className="px-5 py-3 text-foreground font-bold">{s.examScore}</td>
                <td className="px-5 py-3 text-muted-foreground">{s.joinDate}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-xs font-bold text-foreground">{s.completionRate}%</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${s.completionRate}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-semibold text-primary">{s.courseTitle}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">
                  {s.phone || "-"}
                </td>
                <td className="px-5 py-3 text-foreground">{s.grade}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-col items-end">
                    <span className="text-foreground text-sm font-bold">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{s.email}</span>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedStudents.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground">
                  لا يوجد طلاب مسجلين بالدورة حالياً.
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

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              تفاصيل ملف الطالب التعليمي
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="mt-4 space-y-5">
              <div className="rounded-xl border border-border p-4 bg-secondary/10">
                <h3 className="font-display text-base font-bold text-primary">
                  {selectedStudent.name}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedStudent.email}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
                  <span className="font-semibold text-foreground">
                    {selectedStudent.courseTitle}
                  </span>
                  <span className="text-muted-foreground">الدورة المسجل بها</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
                  <span className="font-semibold text-foreground">{selectedStudent.grade}</span>
                  <span className="text-muted-foreground">الصف الدراسي</span>
                </div>
                {selectedStudent.phone && (
                  <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
                    <span className="font-semibold text-foreground font-mono">
                      {selectedStudent.phone}
                    </span>
                    <span className="text-muted-foreground">رقم الهاتف</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
                  <span className="font-semibold text-foreground">{selectedStudent.joinDate}</span>
                  <span className="text-muted-foreground">تاريخ الانضمام</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <BookOpen className="size-4 text-primary" /> {selectedStudent.completionRate}%
                  </span>
                  <span className="text-muted-foreground">نسبة إنجاز الدورة</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
                  <span className="font-semibold text-success font-bold">
                    {selectedStudent.examScore}
                  </span>
                  <span className="text-muted-foreground">متوسط درجات الاختبارات</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              إرسال تنبيه مخصص للطلاب
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendNotification} className="mt-4 space-y-4">
            {/* Target Type Selector */}
            <div className="flex gap-4 justify-end border-b border-border/60 pb-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                <input
                  type="radio"
                  name="notifTarget"
                  checked={notifTargetType === "COURSE"}
                  onChange={() => setNotifTargetType("COURSE")}
                  className="accent-primary"
                />
                <span>طلاب دورة معينة</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                <input
                  type="radio"
                  name="notifTarget"
                  checked={notifTargetType === "STUDENTS"}
                  onChange={() => setNotifTargetType("STUDENTS")}
                  className="accent-primary"
                />
                <span>طلاب محددين</span>
              </label>
            </div>

            {/* Target Conditionals */}
            {notifTargetType === "COURSE" ? (
              <div className="space-y-1 text-right">
                <label className="text-xs font-bold text-muted-foreground block">اختر الدورة التدريبية</label>
                <select
                  value={notifSelectedCourseId}
                  onChange={(e) => setNotifSelectedCourseId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary font-bold text-foreground text-end"
                >
                  <option value="">-- اختر الدورة --</option>
                  {teacherCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1 text-right">
                <div className="flex justify-between items-center mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (notifSelectedStudentIds.length === students.length) {
                        setNotifSelectedStudentIds([]);
                      } else {
                        setNotifSelectedStudentIds(students.map(s => s.id));
                      }
                    }}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    {notifSelectedStudentIds.length === students.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                  </button>
                  <label className="text-xs font-bold text-muted-foreground block">اختر الطلاب المستهدفين ({notifSelectedStudentIds.length})</label>
                </div>
                <div className="max-h-36 overflow-y-auto border border-border rounded-xl p-2 bg-secondary/15 space-y-1">
                  {students.map((s) => {
                    const isChecked = notifSelectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center justify-between p-1.5 hover:bg-secondary/40 rounded cursor-pointer text-xs font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNotifSelectedStudentIds((prev) => [...prev, s.id]);
                            } else {
                              setNotifSelectedStudentIds((prev) => prev.filter((id) => id !== s.id));
                            }
                          }}
                          className="ml-2 accent-primary"
                        />
                        <span>
                          {s.name} • <span className="text-primary">{s.courseTitle}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-muted-foreground block">عنوان التنبيه</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="مثال: تم إضافة مراجعة جديدة"
                className="w-full h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary text-end"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-muted-foreground block">محتوى رسالة التنبيه</label>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="ادخل نص التنبيه بالتفصيل هنا..."
                rows={3}
                className="w-full rounded-xl border border-border bg-card p-3 text-xs outline-none focus:border-primary text-end resize-none"
              />
            </div>

            {/* Optional Link */}
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-muted-foreground block">رابط التوجيه (اختياري)</label>
              <input
                type="text"
                value={notifLink}
                onChange={(e) => setNotifLink(e.target.value)}
                placeholder="مثال: /app/courses/demo-math"
                className="w-full h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary text-end font-mono"
              />
            </div>

            {/* Dialog Footer Actions */}
            <DialogFooter className="flex-row-reverse justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={sendingNotif}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-95 disabled:opacity-40 transition-all cursor-pointer"
              >
                {sendingNotif ? (
                  <>جاري الإرسال...</>
                ) : (
                  <>
                    <Send className="size-3.5" /> إرسال التنبيه الآن
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setNotifDialogOpen(false)}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all"
              >
                إلغاء
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
