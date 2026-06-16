import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Eye,
  Edit,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUsersFn, updateUserFn, softDeleteUserFn } from "@/lib/api/db.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminUsers,
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

function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editUser, setEditUser] = useState<UserItem | null>(null);

  // Search, Filters & Pagination
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

  // Block / Unblock handlers
  const handleToggleBlock = (id: string, currentStatus: "ACTIVE" | "BLOCKED") => {
    const nextStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)));
    toast.success(nextStatus === "BLOCKED" ? "تم حظر المستخدم بنجاح" : "تم إلغاء حظر المستخدم");
  };

  // Soft Delete handler
  const handleSoftDelete = async (id: string) => {
    const userToDelete = users.find((u) => u.id === id);
    if (userToDelete?.role === "SUPER_ADMIN") {
      toast.error("لا يمكن حذف حساب المدير العام الخارق");
      return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;
    try {
      await softDeleteUserFn({ data: { id } });
      toast.success("تم حذف المستخدم (حذف مؤقت)");
      loadUsers();
    } catch (err: any) {
      toast.error("فشل حذف المستخدم: " + err.message);
    }
  };

  // Save Edit handler
  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      await updateUserFn({
        data: {
          id: editUser.id,
          name: editUser.name,
          role: editUser.role,
          email: editUser.email,
        },
      });
      toast.success("تم تعديل بيانات المستخدم بنجاح");
      setEditUser(null);
      loadUsers();
    } catch (err: any) {
      toast.error("فشل تعديل المستخدم: " + err.message);
    }
  };

  // Export Excel
  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\ufeff";
    csvContent += "الكود,الاسم,البريد الإلكتروني,الدور,الحالة,تاريخ التسجيل\n";
    filteredUsers.forEach((u) => {
      csvContent += `"${u.id}","${u.name}","${u.email}","${u.role}","${u.status}","${u.joinDate}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "users_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير قائمة المستخدمين بنجاح");
  };

  // Export PDF
  const exportToPDF = () => {
    window.print();
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
            onClick={exportToPDF}
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
            <option value="ACTIVE">نشط</option>
            <option value="BLOCKED">محظور</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-3 text-xs outline-none focus:border-primary"
          >
            <option value="ALL">جميع الأدوار</option>
            <option value="STUDENT">طالب</option>
            <option value="TEACHER">معلم</option>
            <option value="ADMIN">مسؤول (Admin)</option>
            <option value="SUPER_ADMIN">المدير العام</option>
          </select>

          <input
            type="search"
            placeholder="البحث باسم المستخدم أو البريد..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 sm:w-64"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-end text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-xs font-bold text-muted-foreground">
              <th className="px-5 py-4">الخيارات</th>
              <th className="px-5 py-4">تاريخ التسجيل</th>
              <th className="px-5 py-4">الحالة</th>
              <th className="px-5 py-4">الدور</th>
              <th className="px-5 py-4">البريد الإلكتروني</th>
              <th className="px-5 py-4">الاسم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="animate-spin inline-block me-2 size-4 text-primary" />
                  جاري تحميل المستخدمين...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  لا توجد نتائج مطابقة للبحث
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-secondary/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSoftDelete(u.id)}
                        disabled={u.role === "SUPER_ADMIN"}
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                        title="حذف"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        onClick={() => handleToggleBlock(u.id, u.status)}
                        disabled={u.role === "SUPER_ADMIN"}
                        className={`rounded-lg p-1.5 disabled:opacity-30 ${
                          u.status === "ACTIVE"
                            ? "text-amber-500 hover:bg-amber-500/10"
                            : "text-emerald-500 hover:bg-emerald-500/10"
                        }`}
                        title={u.status === "ACTIVE" ? "حظر" : "إلغاء حظر"}
                      >
                        {u.status === "ACTIVE" ? (
                          <ShieldAlert className="size-4" />
                        ) : (
                          <ShieldCheck className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditUser(u)}
                        className="rounded-lg p-1.5 text-primary hover:bg-secondary"
                        title="تعديل"
                      >
                        <Edit className="size-4" />
                      </button>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                        title="عرض"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{u.joinDate}</td>
                  <td className="px-5 py-3">
                    {u.status === "ACTIVE" ? (
                      <span className="rounded bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                        نشط
                      </span>
                    ) : (
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                        محظور
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-semibold text-primary">
                    {u.role === "SUPER_ADMIN"
                      ? "المدير العام"
                      : u.role === "ADMIN"
                        ? "مسؤول"
                        : u.role === "TEACHER"
                          ? "معلم"
                          : "طالب"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-3 font-bold text-foreground">{u.name}</td>
                </tr>
              ))
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

      {/* View User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              بيانات المستخدم
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/10 p-4">
                <span className="block text-xs text-muted-foreground">الاسم الكامل</span>
                <span className="font-bold text-foreground text-base">{selectedUser.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="border border-border rounded-xl p-3 bg-card">
                  <span className="block text-xs text-muted-foreground">الدور بالمنصة</span>
                  <span className="font-semibold text-primary">{selectedUser.role}</span>
                </div>
                <div className="border border-border rounded-xl p-3 bg-card">
                  <span className="block text-xs text-muted-foreground">حالة الحساب</span>
                  <span
                    className={`font-semibold ${selectedUser.status === "ACTIVE" ? "text-success" : "text-destructive"}`}
                  >
                    {selectedUser.status}
                  </span>
                </div>
              </div>
              <div className="border border-border rounded-xl p-3 text-xs sm:text-sm">
                <span className="block text-xs text-muted-foreground">البريد الإلكتروني</span>
                <span className="font-semibold text-foreground">{selectedUser.email}</span>
              </div>
              <div className="border border-border rounded-xl p-3 text-xs sm:text-sm">
                <span className="block text-xs text-muted-foreground">تاريخ تسجيل الحساب</span>
                <span className="font-semibold text-foreground">{selectedUser.joinDate}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md rounded-2xl text-end" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              تعديل بيانات الحساب
            </DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser((prev) => prev && { ...prev, name: e.target.value })}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) =>
                    setEditUser((prev) => prev && { ...prev, email: e.target.value })
                  }
                  required
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  الدور بالمنصة
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser((prev) => prev && { ...prev, role: e.target.value as any })
                  }
                  disabled={editUser.role === "SUPER_ADMIN"}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="STUDENT">طالب (Student)</option>
                  <option value="TEACHER">معلم (Teacher)</option>
                  <option value="ADMIN">مسؤول (Admin)</option>
                  <option value="SUPER_ADMIN">المدير العام للمنصة</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all"
              >
                حفظ التعديلات
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
