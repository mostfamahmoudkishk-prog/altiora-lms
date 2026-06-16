import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { DashboardInfo } from "@/components/app/DashboardInfo";
import { SupportChat } from "@/components/app/SupportChat";

export const Route = createFileRoute("/app/support")({
  component: AppSupportPage,
});

function AppSupportPage() {
  const [open, setOpen] = useState(false);
  return (
    <DashboardInfo title="الدعم الفني">
      <p className="flex items-center gap-2 text-foreground">
        <MessageSquare className="size-5 text-primary" />
        إذا كانت لديك مشكلة أو استفسار، فريق خدمة عملاء ألتيورا جاهز لمساعدتك في أي وقت.
      </p>
      <div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elevated transition-all hover:scale-[1.02]"
        >
          <MessageSquare className="size-4" />
          ابدأ المحادثة
        </button>
      </div>
      <SupportChat open={open} onOpenChange={setOpen} />
      <div className="grid gap-3 pt-2 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <Mail className="mb-2 size-5 text-primary" />
          <div className="font-bold text-foreground">البريد الإلكتروني</div>
          <a
            href="mailto:support@altiora.app"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            support@altiora.app
          </a>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <Phone className="mb-2 size-5 text-primary" />
          <div className="font-bold text-foreground">خط المساعدة</div>
          <div className="text-sm text-muted-foreground">من 9 صباحًا حتى 9 مساءً</div>
        </div>
      </div>
    </DashboardInfo>
  );
}
