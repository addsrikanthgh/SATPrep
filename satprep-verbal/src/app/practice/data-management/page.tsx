import { AppShell } from "@/components/app-shell";
import { DataManagementClient } from "@/components/data-management-client";

export default function DataManagementPage() {
  return (
    <AppShell
      eyebrow="SAT Prep"
      title="Data Management"
      subtitle="Backup progress, restore from backup, or clear local data for a clean start."
      maxWidthClassName="max-w-4xl"
    >
      <DataManagementClient />
    </AppShell>
  );
}
