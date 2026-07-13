import DashboardShell from "@/app/Components/dashboard/DashboardShell";
import GreeterDashboard from "@/app/Components/Greeter/GreeterDashboard";

export default function GreeterPage() {
  return (
    <DashboardShell
      role="greeter"
      title="Greeter Dashboard"
      description="Search orders, verify customers, and issue tokens"
    >
      <GreeterDashboard />
    </DashboardShell>
  );
}
