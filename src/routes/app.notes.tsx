import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bookmark, Search, Trash2, Clock, BookOpen, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/notes")({
  head: () => ({
    meta: [{ title: "ملاحظاتي المسجلة | Altiora" }],
  }),
  component: SavedNotesPage,
});

interface NoteItem {
  id: string;
  lectureId: string;
  courseTitle: string;
  lectureTitle: string;
  second: number;
  content: string;
  createdAt: string;
}

const DEFAULT_NOTES: NoteItem[] = [
  {
    id: "n1",
    lectureId: "1-l1",
    courseTitle: "Epic Grammar 2026",
    lectureTitle: "Present Simple & Continuous",
    second: 95,
    content:
      "المضارع المستمر يصف حدثاً مؤقتاً يحدث الآن، بينما المضارع البسيط للحقائق والعادات المتكررة.",
    createdAt: "6/14/2026",
  },
  {
    id: "n2",
    lectureId: "demo-math-2026-l1",
    courseTitle: "أساسيات الرياضيات للثانوية العامة 2026",
    lectureTitle: "المحاضرة التعريفية",
    second: 420,
    content: "القانون العام لحساب جذور المعادلة التربيعية مهم جداً في الهندسة التحليلية.",
    createdAt: "6/13/2026",
  },
];

import { getVideoNotesFn, deleteVideoNoteFn } from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";

function SavedNotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotes = () => {
    const user = getCurrentUser();
    if (!user) return;

    setLoading(true);
    getVideoNotesFn({ data: { email: user.email } })
      .then((records) => {
        const mapped: NoteItem[] = records.map((r: any) => ({
          id: r.id,
          lectureId: r.lesson_id,
          courseTitle: r.lesson_id.includes("demo-math")
            ? "أساسيات الرياضيات للثانوية العامة 2026"
            : "Epic Grammar 2026",
          lectureTitle: r.lesson_id.includes("demo-math")
            ? "المحاضرة التعريفية"
            : "Present Simple & Continuous",
          second: r.second,
          content: r.content,
          createdAt: new Date(r.created_at).toLocaleDateString("ar-EG"),
        }));
        setNotes(mapped);
        setLoading(false);
      })
      .catch(() => {
        setNotes(DEFAULT_NOTES);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;

    try {
      await deleteVideoNoteFn({ data: { noteId: id } });
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("تم حذف الملاحظة بنجاح من قاعدة البيانات");
    } catch {
      toast.error("فشل في حذف الملاحظة");
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
      n.lectureTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 text-end" dir="rtl">
      {/* Title Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-card sm:flex-row">
        <div className="relative w-full sm:w-72">
          <input
            type="search"
            placeholder="البحث في ملاحظاتي..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card px-4 pl-10 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 text-end"
          />
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <span>ملاحظاتي المسجلة أثناء المشاهدة</span>
          <Bookmark className="size-6 text-primary" />
        </h2>
      </div>

      {/* Notes List */}
      {filteredNotes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                    <Clock className="size-3 text-primary" /> {formatTime(note.second)}
                  </span>
                  <div className="text-right">
                    <h4 className="text-xs font-bold text-primary flex items-center justify-end gap-1.5">
                      <span>{note.lectureTitle}</span>
                      <BookOpen className="size-3.5" />
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{note.courseTitle}</p>
                  </div>
                </div>

                <p className="text-xs leading-relaxed text-foreground font-semibold text-right pt-2 border-t border-border/40">
                  {note.content}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                <button
                  onClick={() => handleDelete(note.id)}
                  className="inline-flex items-center gap-1 text-destructive hover:underline font-bold"
                >
                  <Trash2 className="size-3.5" /> حذف الملاحظة
                </button>
                <span>تاريخ التدوين: {note.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
          لا توجد أي ملاحظات مطابقة لبحثك حالياً.
        </div>
      )}
    </div>
  );
}
