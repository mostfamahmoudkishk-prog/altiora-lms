import { Facebook, HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import logoTransparent from "@/assets/altiora-logo-transparent.png";

export function Footer() {
  const links: { label: string; to: string }[] = [
    { label: "الصفحة الرئيسية", to: "/" },
    { label: "حساب جديد", to: "/register" },
    { label: "تسجيل الدخول", to: "/login" },
    { label: "عن التطبيق", to: "/about" },
    { label: "الدعم الفني", to: "/support" },
    { label: "سياسة الخصوصية", to: "/privacy" },
    { label: "شروط الاستخدام", to: "/terms" },
  ];

  return (
    <footer className="border-t border-border bg-[#1a1a1a] text-white" dir="rtl">
      <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-3 md:px-6">
        {/* Logo + about — appears on the right in RTL */}
        <div className="order-1 text-center md:order-1 md:text-start">
          <img
            src={logoTransparent}
            alt="Altiora"
            className="mx-auto mb-5 h-24 w-auto md:mx-0"
            width={260}
            height={96}
          />
          <p className="max-w-sm text-sm leading-loose text-white/70">
            في ألتيورا هدفنا تقديم العلم بشكل سهل وعصري من خلال الالتحاق ببرامج تدريبية متطوّرة،
            واكتساب مهارات علمية وتجريبية تساعدك على الدخول في سوق العمل والاستعداد لكافة أنواع
            الاختبارات.
          </p>
        </div>

        {/* Links column — middle */}
        <div className="order-2 text-center md:order-2">
          <div className="mb-5 font-display font-bold text-white">الروابط</div>
          <ul className="space-y-2.5 text-sm">
            {links.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-white/70 transition-colors hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact column — appears on the left in RTL */}
        <div className="order-3 text-center md:order-3 md:text-end">
          <div className="mb-5 font-display font-bold text-white">تواصل معنا</div>
          <Link
            to="/support"
            className="mx-auto inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-card transition-transform hover:scale-[1.02] md:mx-0 md:ms-auto"
          >
            <HelpCircle className="size-4" />
            الدعم الفني
          </Link>

          <div className="mt-5 flex items-center justify-center gap-3 md:justify-end">
            <a
              href="#"
              aria-label="WhatsApp"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <Facebook className="size-4" />
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 md:justify-end">
            <a
              href="#"
              aria-label="Download on the App Store"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black px-3.5 py-2 transition-colors hover:bg-white/5"
            >
              <svg viewBox="0 0 384 512" className="size-6 text-white" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM260.6 100.8c28-33.2 25.4-63.4 24.6-74.3-24.7 1.4-53.3 16.8-69.6 35.7-18 20.3-28.6 45.4-26.3 73.8 26.7 2 51-11.7 71.3-35.2z" />
              </svg>
              <div className="text-start leading-tight">
                <div className="text-[10px] text-white/70">حمّل عليه من</div>
                <div className="text-sm font-semibold text-white">App Store</div>
              </div>
            </a>
            <a
              href="#"
              aria-label="Get it on Google Play"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black px-3.5 py-2 transition-colors hover:bg-white/5"
            >
              <svg viewBox="0 0 512 512" className="size-6" fill="none">
                <path d="M48 60v392l228-196L48 60z" fill="#34A853" />
                <path d="M48 60l228 196 80-69L84 35a40 40 0 0 0-36 25z" fill="#FBBC04" />
                <path d="M48 452l308-127-80-69L48 452z" fill="#EA4335" />
                <path d="M464 234l-108-58-80 80 80 80 108-58a30 30 0 0 0 0-44z" fill="#4285F4" />
              </svg>
              <div className="text-start leading-tight">
                <div className="text-[10px] text-white/70">احصل عليه من</div>
                <div className="text-sm font-semibold text-white">Google Play</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-center gap-2 px-4 py-5 text-center text-xs text-white/60 md:flex-row md:gap-4 md:px-6">
          <span>© 2026 جميع الحقوق محفوظة</span>
          <span className="hidden md:inline">|</span>
          <span>
            Powered By:{" "}
            <span className="font-bold text-primary">
              ERASA<span className="text-accent">TECH</span>
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}
