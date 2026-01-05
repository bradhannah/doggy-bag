// Settings Store Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock the API client before importing the store
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock Tauri core - always return false to simulate browser env
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => false,
}));

// Mock the logger
vi.mock('$lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  settings,
  dataDirectory,
  loading,
  error,
  isDevelopment,
  loadSettings,
  validateDirectory,
  migrateData,
  clearError,
  settingsStore,
  isTauri,
  getZoomPercentage,
  ZOOM_CONFIG,
  FONT_SIZE_LABELS,
  FONT_SCALE_MAP,
  type AppSettings,
  type DataDirectoryInfo,
  type DirectoryValidation,
  type MigrationResult,
} from './settings';
import { apiClient } from '$lib/api/client';

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

// Sample data
const sampleSettings: AppSettings & { isDevelopment: boolean } = {
  dataDirectory: '/Users/test/BudgetForFun',
  version: '0.1.0',
  isDevelopment: false,
};

const sampleDataDirectory: DataDirectoryInfo = {
  path: '/Users/test/BudgetForFun',
  entitiesDir: '/Users/test/BudgetForFun/entities',
  monthsDir: '/Users/test/BudgetForFun/months',
  isDevelopment: false,
  isWritable: true,
};

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store
    settingsStore.set({
      settings: null,
      dataDirectory: null,
      loading: false,
      error: null,
      isDevelopment: true,
    });
  });

  describe('isTauri', () => {
    it('returns false in test environment (browser simulation)', () => {
      expect(isTauri()).toBe(false);
    });
  });

  describe('loadSettings', () => {
    it('loads settings and data directory from API', async () => {
      mockGet.mockResolvedValueOnce(sampleSettings);
      mockGet.mockResolvedValueOnce(sampleDataDirectory);

      await loadSettings();

      expect(mockGet).toHaveBeenCalledWith('/api/settings');
      expect(mockGet).toHaveBeenCalledWith('/api/settings/data-directory');
      expect(get(settings)).toEqual({
        dataDirectory: sampleSettings.dataDirectory,
        version: sampleSettings.version,
      });
      expect(get(dataDirectory)).toEqual(sampleDataDirectory);
      expect(get(isDevelopment)).toBe(false);
      expect(get(loading)).toBe(false);
    });

    it('sets loading state during fetch', async () => {
      let loadingDuringFetch = false;
      mockGet.mockImplementation(() => {
        loadingDuringFetch = get(loading);
        return Promise.resolve(sampleSettings);
      });

      await loadSettings();

      expect(loadingDuringFetch).toBe(true);
    });

    it('sets error on API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(loadSettings()).rejects.toThrow('Network error');
      expect(get(error)).toBe('Network error');
      expect(get(loading)).toBe(false);
    });
  });

  describe('validateDirectory', () => {
    it('validates a directory via API', async () => {
      const validation: DirectoryValidation = {
        isValid: true,
        exists: true,
        isWritable: true,
        hasExistingData: false,
        existingFiles: [],
      };
      mockPost.mockResolvedValue(validation);

      const result = await validateDirectory('/path/to/dir');

      expect(mockPost).toHaveBeenCalledWith('/api/settings/validate-directory', {
        path: '/path/to/dir',
      });
      expect(result).toEqual(validation);
    });
  });

  describe('migrateData', () => {
    it('migrates data between directories', async () => {
      const migration: MigrationResult = {
        success: true,
        entityFilesCopied: 5,
        monthFilesCopied: 3,
        filesCopied: ['entities/bills.json', 'months/2025-01.json'],
        sourceDir: '/old/dir',
        destDir: '/new/dir',
      };
      mockPost.mockResolvedValue(migration);

      const result = await migrateData('/old/dir', '/new/dir', 'copy');

      expect(mockPost).toHaveBeenCalledWith('/api/settings/migrate-data', {
        sourceDir: '/old/dir',
        destDir: '/new/dir',
        mode: 'copy',
      });
      expect(result).toEqual(migration);
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      settingsStore.set({
        settings: null,
        dataDirectory: null,
        loading: false,
        error: 'Some error',
        isDevelopment: true,
      });

      clearError();

      expect(get(error)).toBeNull();
    });
  });

  describe('Zoom constants', () => {
    it('has valid zoom config', () => {
      expect(ZOOM_CONFIG.min).toBe(0.5);
      expect(ZOOM_CONFIG.max).toBe(2.0);
      expect(ZOOM_CONFIG.step).toBe(0.1);
      expect(ZOOM_CONFIG.default).toBe(1.0);
    });

    it('has font size labels', () => {
      expect(FONT_SIZE_LABELS.small).toBe('Small');
      expect(FONT_SIZE_LABELS.medium).toBe('Medium');
      expect(FONT_SIZE_LABELS.large).toBe('Large');
      expect(FONT_SIZE_LABELS.xlarge).toBe('X-Large');
    });

    it('has font scale map', () => {
      expect(FONT_SCALE_MAP.small).toBe(0.85);
      expect(FONT_SCALE_MAP.medium).toBe(1.0);
      expect(FONT_SCALE_MAP.large).toBe(1.15);
      expect(FONT_SCALE_MAP.xlarge).toBe(1.3);
    });
  });

  describe('getZoomPercentage', () => {
    it('formats zoom level as percentage', () => {
      expect(getZoomPercentage(1.0)).toBe('100%');
      expect(getZoomPercentage(0.5)).toBe('50%');
      expect(getZoomPercentage(1.5)).toBe('150%');
      expect(getZoomPercentage(2.0)).toBe('200%');
    });

    it('rounds to whole number', () => {
      expect(getZoomPercentage(1.15)).toBe('115%');
      expect(getZoomPercentage(0.85)).toBe('85%');
    });
  });
});
