import DashboardShell from "@/app/Components/dashboard/DashboardShell";
import RunnerDashboard from "@/app/Components/Runner/RunnerDashboard";

export default function RunnerPage() {
  return (
    <DashboardShell
      role="runner"
      title="Runner Dashboard"
      description="Collect bags and hand orders over to cashier"
    >
      <RunnerDashboard />
    </DashboardShell>
  );
}
