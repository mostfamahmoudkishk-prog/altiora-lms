import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, ListOrdered, Info, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { addBalance, getBalance, getTx, type WalletTx } from "@/lib/wallet";

export const Route = createFileRoute("/app/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [tx, setTx] = useState<WalletTx[]>([]);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const sync = () => {
      setBalance(getBalance());
      setTx(getTx());
    };
    sync();
    window.addEventListener("altiora:wallet", sync);
    return () => window.removeEventListener("altiora:wallet", sync);
  }, []);

  function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n <= 0) return toast.error("ادخل قيمة صحيحة");
    addBalance(n, "شحن المحفظة");
    setAmount("");
    setOpen(false);
    toast.success(`تم شحن ${n} جنيه`);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-end gap-2 text-end">
          <h2 className="font-display text-lg font-bold text-foreground">المحفظة الإلكترونية</h2>
          <Wallet className="size-5 text-primary" />
        </div>
        <div className="text-end">
          <div className="text-sm text-muted-foreground">الرصيد الحالي</div>
          <div className="mt-1 text-4xl font-extrabold text-foreground">
            {balance.toFixed(2)} <span className="text-base text-muted-foreground">جنيه</span>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 py-3 text-sm font-bold text-primary hover:bg-primary/10"
        >
          <Wallet className="size-4" /> شحن المحفظة
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
          يمكنك شحن رصيد محفظتك بوسائل الدفع التي ندعمها لتتمكن من استخدام محفظتك في الشراء داخل
          المنصة
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-center justify-end gap-2 text-end">
          <h2 className="font-display text-lg font-bold text-foreground">سجل العمليات</h2>
          <ListOrdered className="size-5 text-primary" />
        </div>
        {tx.length === 0 ? (
          <div className="flex items-center justify-end gap-3 rounded-xl bg-secondary/60 p-4 text-end text-sm text-muted-foreground">
            <span>لا يوجد أي عمليات تمت على المحفظة الخاصة بك.</span>
            <Info className="size-5 text-primary" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {tx.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <span
                  className={`font-bold ${t.type === "شحن" ? "text-success" : "text-destructive"}`}
                >
                  {t.type === "شحن" ? "+" : "-"}
                  {t.amount.toFixed(2)} جنيه
                </span>
                <div className="text-end">
                  <div className="font-semibold text-foreground">{t.type}</div>
                  <div className="text-xs text-muted-foreground">{t.date}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleRecharge}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-elevated"
          >
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
              <h3 className="text-end text-lg font-bold text-foreground">شحن المحفظة</h3>
            </div>
            <label className="mb-2 block text-end text-sm font-semibold text-foreground">
              المبلغ (جنيه)
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-end outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="0.00"
              autoFocus
            />
            <button
              type="submit"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-95"
            >
              <Plus className="size-4" /> شحن الآن
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
