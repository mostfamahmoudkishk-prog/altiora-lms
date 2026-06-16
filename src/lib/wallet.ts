// Shared client-side helpers for wallet balance + course enrollment.
// Backed by localStorage so state persists across navigation.

const BALANCE_KEY = "altiora_wallet_balance";
const TX_KEY = "altiora_wallet_tx";
const ENROLL_KEY = "altiora_enrollments";
const CARDS_KEY = "altiora_redeem_cards"; // demo redeem codes

export type WalletTx = {
  id: string;
  date: string;
  amount: number;
  type: "شحن" | "شراء";
  note?: string;
};

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* no-op */
  }
  try {
    window.dispatchEvent(new Event("altiora:wallet"));
  } catch {
    /* no-op */
  }
}

export function getBalance(): number {
  return read<number>(BALANCE_KEY, 0);
}
export function setBalance(n: number) {
  write(BALANCE_KEY, Math.max(0, n));
}
export function addBalance(delta: number, note?: string): number {
  const next = Math.max(0, getBalance() + delta);
  setBalance(next);
  pushTx({
    id: crypto.randomUUID(),
    date: new Date().toLocaleString("ar-EG"),
    amount: Math.abs(delta),
    type: delta >= 0 ? "شحن" : "شراء",
    note,
  });
  return next;
}

export function getTx(): WalletTx[] {
  return read<WalletTx[]>(TX_KEY, []);
}
export function pushTx(t: WalletTx) {
  write(TX_KEY, [t, ...getTx()].slice(0, 200));
}

export function getEnrollments(): string[] {
  return read<string[]>(ENROLL_KEY, []);
}
export function isEnrolled(courseId: string): boolean {
  return getEnrollments().includes(courseId);
}
export function enroll(courseId: string) {
  const cur = getEnrollments();
  if (!cur.includes(courseId)) write(ENROLL_KEY, [...cur, courseId]);
}

// Demo redeem cards: any of these codes works once per course.
const DEMO_CARDS = ["ALTIORA-1000", "FREE-COURSE", "PRECEPO-2026"];
export function redeemCard(code: string, courseId: string): boolean {
  const used = read<Record<string, string>>(CARDS_KEY, {});
  if (used[code]) return false;
  if (!DEMO_CARDS.includes(code.trim().toUpperCase())) return false;
  used[code] = courseId;
  write(CARDS_KEY, used);
  return true;
}
