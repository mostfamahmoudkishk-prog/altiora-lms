import { createFileRoute } from "@tanstack/react-router";
import { DashboardInfo } from "@/components/app/DashboardInfo";
import { TermsBody } from "@/components/site/info-bodies";

export const Route = createFileRoute("/app/terms")({
  component: () => (
    <DashboardInfo title="شروط الاستخدام">
      <TermsBody />
    </DashboardInfo>
  ),
});
