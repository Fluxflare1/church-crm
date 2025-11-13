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
