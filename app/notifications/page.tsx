'use client';

import { useEffect, useState } from 'react';
import {
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/notifications';

import type {
  Notification,
  NotificationAudienceRole,
} from '@/types';

// TODO: Replace with real auth-based role
const CURRENT_USER_ROLE: NotificationAudienceRole = 'ADMIN';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reloadNotifications();
  }, []);

  function reloadNotifications() {
    const all = getAllNotifications().filter((n) =>
      n.roles.length === 0 ? true : n.roles.includes(CURRENT_USER_ROLE),
    );
    setNotifications(all);
    setUnreadCount(getUnreadNotifications().filter((n) =>
      n.roles.length === 0 ? true : n.roles.includes(CURRENT_USER_ROLE),
    ).length);
    setLoading(false);
  }

  async function handleMarkAsRead(id: string) {
    markNotificationAsRead(id);
    reloadNotifications();
  }

  async function handleMarkAllAsRead() {
    markAllNotificationsAsRead();
    reloadNotifications();
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading notifications…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            System events such as absentee follow-ups and birthday messages will show
            up here.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
            <span className="h-2 w-2 rounded-full bg-orange-500 mr-1.5" />
            {unreadCount} unread
          </div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-900/70"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          No notifications yet.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ul className="space-y-3">
            {notifications.map((n) => {
              const isUnread = !n.readAt;
              const severity = (n.meta?.severity as string) ?? 'info';

              const severityColor =
                severity === 'error'
                  ? 'text-red-600 bg-red-50 dark:text-red-200 dark:bg-red-950/40'
                  : severity === 'warning'
                  ? 'text-amber-700 bg-amber-50 dark:text-amber-200 dark:bg-amber-950/40'
                  : severity === 'success'
                  ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-950/40'
                  : 'text-slate-700 bg-slate-50 dark:text-slate-200 dark:bg-slate-900/60';

              return (
                <li
                  key={n.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm dark:border-slate-800 ${
                    isUnread ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-900/70'
                  }`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                      )}
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {n.title}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {n.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 ${severityColor}`}
                      >
                        {n.type}
                      </span>
                      <span>
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {isUnread && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="ml-2 inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-900/70"
                    >
                      Mark as read
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
