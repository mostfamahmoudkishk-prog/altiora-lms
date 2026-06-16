import { createFileRoute } from "@tanstack/react-router";
import { DashboardInfo } from "@/components/app/DashboardInfo";
import { PrivacyBody } from "@/components/site/info-bodies";

export const Route = createFileRoute("/app/privacy")({
  component: () => (
    <DashboardInfo title="سياسة الخصوصية">
      <PrivacyBody />
    </DashboardInfo>
  ),
});
