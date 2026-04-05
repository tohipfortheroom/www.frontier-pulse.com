import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminIngestionPanel } from "@/components/admin-ingestion-panel";
import { SectionHeader } from "@/components/section-header";
import { isAdminEnabled } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Developer controls for ingestion runs, source health, and live-data verification.",
};

export default function AdminPage() {
  if (!isAdminEnabled()) {
    notFound();
  }

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <section className="fade-slide-up space-y-8">
        <SectionHeader
          label="ADMIN"
          title="Pipeline controls and source health"
          subtitle="Run ingestion manually, check quick-priority feeds, and inspect source freshness before it becomes a user-facing issue."
          tone="green"
        />
        <AdminIngestionPanel />
      </section>
    </div>
  );
}
