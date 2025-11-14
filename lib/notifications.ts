'use client';

import { nanoid } from 'nanoid';
import { getSystemConfig } from './config';

import type {
  Notification,
  NotificationSeverity,
  NotificationAudienceRole,
  SystemConfig,
} from '@/types';

const STORAGE_KEY = 'church-crm:notifications';

let inMemoryNotifications: Notification[] = [];

/* -------------------------------------------------------------------------- */
/*  Storage helpers                                                           */
/* -------------------------------------------------------------------------- */

function loadNotifications(): Notification[] {
  if (typeof window === 'undefined') {
    return inMemoryNotifications;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      inMemoryNotifications = [];
      return inMemoryNotifications;
    }
    const parsed = JSON.parse(raw) as Notification[];
    if (!Array.isArray(parsed)) {
      inMemoryNotifications = [];
      return inMemoryNotifications;
    }
    inMemoryNotifications = parsed;
    return inMemoryNotifications;
  } catch {
    inMemoryNotifications = [];
    return inMemoryNotifications;
  }
}

function saveNotifications(list: Notification[]): void {
  inMemoryNotifications = list;
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function getAllNotifications(): Notification[] {
  const all = loadNotifications();
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUnreadNotifications(): Notification[] {
  return getAllNotifications().filter((n) => !n.readAt);
}

export function markNotificationAsRead(id: string): Notification | null {
  const list = loadNotifications();
  const idx = list.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const updated: Notification = {
    ...list[idx],
    readAt: list[idx].readAt ?? now,
  };

  list[idx] = updated;
  saveNotifications(list);
  return updated;
}

export function markAllNotificationsAsRead(): void {
  const list = loadNotifications();
  const now = new Date().toISOString();
  const updated = list.map((n) =>
    n.readAt
      ? n
      : {
          ...n,
          readAt: now,
        },
  );
  saveNotifications(updated);
}

/* -------------------------------------------------------------------------- */
/*  Event-based creation                                                      */
/* -------------------------------------------------------------------------- */

export type NotificationEventKey = keyof SystemConfig['notifications'];

export interface NotificationPayload {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  personId?: string;
  followUpId?: string;
  programId?: string;
  meta?: Record<string, any>;
}

/**
 * Create a notification based on SystemConfig.notifications[eventKey].
 * Respects enabled flag and notifyRoles.
 */
export function createNotificationForEvent(
  eventKey: NotificationEventKey,
  payload: NotificationPayload,
): Notification | null {
  const cfg = getSystemConfig();
  const eventCfg = cfg.notifications[eventKey];

  if (!eventCfg || !eventCfg.enabled) {
    return null;
  }

  const now = new Date().toISOString();

  const notification: Notification = {
    id: nanoid(),
    type: eventKey,
    title: payload.title,
    message: payload.message,
    createdAt: now,
    roles: eventCfg.notifyRoles ?? [],
    personId: payload.personId,
    followUpId: payload.followUpId,
    programId: payload.programId,
    meta: {
      severity: payload.severity ?? 'info',
      ...(payload.meta ?? {}),
    },
  };

  const list = loadNotifications();
  list.push(notification);
  saveNotifications(list);

  return notification;
}
