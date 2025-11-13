'use client';

import { useEffect } from 'react';

export default function DashboardPage() {
  useEffect(() => {
    // Fire-and-forget absentee detection on dashboard load
    void fetch('/api/cron/absentee').catch(() => {
      // Silent fail – dashboard should not break if this fails
    });
  }, []);

  return (
    <div className="p-6">
      {/* ... existing dashboard content ... */}
    </div>
  );
}

// Example: app/admin/page.tsx or app/page.tsx (admin dashboard)


import { useEffect } from 'react';

export default function AdminDashboard() {
  useEffect(() => {
    void fetch('/api/cron/birthdays').catch(() => {
      // silent fail; don't block dashboard
    });
  }, []);

  return (
    <div className="p-6">
      {/* ... existing dashboard content ... */}
    </div>
  );
}
import { UpcomingBirthdaysCard } from '@/components/dashboard/upcoming-birthdays-card';
