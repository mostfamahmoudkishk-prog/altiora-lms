import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit,
  Shield,
  Key,
  Check,
  X,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUsersFn, createAdminFn, softDeleteUserFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/admins")({
  component: SuperAdminAdmins,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

interface AdminItem {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  status: "ACTIVE" | "BLOCKED";
  isDeleted?: boolean;
}

const availablePermissions = [
  { key: "users_read", label: "قراءة المستخدمين" },
  { key: "users_write", label: "تعديل وحظر المستخدمين" },
  { key: "courses_read", label: "عرض الدورات" },
  { key: "courses_write", label: "إنشاء وتعديل الدورات" },
  { key: "payments_view", label: "عرض السجلات المالية" },
  { key: "payments_refund", label: "إجراء عمليات الاسترداد" },
  { key: "settings_write", label: "تعديل إعدادات الموقع" },
];

const initialMatrix: Record<string, string[]> = {
  SUPER_ADMIN: [
    "users_read",
    "users_write",
    "courses_read",
    "courses_write",
    "payments_view",
    "payments_refund",
    "settings_write",
  ],
  ADMIN: ["users_read", "courses_read", "courses_write", "payments_view"],
};

function SuperAdminAdmins() {
  const navigate = useNavigate() as any;
  const searchParams = Route.useSearch() as any;
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState<Record<string, string[]>>(initialMatrix);
  const [activeTab, setActiveTab] = useState<"admins" | "rbac">(
    searchParams.tab === "rbac" ? "rbac" : "admins"
  );

  useEffect(() => {
    if (searchParams.tab === "rbac" || searchParams.tab === "admins") {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams.tab]);

  // Form states
  const [activeAdmin, setActiveAdmin] = useState<AdminItem | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<"SUPER_ADMIN" | "ADMIN">("ADMIN");

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await getUsersFn();
      const adminUsers = (res || [])
        .filter((u: any) => u.role === "ADMIN" || u.role === "SUPER_ADMIN")
        .map((u: any) => {
          let status = "ACTIVE";
          if (u.profile?.biography) {
            try {
              const bio = JSON.parse(u.profile.biography);
              if (bio.status === "BLOCKED" || bio.status === "SUSPENDED") {
                status = "BLOCKED";
              }
            } catch {}
          }
          return {
            id: u.id,
            name: u.profile?.name || u.email.split("@")[0],
            email: u.email,
            role: u.role,
            status: status as "ACTIVE" | "BLOCKED",
          };
        });
      setAdmins(adminUsers);
    } catch (err) {
      console.error("Failed to load admins:", err);
      toast.error("فشل تحميل قائمة المسؤولين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    return admins
      .filter((a) => !a.isDeleted)
      .filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase()),
      );
  }, [admins, search]);

  const paginatedAdmins = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredAdmins.slice(start, start + itemsPerPage);
  }, [filteredAdmins, page]);

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage) || 1;

  // Open Create
  const handleOpenCreate = () => {
    setFormName("");
    setFormEmail("");
    setFormRole("ADMIN");
    setIsAddMode(true);
    setActiveAdmin({ id: "", name: "", email: "", role: "ADMIN", status: "ACTIVE" });
  };

  // Open Edit
  const handleOpenEdit = (a: AdminItem) => {
    setFormName(a.name);
    setFormEmail(a.email);
    setFormRole(a.role);
    setIsAddMode(false);
    setActiveAdmin(a);
  };

  // Save Admin
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAdmin) return;

    try {
      if (isAddMode) {
        const res = await createAdminFn({
          data: {
            name: formName,
            email: formEmail,
          },
        });
        toast.success(
          `تم إنشاء حساب المسؤول بنجاح. كلمة المرور العشوائية هي: ${res.randomPassword}`,
          {
            duration: 15000,
          },
        );
      } else {
        toast.info("تعديل المسؤولين غير مدعوم حالياً بشكل مباشر");
      }
      loadAdmins();
      setActiveAdmin(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "حدث خطأ أثناء حفظ المسؤول");
    }
  };

  // Soft Delete Admin
  const handleSoftDelete = async (id: string) => {
    const item = admins.find((a) => a.id === id);
    if (item?.email === "superadmin@altiora.com") {
      toast.error("لا يمكن حذف حساب المدير العام الأساسي");
      return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا المسؤول من النظام؟")) return;
    try {
      await softDeleteUserFn({ data: { id } });
      toast.success("تم حذف المسؤول بنجاح");
      loadAdmins();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "فشل حذف المسؤول");
    }
  };

  // Matrix cell toggle
  const handleToggleCell = (role: string, permKey: string) => {
    setMatrix((prev) => {
      const currentPerms = prev[role] || [];
      const nextPerms = currentPerms.includes(permKey)
        ? currentPerms.filter((k) => k !== permKey)
        : [...currentPerms, permKey];

      return {
        ...prev,
        [role]: nextPerms,
      };
    });
    toast.success("تم تحديث مصفوفة الصلاحيات للدور: " + role);
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "الكود,الاسم,البريد الإلكتروني,الدور الأساسي,الحالة\n";
    filteredAdmins.forEach((a) => {
      csvContent += `"${a.id}","${a.name}","${a.email}","${a.role}","${a.status}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "admins_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجل المسؤولين بنجاح");
  };

  return (
    <div className="space-y-6 text-end bg-transparent font-display text-white" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] flex flex-col justify-between gap-4 sm:flex-row items-center">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 size-36 rounded-full bg-amber-500/10 blur-3xl"></div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            إدارة المسؤولين و RBAC
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            التحكم في حسابات مسؤولي النظام وأدوار الصلاحيات المشتركة بالمنصة لضمان أمان العمليات اليومية.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-end gap-2 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-1.5 max-w-md mr-auto">
        <button
          onClick={() => {
            setActiveTab("rbac");
            navigate({ search: { tab: "rbac" } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "rbac"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          <span className="flex items-center gap-1.5 justify-center">
            <Key className="size-3.5" /> مصفوفة الصلاحيات (RBAC)
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab("admins");
            navigate({ search: { tab: undefined } });
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "admins"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-900/60"
          }`}
        >
          <span className="flex items-center gap-1.5 justify-center">
            <Shield className="size-3.5" /> قائمة المسؤولين (Admins)
          </span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "admins" ? (
          <motion.div
            key="admins-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Tools bar */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/10 bg-neutral-900/30 p-4 lg:flex-row backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="size-4 text-emerald-500" /> تصدير Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:border-amber-500/30 hover:text-amber-400 transition-all cursor-pointer"
                >
                  <FileText className="size-4 text-blue-500" /> تصدير PDF
                </button>
                <button
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-black shadow-card hover:bg-amber-400 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Plus className="size-4" /> إضافة مسؤول جديد
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="search"
                  placeholder="البحث باسم المسؤول أو البريد..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 pl-10 text-xs text-white outline-none focus:border-amber-500/50 text-end font-bold"
                />
                <Search className="absolute left-3 top-3 size-4 text-zinc-500" />
              </div>
            </div>

            {/* Table */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.04)]">
              {loading ? (
                <div className="p-10 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
                  ))}
                </div>
              ) : paginatedAdmins.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-bold">
                  لا يوجد مسؤولين مطابقين لمعايير البحث
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-end text-sm text-zinc-300">
                    <thead>
                      <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                        <th className="px-6 py-4">الخيارات</th>
                        <th className="px-6 py-4">الحالة</th>
                        <th className="px-6 py-4">الدور الوظيفي</th>
                        <th className="px-6 py-4">البريد الإلكتروني</th>
                        <th className="px-6 py-4">الاسم</th>
                        <th className="px-6 py-4">الكود</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/80">
                      {paginatedAdmins.map((a) => (
                        <tr
                          key={a.id}
                          className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSoftDelete(a.id)}
                                disabled={a.email === "superadmin@altiora.com"}
                                className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                                title="حذف المسؤول"
                              >
                                <Trash2 className="size-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(a)}
                                disabled={a.email === "superadmin@altiora.com"}
                                className="rounded-lg p-2 text-amber-400 hover:bg-amber-500/10 disabled:opacity-30 transition-all"
                                title="تعديل"
                              >
                                <Edit className="size-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {a.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                                نشط
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                                محظور
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-amber-400/90">
                            {a.role === "SUPER_ADMIN" ? "المدير العام للنظام" : "مسؤول النظام"}
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-mono">{a.email}</td>
                          <td className="px-6 py-4 font-bold text-white">{a.name}</td>
                          <td className="px-6 py-4 text-xs text-zinc-500 font-mono">{a.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((v) => Math.min(v + 1, totalPages))}
                  className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="size-4" />
                </button>
                <span className="text-xs text-zinc-400 font-bold">
                  صفحة {page} من {totalPages}
                </span>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((v) => Math.max(v - 1, 1))}
                  className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          // RBAC MATRIX VIEW
          <motion.div
            key="rbac-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(251,191,36,.08)] space-y-6"
          >
            <div className="text-end border-b border-zinc-900 pb-4">
              <h3 className="font-display text-lg font-bold text-amber-400">
                مصفوفة التحكم في صلاحيات الأدوار
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                اضغط على الخلية لتفعيل أو إلغاء صلاحية محددة للدور الوظيفي بالمنصة.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-end text-sm text-zinc-300">
                <thead>
                  <tr className="border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                    <th className="px-6 py-3 text-center">مسؤول (ADMIN)</th>
                    <th className="px-6 py-3 text-center">المدير العام (SUPER_ADMIN)</th>
                    <th className="px-6 py-3 text-right">الصلاحية للنظام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/80">
                  {availablePermissions.map((perm) => (
                    <tr key={perm.key} className="hover:bg-amber-500/[0.02] transition-colors">
                      {/* ADMIN check */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleCell("ADMIN", perm.key)}
                          className={`mx-auto flex size-6 items-center justify-center rounded-lg border transition-colors ${
                            matrix.ADMIN?.includes(perm.key)
                              ? "bg-amber-500 border-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                              : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-amber-500/40"
                          }`}
                        >
                          {matrix.ADMIN?.includes(perm.key) && (
                            <Check className="size-4" strokeWidth={3} />
                          )}
                        </button>
                      </td>

                      {/* SUPER_ADMIN check (Always enabled/checked for Safety) */}
                      <td className="px-6 py-4">
                        <div className="mx-auto flex size-6 items-center justify-center rounded-lg border bg-amber-500/20 border-amber-500/30 text-amber-400 opacity-60">
                          <Check className="size-4" strokeWidth={3} />
                        </div>
                      </td>

                      {/* Permission Label */}
                      <td className="px-6 py-4 font-bold text-white text-right">
                        {perm.label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Dialog */}
      <Dialog open={!!activeAdmin} onOpenChange={() => setActiveAdmin(null)}>
        <DialogContent
          className="max-w-md rounded-3xl border border-amber-500/20 bg-neutral-950 p-6 text-white text-end shadow-[0_0_50px_rgba(251,191,36,.15)] backdrop-blur-xl"
          dir="rtl"
        >
          <DialogHeader className="border-b border-zinc-900 pb-3">
            <DialogTitle className="font-display text-lg font-black text-amber-400 flex items-center justify-end gap-2">
              <ShieldAlert className="size-5 text-amber-400" />
              {isAddMode ? "إضافة مسؤول جديد" : "تعديل بيانات المسؤول"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveAdmin} className="mt-4 space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                الاسم الكامل
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50 font-bold text-end"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50 font-bold text-end"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                الدور الوظيفي
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as any)}
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50 font-bold text-end"
              >
                <option value="ADMIN" className="bg-neutral-950 text-white font-bold">
                  مسؤول عادي (ADMIN)
                </option>
                <option value="SUPER_ADMIN" className="bg-neutral-950 text-white font-bold">
                  مدير عام للنظام (SUPER_ADMIN)
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-black text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-all mt-6 cursor-pointer"
            >
              حفظ المسؤول
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
