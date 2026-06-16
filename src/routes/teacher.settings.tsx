import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Bell, Shield, Eye, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher/settings")({
  component: TeacherSettings,
});

function TeacherSettings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [studentQuestions, setStudentQuestions] = useState(true);
  const [courseRatingsAlert, setCourseRatingsAlert] = useState(true);
  const [withdrawAlerts, setWithdrawAlerts] = useState(true);

  const [profilePublic, setProfilePublic] = useState(true);
  const [showEnrolledCount, setShowEnrolledCount] = useState(true);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("تم حفظ إعدادات لوحة التحكم بنجاح");
  };

  return (
    <div className="space-y-6 text-end">
      {/* Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:flex-row">
        <div className="text-sm text-muted-foreground">
          تخصيص تفضيلات لوحة المدرس والإشعارات الواردة والخصوصية
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">إعدادات الحساب والمنصة</h2>
      </div>

      <form onSubmit={handleSaveSettings} className="grid gap-6 md:grid-cols-2">
        {/* Notifications Settings */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card space-y-5">
          <div className="flex items-center justify-end gap-2 border-b border-border pb-3">
            <span className="font-display text-base font-bold text-foreground">
              إشعارات البريد والمنصة
            </span>
            <Bell className="size-5 text-primary" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${emailAlerts ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`size-4 rounded-full bg-white transition-transform ${emailAlerts ? "-translate-x-6" : "-translate-x-1"}`}
                />
              </button>
              <div>
                <span className="block text-sm font-bold text-foreground">
                  تنبيهات البريد الإلكتروني
                </span>
                <span className="text-xs text-muted-foreground">
                  تلقي تقارير أسبوعية بملخص الأرباح والطلاب
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStudentQuestions(!studentQuestions)}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${studentQuestions ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`size-4 rounded-full bg-white transition-transform ${studentQuestions ? "-translate-x-6" : "-translate-x-1"}`}
                />
              </button>
              <div>
                <span className="block text-sm font-bold text-foreground">
                  أسئلة الطلاب الجديدة
                </span>
                <span className="text-xs text-muted-foreground">
                  تنبيه عند إضافة سؤال في بنك الأسئلة أو الدعم
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCourseRatingsAlert(!courseRatingsAlert)}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${courseRatingsAlert ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`size-4 rounded-full bg-white transition-transform ${courseRatingsAlert ? "-translate-x-6" : "-translate-x-1"}`}
                />
              </button>
              <div>
                <span className="block text-sm font-bold text-foreground">
                  تقييمات المقررات الدراسية
                </span>
                <span className="text-xs text-muted-foreground">
                  إشعار عند قيام طالب بتقييم إحدى دوراتك
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWithdrawAlerts(!withdrawAlerts)}
                className={`flex h-6 w-11 items-center rounded-full transition-colors ${withdrawAlerts ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`size-4 rounded-full bg-white transition-transform ${withdrawAlerts ? "-translate-x-6" : "-translate-x-1"}`}
                />
              </button>
              <div>
                <span className="block text-sm font-bold text-foreground">
                  تحديثات المستخلصات المالية
                </span>
                <span className="text-xs text-muted-foreground">
                  تنبيه عند قبول أو معالجة طلب سحب مالي
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & View settings */}
        <div className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-card space-y-5">
          <div>
            <div className="flex items-center justify-end gap-2 border-b border-border pb-3">
              <span className="font-display text-base font-bold text-foreground">
                إعدادات الخصوصية والعرض
              </span>
              <Eye className="size-5 text-primary" />
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setProfilePublic(!profilePublic)}
                  className={`flex h-6 w-11 items-center rounded-full transition-colors ${profilePublic ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`size-4 rounded-full bg-white transition-transform ${profilePublic ? "-translate-x-6" : "-translate-x-1"}`}
                  />
                </button>
                <div>
                  <span className="block text-sm font-bold text-foreground">
                    الملف التعريفي العام
                  </span>
                  <span className="text-xs text-muted-foreground">
                    السماح للطلاب بمشاهدة سيرتك الذاتية وخبراتك
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEnrolledCount(!showEnrolledCount)}
                  className={`flex h-6 w-11 items-center rounded-full transition-colors ${showEnrolledCount ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`size-4 rounded-full bg-white transition-transform ${showEnrolledCount ? "-translate-x-6" : "-translate-x-1"}`}
                  />
                </button>
                <div>
                  <span className="block text-sm font-bold text-foreground">عرض أعداد الطلاب</span>
                  <span className="text-xs text-muted-foreground">
                    عرض إجمالي المشتركين في صفحة الدورة العامة
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-card hover:opacity-95 transition-all w-full mt-6"
          >
            <Save className="size-4" /> حفظ التفضيلات
          </button>
        </div>
      </form>
    </div>
  );
}
