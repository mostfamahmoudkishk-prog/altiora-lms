import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { SupportChat } from "@/components/app/SupportChat";
import { isAuthenticated } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "الدعم الفني | Altiora — نحو القمة" },
      { name: "description", content: "تواصل مع فريق دعم منصة ألتيورا للحصول على المساعدة." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const handleStart = () => {
    if (!isAuthenticated()) {
      toast.error("يجب تسجيل الدخول أولاً للتواصل مع الدعم الفني.");
      setTimeout(() => navigate({ to: "/login" }), 600);
      return;
    }
    setChatOpen(true);
  };
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="container mx-auto px-4 py-16 md:px-6 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="mb-4 inline-flex items-center justify-center gap-2 text-primary">
              <MessageSquare className="size-7" />
              <h1 className="font-display text-2xl font-bold md:text-3xl">تواصل معنا</h1>
            </div>
            <p className="mb-8 text-muted-foreground">
              إذا كانت لديك مشكلة أو استفسار، فريق خدمة عملاء ألتيورا جاهز لمساعدتك في أي وقت.
            </p>

            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-elevated transition-all hover:scale-[1.02]"
            >
              <MessageSquare className="size-5" />
              ابدأ المحادثة
            </button>
            <SupportChat open={chatOpen} onOpenChange={setChatOpen} />

            <div className="mx-auto mt-12 grid max-w-xl gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5 text-start">
                <Mail className="mb-2 size-5 text-primary" />
                <div className="font-bold text-foreground">البريد الإلكتروني</div>
                <a
                  href="mailto:support@altiora.app"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  support@altiora.app
                </a>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-start">
                <Phone className="mb-2 size-5 text-primary" />
                <div className="font-bold text-foreground">خط المساعدة</div>
                <div className="text-sm text-muted-foreground">من 9 صباحًا حتى 9 مساءً</div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
