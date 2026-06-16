import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users as UsersIcon,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { getUsersFn, softDeleteUserFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/super-admin/users")({
  component: SuperAdminUsers,
});

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "BLOCKED";
  joinDate: string;
  isDeleted?: boolean;
}

function SuperAdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const loadUsers = async () => {
    try {
      const res = await getUsersFn();
      const mapped: UserItem[] = res.map((u: any) => ({
        id: u.id,
        name: u.profile?.name || u.email.split("@")[0],
        email: u.email,
        role: u.role,
        status: "ACTIVE",
        joinDate: new Date(u.created_at).toISOString().split("T")[0],
      }));
      setUsers(mapped);
    } catch (err: any) {
      toast.error("فشل تحميل المستخدمين: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => !u.isDeleted)
      .filter((u) => filterRole === "ALL" || u.role === filterRole)
      .filter((u) => filterStatus === "ALL" || u.status === filterStatus)
      .filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      );
  }, [users, filterRole, filterStatus, search]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, page]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

  // Toggle Ban / Unban
  const handleToggleBlock = (id: string, currentStatus: "ACTIVE" | "BLOCKED") => {
    const user = users.find((u) => u.id === id);
    if (user?.role === "SUPER_ADMIN") {
      toast.error("لا يمكن حظر حساب المدير العام");
      return;
    }
    const nextStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)));
    toast.success(
      nextStatus === "BLOCKED"
        ? "تم حظر وإيقاف حساب المستخدم بنجاح"
        : "تم إلغاء حظر المستخدم وتفعيل حسابه",
    );
  };

  // Soft Delete User
  const handleSoftDelete = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user?.role === "SUPER_ADMIN") {
      toast.error("لا يمكن حذف حساب المدير العام");
      return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    try {
      await softDeleteUserFn({ data: { id } });
      toast.success("تم حذف المستخدم من المنصة بنجاح");
      loadUsers();
    } catch (err: any) {
      toast.error("فشل حذف المستخدم: " + err.message);
    }
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "الكود,الاسم,البريد الإلكتروني,الدور,الحالة,التاريخ\n";
    filteredUsers.forEach((u) => {
      csvContent += `"${u.id}","${u.name}","${u.email}","${u.role}","${u.status}","${u.joinDate}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "global_users_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير سجل المستخدمين بنجاح");
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "المدير العام";
      case "ADMIN":
        return "مسؤول";
      case "TEACHER":
        return "معلم";
      case "STUDENT":
        return "طالب";
      default:
        return role;
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
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
        <div className="text-right space-y-1">
          <h2 className="font-display text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
            إدارة كافة المستخدمين
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl">
            استعراض شامل لجميع الحسابات المسجلة بالمنصة من طلاب ومعلمين ومسؤولين، وإدارة حالات الحظر الفورية.
          </p>
        </div>
      </div>

      {/* Tools / Filters */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/10 bg-neutral-900/30 p-4 lg:flex-row backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:border-amber-500/50 font-bold text-end"
          >
            <option value="ALL" className="bg-neutral-950 text-white font-bold">جميع الحالات</option>
            <option value="ACTIVE" className="bg-neutral-950 text-white font-bold">نشط</option>
            <option value="BLOCKED" className="bg-neutral-950 text-white font-bold">محظور</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-white outline-none focus:border-amber-500/50 font-bold text-end"
          >
            <option value="ALL" className="bg-neutral-950 text-white font-bold">جميع الأدوار</option>
            <option value="STUDENT" className="bg-neutral-950 text-white font-bold">طالب</option>
            <option value="TEACHER" className="bg-neutral-950 text-white font-bold">معلم</option>
            <option value="ADMIN" className="bg-neutral-950 text-white font-bold">مسؤول (Admin)</option>
            <option value="SUPER_ADMIN" className="bg-neutral-950 text-white font-bold">المدير العام</option>
          </select>

          <div className="relative w-full sm:w-64">
            <input
              type="search"
              placeholder="البحث باسم المستخدم أو البريد..."
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
      </div>

      {/* Table List */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/10 bg-black bg-neutral-950 bg-zinc-900/50 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.04)]">
        {loading ? (
          <div className="p-10 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-neutral-900/60 rounded-xl animate-pulse w-full"></div>
            ))}
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 font-bold">
            لا توجد حسابات مطابقة للبحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-end text-sm text-zinc-300">
              <thead>
                <tr className="sticky top-0 bg-neutral-950/90 border-b border-amber-500/10 text-xs font-bold text-amber-500/80">
                  <th className="px-6 py-4">الخيارات</th>
                  <th className="px-6 py-4">تاريخ التسجيل</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">الدور الوظيفي</th>
                  <th className="px-6 py-4">البريد الإلكتروني</th>
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">الكود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {paginatedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="odd:bg-neutral-900/20 hover:bg-amber-500/[0.03] transition-colors border-b border-zinc-900/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSoftDelete(u.id)}
                          disabled={u.role === "SUPER_ADMIN"}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleToggleBlock(u.id, u.status)}
                          disabled={u.role === "SUPER_ADMIN"}
                          className={`rounded-lg p-2 disabled:opacity-30 transition-all ${
                            u.status === "ACTIVE"
                              ? "text-amber-400 hover:bg-amber-500/15"
                              : "text-emerald-400 hover:bg-emerald-500/15"
                          }`}
                          title={u.status === "ACTIVE" ? "حظر المستخدم" : "إلغاء حظر المستخدم"}
                        >
                          {u.status === "ACTIVE" ? (
                            <ShieldAlert className="size-4" />
                          ) : (
                            <ShieldCheck className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono">{u.joinDate}</td>
                    <td className="px-6 py-4">
                      {u.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          نشط
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-400 border border-red-500/20">
                          محظور (Banned)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/5 px-2.5 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/10">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono">{u.email}</td>
                    <td className="px-6 py-4 font-bold text-white">{u.name}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500 font-mono">{u.id}</td>
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
            className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="text-xs text-zinc-400 font-bold">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page === 1}
            onClick={() => setPage((v) => Math.max(v - 1, 1))}
            className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-amber-400 disabled:opacity-30 transition-all cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
