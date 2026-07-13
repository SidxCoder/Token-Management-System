import DashboardShell from "@/app/Components/dashboard/DashboardShell";
import PackagerDashboard from "@/app/Components/Packager/PackagerDashboard";

export default function PackagerPage() {
  return (
    <DashboardShell
      role="packager"
      title="Packager Dashboard"
      description="Pack orders, manage bag numbers, hand over to runner"
    >
      <PackagerDashboard />
    </DashboardShell>
  );
}
