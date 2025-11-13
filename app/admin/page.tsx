// app/admin/page.tsx
import { UpcomingBirthdaysCard } from '@/components/analytics/upcoming-birthdays-card';

export default function AdminDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* admin-specific metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <UpcomingBirthdaysCard />
      </div>
    </div>
  );
}
