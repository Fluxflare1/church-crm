'use client';

import {
  getSystemConfig as dbGetSystemConfig,
  saveSystemConfig as dbSaveSystemConfig,
} from './database';

import type { SystemConfig } from '@/types';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep merge for SystemConfig. Arrays are REPLACED (not merged),
 * objects are recursively merged, primitives overwrite.
 */
function mergeConfig<T extends object>(target: T, source: DeepPartial<T>): T {
  const result: any = { ...target };

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

    const srcVal = (source as any)[key];
    if (srcVal === undefined) continue;

    const tgtVal = (target as any)[key];

    if (Array.isArray(srcVal)) {
      result[key] = srcVal.slice();
    } else if (isObject(srcVal) && isObject(tgtVal)) {
      result[key] = mergeConfig(tgtVal, srcVal as any);
    } else {
      result[key] = srcVal;
    }
  }

  return result;
}

/**
 * Returns the current SystemConfig from the local database.
 */
export function getSystemConfig(): SystemConfig {
  return dbGetSystemConfig();
}

/**
 * Applies a deep partial update to SystemConfig and persists it.
 */
export function updateSystemConfig(patch: DeepPartial<SystemConfig>): SystemConfig {
  const current = dbGetSystemConfig();
  const merged = mergeConfig<SystemConfig>(current, patch);
  dbSaveSystemConfig(merged);
  return merged;
}

// Convenience helpers for specific sections of SystemConfig

export function updateEvolutionConfig(
  patch: DeepPartial<SystemConfig['evolution']>
): SystemConfig {
  return updateSystemConfig({ evolution: patch } as DeepPartial<SystemConfig>);
}

export function updateFollowUpConfig(
  patch: DeepPartial<SystemConfig['followUp']>
): SystemConfig {
  return updateSystemConfig({ followUp: patch } as DeepPartial<SystemConfig>);
}

export function updateCommunicationsConfig(
  patch: DeepPartial<SystemConfig['communications']>
): SystemConfig {
  return updateSystemConfig({ communications: patch } as DeepPartial<SystemConfig>);
}

export function updateGoogleSheetsConfig(
  patch: DeepPartial<SystemConfig['googleSheets']>
): SystemConfig {
  return updateSystemConfig({ googleSheets: patch } as DeepPartial<SystemConfig>);
}

export function updateBackupConfig(
  patch: DeepPartial<SystemConfig['backup']>
): SystemConfig {
  return updateSystemConfig({ backup: patch } as DeepPartial<SystemConfig>);
}

export function updateExcelExportConfig(
  patch: DeepPartial<SystemConfig['excelExport']>
): SystemConfig {
  return updateSystemConfig({ excelExport: patch } as DeepPartial<SystemConfig>);
}

export function updateBirthdaysConfig(
  patch: DeepPartial<SystemConfig['birthdays']>
): SystemConfig {
  return updateSystemConfig({ birthdays: patch } as DeepPartial<SystemConfig>);
}

export function updateAttendanceConfig(
  patch: DeepPartial<SystemConfig['attendance']>
): SystemConfig {
  return updateSystemConfig({ attendance: patch } as DeepPartial<SystemConfig>);
}

export function updateTallyConfig(
  patch: DeepPartial<SystemConfig['tally']>
): SystemConfig {
  return updateSystemConfig({ tally: patch } as DeepPartial<SystemConfig>);
}

export function updateNotificationsConfig(
  patch: DeepPartial<SystemConfig['notifications']>
): SystemConfig {
  return updateSystemConfig({ notifications: patch } as DeepPartial<SystemConfig>);
}

export function updateUiConfig(
  patch: DeepPartial<SystemConfig['ui']>
): SystemConfig {
  return updateSystemConfig({ ui: patch } as DeepPartial<SystemConfig>);
}

export function updateSystemInfoConfig(
  patch: DeepPartial<SystemConfig['systemInfo']>
): SystemConfig {
  return updateSystemConfig({ systemInfo: patch } as DeepPartial<SystemConfig>);
}
