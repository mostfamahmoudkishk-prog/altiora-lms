import { createFileRoute } from "@tanstack/react-router";
import { DashboardInfo } from "@/components/app/DashboardInfo";
import { AboutBody } from "@/components/site/info-bodies";

export const Route = createFileRoute("/app/about")({
  component: () => (
    <DashboardInfo title="عن المنصة">
      <AboutBody />
    </DashboardInfo>
  ),
});
