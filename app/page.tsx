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

// Example: in app/admin/page.tsx or app/page.tsx

import { useEffect } from 'react';

export default function AdminDashboardPage() {
  useEffect(() => {
    void fetch('/api/cron/birthdays').catch(() => {});
  }, []);

  return (
    <div className="p-6">
      {/* your dashboard content */}
    </div>
  );
}
