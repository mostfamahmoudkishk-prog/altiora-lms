import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";

export const Route = createFileRoute("/app/homework")({
  component: HomeworkPage,
});

function HomeworkPage() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-end gap-3 text-end text-sm text-foreground">
        <span>لم تخُض أي امتحانات حتى الآن أو ربما لم تظهر نتائج امتحاناتك.</span>
        <Info className="size-5 text-primary" />
      </div>
    </div>
  );
}
