import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, CreditCard, KeyRound, Tag, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { addBalance, enroll, getBalance, redeemCard } from "@/lib/wallet";

import { recordRevenueTransactionFn } from "@/lib/api/db.functions";
import { getCurrentUser } from "@/lib/auth";

type Method = "wallet" | "card";

export function GetCourseModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  price,
  onEnrolled,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  courseTitle: string;
  price: number;
  onEnrolled?: () => void;
}) {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("wallet");
  const [balance, setBal] = useState(0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // Coupon / Access Code State
  const [couponCode, setCouponCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    couponId: string;
    discountType: "PERCENTAGE" | "FIXED" | "FREE";
    discountValue: number;
    code: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setBal(getBalance());
    setMethod("wallet");
    setCode("");
    setCouponCode("");
    setAppliedCoupon(null);
    const h = () => setBal(getBalance());
    window.addEventListener("altiora:wallet", h);
    return () => window.removeEventListener("altiora:wallet", h);
  }, [open]);

  // Calculate final price with discount
  const currentPrice = appliedCoupon
    ? appliedCoupon.discountType === "PERCENTAGE"
      ? price * (1 - appliedCoupon.discountValue / 100)
      : Math.max(0, price - appliedCoupon.discountValue)
    : price;

  const enough = balance >= currentPrice;
  const shortfall = Math.max(0, currentPrice - balance);

  // Apply Coupon / Enrollment Code
  async function applyCouponCode() {
    const c = couponCode.trim();
    if (!c) {
      toast.error("يرجى إدخال رمز الكوبون أو كود الالتحاق أولاً.");
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      toast.error("يجب تسجيل الدخول لتفعيل الأكواد.");
      return;
    }

    setApplyingCode(true);
    try {
      const { redeemCouponOrEnrollmentCodeFn } = await import("@/lib/api/db.functions");
      const res = await redeemCouponOrEnrollmentCodeFn({
        data: {
          studentEmail: user.email,
          code: c,
        },
      });

      if (res.type === "FREE_COUPON" || res.type === "ENROLLMENT_CODE") {
        toast.success(`تم تفعيل الرمز والالتحاق بالدورة بنجاح: ${res.courseTitle}`);
        enroll(courseId);
        onOpenChange(false);
        onEnrolled?.();
      } else if (res.type === "DISCOUNT_COUPON") {
        if (res.courseId !== courseId) {
          toast.error("هذا الكوبون مخصص لدورة تدريبية أخرى.");
          return;
        }
        setAppliedCoupon({
          couponId: res.couponId,
          discountType: res.discountType,
          discountValue: res.discountValue,
          code: c,
        });
        toast.success(
          `تم تطبيق الكوبون بنجاح: خصم ${res.discountType === "PERCENTAGE" ? `${res.discountValue}%` : `${res.discountValue} ج.م`}`,
        );
      }
    } catch (err: any) {
      toast.error(err.message || "رمز غير صالح أو مستخدم من قبل.");
    } finally {
      setApplyingCode(false);
    }
  }

  function buyWithWallet() {
    if (!enough) return;
    setBusy(true);
    setTimeout(async () => {
      try {
        const user = getCurrentUser();
        if (user) {
          await recordRevenueTransactionFn({
            data: {
              courseId,
              studentEmail: user.email,
              amount: currentPrice,
              type: "PURCHASE",
              couponId: appliedCoupon?.couponId || undefined,
            },
          });
        }
      } catch (err) {
        console.error("Failed to record revenue transaction:", err);
      }
      addBalance(-currentPrice, `شراء: ${courseTitle}`);
      enroll(courseId);
      setBusy(false);
      onOpenChange(false);
      toast.success("تم شراء الدورة وفتح المحتوى");
      onEnrolled?.();
    }, 500);
  }

  function buyWithCard() {
    const c = code.trim();
    if (!c) return toast.error("ادخل كود البطاقة أو كود التفعيل");
    setBusy(true);

    const user = getCurrentUser();
    if (!user) {
      setBusy(false);
      return toast.error("يجب تسجيل الدخول أولاً لتفعيل الأكواد.");
    }

    setTimeout(async () => {
      try {
        const { claimAccessCodeFn } = await import("@/lib/api/db.functions");
        await claimAccessCodeFn({
          data: {
            code: c,
            studentEmail: user.email,
          },
        });
        setBusy(false);
        enroll(courseId);
        onOpenChange(false);
        toast.success("تم تفعيل الكود بنجاح والالتحاق بالدورة!");
        onEnrolled?.();
        return;
      } catch (err: any) {
        console.warn(
          "Database PaymentCode validation failed, falling back to legacy cards:",
          err.message,
        );
      }

      setBusy(false);
      if (redeemCard(c, courseId)) {
        try {
          await recordRevenueTransactionFn({
            data: {
              courseId,
              studentEmail: user.email,
              amount: currentPrice,
              type: "COUPON",
              couponId: appliedCoupon?.couponId || undefined,
            },
          });
        } catch (err) {
          console.error("Failed to record revenue transaction:", err);
        }
        enroll(courseId);
        onOpenChange(false);
        toast.success("تم تفعيل البطاقة وفتح الدورة");
        onEnrolled?.();
      } else {
        toast.error("كود غير صحيح أو مستخدم من قبل");
      }
    }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-end text-base font-bold">الحصول على الدورة</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {/* Coupon / Access Code Section */}
          <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2 text-end">
            <label className="block text-xs font-semibold text-muted-foreground">
              هل لديك كود خصم أو التحاق؟
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyCouponCode}
                disabled={applyingCode || !couponCode.trim()}
                className="h-10 rounded-xl bg-primary/10 border border-primary/20 px-4 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                {applyingCode ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Tag className="size-3.5" />
                )}
                تطبيق الكود
              </button>
              <input
                type="text"
                placeholder="أدخل الكود هنا (مثال: ALT-PER-123)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={!!appliedCoupon}
                className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary text-end font-mono"
              />
            </div>
            {appliedCoupon && (
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20">
                <Check className="size-4 shrink-0" />
                <span>
                  تم تطبيق الخصم:{" "}
                  {appliedCoupon.discountType === "PERCENTAGE"
                    ? `${appliedCoupon.discountValue}%`
                    : `${appliedCoupon.discountValue} ج.م`}
                </span>
              </div>
            )}
          </div>

          <OptionRow
            active={method === "wallet"}
            onClick={() => setMethod("wallet")}
            title="محفظة الحساب"
            desc="الدفع برصيد محفظة الحساب الخاص بك"
            icon={<Wallet className="size-5 text-primary" />}
          />
          <OptionRow
            active={method === "card"}
            onClick={() => setMethod("card")}
            title="بطاقة دفع"
            desc="الدفع المباشر بكود بطاقة الدفع"
            icon={<CreditCard className="size-5 text-success" />}
          />

          {method === "wallet" ? (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${enough ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
                >
                  {balance.toFixed(2)} جنيه
                </span>
                <div className="flex items-center gap-2 text-end text-sm font-bold">
                  رصيد المحفظة <Wallet className="size-4 text-primary" />
                </div>
              </div>

              <div className="rounded-xl bg-secondary/60 px-4 py-3 text-center text-sm text-foreground">
                {appliedCoupon ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="line-through text-muted-foreground">
                      {price.toFixed(2)} ج.م
                    </span>
                    <span className="font-bold text-primary">
                      المبلغ المطلوب بعد الخصم: {currentPrice.toFixed(2)} ج.م
                    </span>
                  </div>
                ) : (
                  <span>
                    المبلغ المطلوب:{" "}
                    <span className="font-bold text-primary">{price.toFixed(2)} جنيه</span>
                  </span>
                )}
              </div>

              {!enough && (
                <div className="rounded-xl bg-secondary/60 px-4 py-3 text-center text-sm text-muted-foreground">
                  رصيد محفظتك {balance.toFixed(2)} جنيه غير كافي. لإتمام الشراء ستحتاج لشحن المبلغ
                  التالي:
                  <div className="mt-1 text-2xl font-extrabold text-foreground">
                    {shortfall.toFixed(2)}{" "}
                    <span className="text-sm text-muted-foreground">جنيه</span>
                  </div>
                </div>
              )}

              {enough ? (
                <button
                  onClick={buyWithWallet}
                  disabled={busy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-all"
                >
                  إتمام الشراء
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenChange(false);
                    navigate({ to: "/app/wallet" });
                  }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-95 transition-all"
                >
                  <Wallet className="size-4" /> شحن رصيد المحفظة
                </button>
              )}
            </>
          ) : (
            <>
              <label className="block text-end text-sm font-semibold text-foreground">
                أدخل الكود الموجود على بطاقة الدفع:
              </label>
              <div className="relative">
                <KeyRound className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="كود بطاقة الدفع"
                  className="h-12 w-full rounded-xl border border-border bg-background pe-10 ps-4 text-end text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <button
                onClick={buyWithCard}
                disabled={busy || !code.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:opacity-95 disabled:opacity-50 transition-all"
              >
                إتمام الشراء
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionRow({
  active,
  onClick,
  title,
  desc,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/50"}`}
    >
      <span
        className={`flex size-5 items-center justify-center rounded-full border-2 ${active ? "border-primary" : "border-muted-foreground/40"}`}
      >
        {active && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
      <div className="flex flex-1 items-center justify-end gap-3 text-end">
        <div>
          <div className="text-sm font-bold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        {icon}
      </div>
    </button>
  );
}
