import AdminDashboard from "@/app/components/admin/AdminDashboard";
import CashierDashboard from "@/app/components/cashier/CashierDashboard";
import DashboardShell from "@/app/components/dashboard/DashboardShell";
import GreeterDashboard from "@/app/components/greeter/GreeterDashboard";
import PackagerDashboard from "@/app/components/packager/PackagerDashboard";
import RunnerDashboard from "@/app/components/runner/RunnerDashboard";
import { ROLE_CONFIG, type UserRole } from "@/app/components/logins";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@/lib/generated/prisma/client";

const roleDetails: Record<Role, { role: UserRole; title: string }> = {
  [Role.ADMIN]: { role: "admin", title: "Admin Dashboard" },
  [Role.PACKAGER]: { role: "packager", title: "Packager Dashboard" },
  [Role.GREETER]: { role: "greeter", title: "Greeter Dashboard" },
  [Role.CASHIER]: { role: "cashier", title: "Cashier Dashboard" },
  [Role.RUNNER]: { role: "runner", title: "Runner Dashboard" },
};

function RoleDashboard({ role }: { role: Role }) {
  switch (role) {
    case Role.ADMIN:
      return <AdminDashboard />;
    case Role.PACKAGER:
      return <PackagerDashboard />;
    case Role.GREETER:
      return <GreeterDashboard />;
    case Role.CASHIER:
      return <CashierDashboard />;
    case Role.RUNNER:
      return <RunnerDashboard />;
  }
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) redirect("/login");

  const details = roleDetails[user.role];
  const config = ROLE_CONFIG[details.role];

  return (
    <DashboardShell
      role={details.role}
      title={details.title}
      description={config.description}
    >
      <RoleDashboard role={user.role} />
    </DashboardShell>
  );
}
