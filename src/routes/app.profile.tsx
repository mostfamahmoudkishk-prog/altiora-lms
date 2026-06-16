import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Hash,
  User,
  Mail,
  Phone,
  GraduationCap,
  KeyRound,
  Pencil,
  ImagePlus,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { getSessionsFn, revokeSessionFn, revokeAllOtherSessionsFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

type ProfileState = {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  password: string;
  avatar: string | null;
};

const STORAGE_KEY = "altiora_profile";
const LOCK_KEY = "altiora_profile_last_update";
const LOCK_DAYS = 14;
const LOCK_MS = LOCK_DAYS * 24 * 60 * 60 * 1000;

const DEFAULTS: ProfileState = {
  id: "107539",
  name: "Mostafa Mahmoud Gabr Ahmed Keshk",
  email: "mostafa.1925044@stemgharbiya.moe.edu.eg",
  phone: "01097987504",
  grade: "الثاني الثانوي",
  password: "Password123",
  avatar: null,
};

const GRADES = [
  "KG",
  "الأول الابتدائي",
  "الثاني الابتدائي",
  "الثالث الابتدائي",
  "الرابع الابتدائي",
  "الخامس الابتدائي",
  "السادس الابتدائي",
  "الأول الإعدادي",
  "الثاني الإعدادي",
  "الثالث الإعدادي",
  "الأول الثانوي",
  "الثاني الثانوي",
  "الثالث الثانوي",
  "طالب جامعي",
  "خريج",
];

function loadProfile(): ProfileState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* no-op */
  }
  return DEFAULTS;
}

function getLastUpdate(): number | null {
  try {
    const v = localStorage.getItem(LOCK_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function fmtDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 10);
  }
}

function checkEditAllowed(): { allowed: boolean; last?: number; next?: number } {
  const last = getLastUpdate();
  if (!last) return { allowed: true };
  const next = last + LOCK_MS;
  if (Date.now() >= next) return { allowed: true, last, next };
  return { allowed: false, last, next };
}

