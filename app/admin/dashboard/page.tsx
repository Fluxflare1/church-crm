import { UpcomingBirthdaysCard } from '@/components/dashboard/upcoming-birthdays-card';

export default function AdminDashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* ... other admin cards / widgets ... */}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <UpcomingBirthdaysCard />
      </div>
    </div>
  );
}