function notifyLocked(last: number, next: number) {
  toast.error("يجب الانتظار لمدة أسبوعين قبل تعديل البيانات مرة أخرى.", {
    description: `آخر تعديل تم بتاريخ: ${fmtDate(last)} — يمكنك التعديل مرة أخرى بتاريخ: ${fmtDate(next)}`,
    duration: 6000,
  });
}

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(DEFAULTS);
  const [editing, setEditing] = useState<null | "name" | "grade" | "password">(null);
  const [uploading, setUploading] = useState(false);
  const [lock, setLock] = useState<{ last?: number; next?: number; locked: boolean }>({
    locked: false,
  });
  const [otherDevices, setOtherDevices] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSessions = () => {
    const user = getCurrentUser();
    if (user) {
      getSessionsFn({ data: { email: user.email } })
        .then((devices) => {
          const fingerprint = localStorage.getItem("device_fingerprint_id");
          const others = devices
            .filter((d: any) => d.fingerprint !== fingerprint)
            .map((d: any) => ({
              id: d.id,
              name: d.userAgent || "جهاز غير معروف",
              lastActive: new Date(d.lastActive).toLocaleString("ar-EG"),
              ip: d.ipAddress || "0.0.0.0",
            }));
          setOtherDevices(others);
        })
        .catch(() => {});
    }
  };

  const handleLogoutDevice = async (id: string) => {
    try {
      await revokeSessionFn({ data: { deviceId: id } });
      setOtherDevices((prev) => prev.filter((d) => d.id !== id));
      toast.success("تم إنهاء الجلسة في الجهاز بنجاح");
    } catch {
      toast.error("تعذر إنهاء الجلسة");
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    const user = getCurrentUser();
    const fingerprint = localStorage.getItem("device_fingerprint_id") || "default";
    if (!user) return;
    try {
      await revokeAllOtherSessionsFn({
        data: { email: user.email, currentFingerprint: fingerprint },
      });
      setOtherDevices([]);
      toast.success("تم تسجيل الخروج من جميع الأجهزة الأخرى");
    } catch {
      toast.error("تعذر إنهاء الجلسات");
    }
  };

  useEffect(() => {
    setProfile(loadProfile());
    const c = checkEditAllowed();
    setLock({ locked: !c.allowed, last: c.last, next: c.next });
    fetchSessions();
  }, []);

  const guard = (): boolean => {
    const c = checkEditAllowed();
    if (!c.allowed && c.last && c.next) {
      notifyLocked(c.last, c.next);
      setLock({ locked: true, last: c.last, next: c.next });
      return false;
    }
    return true;
  };

  const save = (next: ProfileState) => {
    setProfile(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      const now = Date.now();
      localStorage.setItem(LOCK_KEY, String(now));
      setLock({ locked: true, last: now, next: now + LOCK_MS });
    } catch {
      /* no-op */
    }
  };

  const onAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!guard()) {
      e.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      toast.error("الصيغة غير مدعومة. استخدم JPG أو PNG أو WEBP");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("الحد الأقصى لحجم الصورة 5MB");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      save({ ...profile, avatar: String(reader.result) });
      setUploading(false);
      toast.success("تم تحديث الصورة الشخصية");
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error("تعذّر رفع الصورة");
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const openEditor = (which: "name" | "grade" | "password") => {
    if (!guard()) return;
    setEditing(which);
  };

  const fields = [
    { key: "id", icon: Hash, label: "معرف الطالب", value: profile.id, readOnly: true },
    { key: "name", icon: User, label: "اسم الطالب", value: profile.name, edit: "name" as const },
    { key: "email", icon: Mail, label: "البريد الإلكتروني", value: profile.email, readOnly: true },
    { key: "phone", icon: Phone, label: "رقم الهاتف", value: profile.phone, readOnly: true },
    {
      key: "grade",
      icon: GraduationCap,
      label: "الصف الدراسي",
      value: profile.grade,
      edit: "grade" as const,
    },
    {
      key: "password",
      icon: KeyRound,
      label: "كلمة المرور",
      value: "***********",
      edit: "password" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {lock.locked && lock.last && lock.next && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-5 py-3 text-end text-sm text-foreground">
          <div className="font-bold text-accent">
            يجب الانتظار لمدة أسبوعين قبل تعديل البيانات مرة أخرى.
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            آخر تعديل تم بتاريخ:{" "}
            <span className="font-semibold text-foreground">{fmtDate(lock.last)}</span>
            {" — "}
            يمكنك التعديل مرة أخرى بتاريخ:{" "}
            <span className="font-semibold text-foreground">{fmtDate(lock.next)}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          {uploading ? "جارٍ الرفع…" : "تعديل الصورة الشخصية"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onAvatar}
        />
        <div className="flex items-center gap-3 text-end">
          <div>
            <div className="font-bold text-foreground">{profile.name}</div>
            <div className="text-xs text-muted-foreground">{profile.grade}</div>
          </div>
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" className="size-full object-cover" />
            ) : (
              <User className="size-7 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {fields.map((f) => (
          <div
            key={f.key}
            className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0 transition-colors hover:bg-secondary/30"
          >
            {!f.readOnly ? (
              <button
                onClick={() => openEditor(f.edit!)}
                aria-label={`تعديل ${f.label}`}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
              >
                <Pencil className="size-4" />
              </button>
            ) : (
              <span />
            )}
            <div className="flex flex-1 items-center justify-end gap-3 text-end">
              <div>
                <div className="text-xs text-muted-foreground">{f.label}</div>
                <div className="text-sm font-semibold text-foreground">{f.value}</div>
              </div>
              <f.icon className="size-5 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {/* Account Security & Active Devices */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4 text-end">
        <h3 className="font-display text-base font-bold text-foreground flex items-center justify-end gap-2">
          <span>أمن الحساب والأجهزة النشطة</span>
          <Monitor className="size-5 text-primary" />
        </h3>

        <p className="text-xs text-muted-foreground">
          يُسمح بربط حسابك بجهاز واحد فقط نشط للمشاهدة. يمكنك إلغاء الأجهزة الأخرى أدناه لمنع مشاركة
          الحساب.
        </p>

        <div className="space-y-3">
          {/* Current Device */}
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              الجهاز الحالي (نشط)
            </span>
            <div className="text-end">
              <div className="font-bold text-foreground">متصفح ويب (Windows PC)</div>
              <div className="text-[10px] text-muted-foreground">
                آخر نشاط: الآن • IP: 192.168.1.45
              </div>
            </div>
          </div>

          {/* Other Devices */}
          {otherDevices.map((dev) => (
            <div
              key={dev.id}
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 p-4 text-sm"
            >
              <button
                onClick={() => handleLogoutDevice(dev.id)}
                className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all animate-fade-in"
              >
                إنهاء الجلسة
              </button>
              <div className="text-end">
                <div className="font-bold text-foreground">{dev.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  آخر نشاط: {dev.lastActive} • IP: {dev.ip}
                </div>
              </div>
            </div>
          ))}
        </div>

        {otherDevices.length > 0 && (
          <button
            onClick={handleLogoutAllOtherDevices}
            className="w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-xs font-bold text-destructive hover:bg-destructive/10 transition-all"
          >
            إنهاء الجلسات في جميع الأجهزة الأخرى
          </button>
        )}
      </div>

      <NameDialog
        open={editing === "name"}
        initial={profile.name}
        onClose={() => setEditing(null)}
        onSave={(name) => {
          save({ ...profile, name });
          toast.success("تم تحديث الاسم");
          setEditing(null);
        }}
      />
      <GradeDialog
        open={editing === "grade"}
        initial={profile.grade}
        onClose={() => setEditing(null)}
        onSave={(grade) => {
          save({ ...profile, grade });
          toast.success("تم تحديث الصف الدراسي");
          setEditing(null);
        }}
      />
      <PasswordDialog
        open={editing === "password"}
        current={profile.password}
        onClose={() => setEditing(null)}
        onSave={(password) => {
          save({ ...profile, password });
          toast.success("تم تغيير كلمة المرور");
          setEditing(null);
        }}
      />
    </div>
  );
}

function NameDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(initial);
  useEffect(() => {
    if (open) setVal(initial);
  }, [open, initial]);
  const submit = () => {
    const t = val.trim();
    if (!t) return toast.error("الاسم لا يمكن أن يكون فارغاً");
    if (t.length < 3) return toast.error("الاسم قصير جداً");
    onSave(t);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-end">تعديل الاسم</DialogTitle>
          <DialogDescription className="text-end">
            اكتب الاسم الكامل كما تريد ظهوره.
          </DialogDescription>
        </DialogHeader>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-end text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-95"
          >
            حفظ
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GradeDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(initial);
  useEffect(() => {
    if (open) setVal(initial);
  }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-end">تعديل الصف الدراسي</DialogTitle>
        </DialogHeader>
        <select
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-end text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
          >
            إلغاء
          </button>
          <button
            onClick={() => onSave(val)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-95"
          >
            حفظ
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onSave: (v: string) => void;
}) {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (open) {
      setCur("");
      setNw("");
      setCf("");
      setShow(false);
    }
  }, [open]);
  const submit = () => {
    if (cur !== current) return toast.error("كلمة المرور الحالية غير صحيحة");
    if (nw.length < 8) return toast.error("الحد الأدنى 8 أحرف");
    if (!/[A-Za-z]/.test(nw) || !/[0-9]/.test(nw))
      return toast.error("يجب أن تحتوي على أحرف وأرقام");
    if (nw !== cf) return toast.error("كلمتا المرور غير متطابقتين");
    onSave(nw);
  };
  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-background px-4 text-end text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10";
  const type = show ? "text" : "password";
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent dir="rtl" className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-end">تغيير كلمة المرور</DialogTitle>
          <DialogDescription className="text-end">
            8 أحرف على الأقل، تحتوي على أحرف وأرقام.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <input
            type={type}
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            placeholder="كلمة المرور الحالية"
            className={inputCls}
          />
          <input
            type={type}
            value={nw}
            onChange={(e) => setNw(e.target.value)}
            placeholder="كلمة المرور الجديدة"
            className={inputCls}
          />
          <input
            type={type}
            value={cf}
            onChange={(e) => setCf(e.target.value)}
            placeholder="تأكيد كلمة المرور الجديدة"
            className={inputCls}
          />
          <button
            onClick={() => setShow((s) => !s)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {show ? "إخفاء" : "إظهار"} كلمات المرور
          </button>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-95"
          >
            حفظ
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
