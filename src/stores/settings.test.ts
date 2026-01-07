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

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

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
  zoomLevel,
  uiScale,
  applyZoom,
  loadZoom,
  setZoom,
  zoomIn,
  zoomOut,
  resetZoom,
  loadUIScale,
  saveUIScale,
  openFolderPicker,
  getDefaultDataDir,
  saveDataDirectorySetting,
  getSavedDataDirectory,
  updateDataDirectoryLocally,
  restartSidecar,
  relaunchApp,
  getDebugModeSetting,
  saveDebugMode,
  toggleDebugMode,
  toggleDevtools,
  openDevtools,
  closeDevtools,
  isDevtoolsOpen,
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
  dataDirectory: '/Users/test/DoggyBag',
  version: '0.1.0',
  isDevelopment: false,
};

const sampleDataDirectory: DataDirectoryInfo = {
  path: '/Users/test/DoggyBag',
  entitiesDir: '/Users/test/DoggyBag/entities',
  monthsDir: '/Users/test/DoggyBag/months',
  isDevelopment: false,
  isWritable: true,
};

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
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

    it('handles non-Error thrown', async () => {
      mockGet.mockRejectedValue('string error');

      await expect(loadSettings()).rejects.toThrow('Failed to load settings');
      expect(get(error)).toBe('Failed to load settings');
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

  describe('Zoom functions', () => {
    describe('zoomLevel store', () => {
      it('is a readable store', () => {
        const level = get(zoomLevel);
        expect(typeof level).toBe('number');
      });
    });

    describe('uiScale store', () => {
      it('derives font size from zoom level', async () => {
        // Test different zoom levels map to correct FontSize
        await setZoom(0.85);
        expect(get(uiScale)).toBe('small');

        await setZoom(1.0);
        expect(get(uiScale)).toBe('medium');

        await setZoom(1.15);
        expect(get(uiScale)).toBe('large');

        await setZoom(1.3);
        expect(get(uiScale)).toBe('xlarge');
      });
    });

    describe('applyZoom', () => {
      it('does not apply zoom in browser mode', async () => {
        // In browser mode, applyZoom should be a no-op
        await expect(applyZoom(1.5)).resolves.toBeUndefined();
      });

      it('clamps zoom to valid range', async () => {
        // Below min
        await applyZoom(0.1);
        // Above max
        await applyZoom(3.0);
        // These should not throw
      });
    });

    describe('loadZoom', () => {
      it('loads default zoom when no saved value', async () => {
        const zoom = await loadZoom();
        expect(zoom).toBe(ZOOM_CONFIG.default);
      });

      it('loads zoom from localStorage in browser', async () => {
        localStorageMock.setItem('doggybag_zoom', '1.5');
        const zoom = await loadZoom();
        expect(zoom).toBe(1.5);
      });

      it('ignores invalid localStorage values', async () => {
        localStorageMock.setItem('doggybag_zoom', 'invalid');
        const zoom = await loadZoom();
        expect(zoom).toBe(ZOOM_CONFIG.default);
      });

      it('ignores out-of-range localStorage values', async () => {
        localStorageMock.setItem('doggybag_zoom', '5.0');
        const zoom = await loadZoom();
        expect(zoom).toBe(ZOOM_CONFIG.default);
      });
    });

    describe('setZoom', () => {
      it('sets zoom level and saves to localStorage', async () => {
        await setZoom(1.5);
        expect(get(zoomLevel)).toBe(1.5);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('doggybag_zoom', '1.5');
      });

      it('clamps zoom to min', async () => {
        await setZoom(0.1);
        expect(get(zoomLevel)).toBe(ZOOM_CONFIG.min);
      });

      it('clamps zoom to max', async () => {
        await setZoom(3.0);
        expect(get(zoomLevel)).toBe(ZOOM_CONFIG.max);
      });

      it('rounds to 2 decimal places', async () => {
        await setZoom(1.123456);
        expect(get(zoomLevel)).toBe(1.12);
      });
    });

    describe('zoomIn', () => {
      it('increases zoom by step', async () => {
        await setZoom(1.0);
        await zoomIn();
        expect(get(zoomLevel)).toBe(1.1);
      });
    });

    describe('zoomOut', () => {
      it('decreases zoom by step', async () => {
        await setZoom(1.0);
        await zoomOut();
        expect(get(zoomLevel)).toBe(0.9);
      });
    });

    describe('resetZoom', () => {
      it('resets zoom to default', async () => {
        await setZoom(1.5);
        await resetZoom();
        expect(get(zoomLevel)).toBe(ZOOM_CONFIG.default);
      });
    });

    describe('loadUIScale (backward compat)', () => {
      it('is an alias for loadZoom', () => {
        expect(loadUIScale).toBe(loadZoom);
      });
    });

    describe('saveUIScale (backward compat)', () => {
      it('sets zoom based on FontSize', async () => {
        await saveUIScale('small');
        expect(get(zoomLevel)).toBe(0.85);

        await saveUIScale('medium');
        expect(get(zoomLevel)).toBe(1.0);

        await saveUIScale('large');
        expect(get(zoomLevel)).toBe(1.15);

        await saveUIScale('xlarge');
        expect(get(zoomLevel)).toBe(1.3);
      });
    });
  });

  describe('Folder picker', () => {
    describe('openFolderPicker', () => {
      it('shows prompt in browser mode', async () => {
        const mockPrompt = vi.fn().mockReturnValue('/test/path');
        globalThis.prompt = mockPrompt;

        const result = await openFolderPicker();

        expect(mockPrompt).toHaveBeenCalled();
        expect(result).toBe('/test/path');
      });

      it('returns null when prompt is cancelled', async () => {
        const mockPrompt = vi.fn().mockReturnValue(null);
        globalThis.prompt = mockPrompt;

        const result = await openFolderPicker();

        expect(result).toBeNull();
      });
    });

    describe('getDefaultDataDir', () => {
      it('returns fallback path in browser mode', async () => {
        const result = await getDefaultDataDir();
        expect(result).toBe('~/Documents/DoggyBag');
      });
    });
  });

  describe('Data directory settings', () => {
    describe('saveDataDirectorySetting', () => {
      it('saves to localStorage in browser mode', async () => {
        await saveDataDirectorySetting('/test/data/dir');
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'doggybag_data_dir',
          '/test/data/dir'
        );
      });
    });

    describe('getSavedDataDirectory', () => {
      it('reads from localStorage in browser mode', async () => {
        localStorageMock.setItem('doggybag_data_dir', '/saved/path');
        const result = await getSavedDataDirectory();
        expect(result).toBe('/saved/path');
      });

      it('returns null when no saved value', async () => {
        const result = await getSavedDataDirectory();
        expect(result).toBeNull();
      });
    });

    describe('updateDataDirectoryLocally', () => {
      it('updates the store state immediately', () => {
        updateDataDirectoryLocally('/new/data/path');

        const dir = get(dataDirectory);
        expect(dir?.path).toBe('/new/data/path');
        expect(dir?.entitiesDir).toBe('/new/data/path/entities');
        expect(dir?.monthsDir).toBe('/new/data/path/months');
        expect(dir?.isDevelopment).toBe(false);
        expect(dir?.isWritable).toBe(true);
        expect(get(isDevelopment)).toBe(false);
      });
    });
  });

  describe('Sidecar and app control', () => {
    describe('restartSidecar', () => {
      it('does nothing in browser mode', async () => {
        // Should not throw
        await expect(restartSidecar('/new/dir')).resolves.toBeUndefined();
      });
    });

    describe('relaunchApp', () => {
      it('reloads the page in browser mode', async () => {
        const mockReload = vi.fn();
        Object.defineProperty(window, 'location', {
          value: { reload: mockReload },
          writable: true,
        });

        await relaunchApp();

        expect(mockReload).toHaveBeenCalled();
      });
    });
  });

  describe('Debug mode', () => {
    describe('getDebugModeSetting', () => {
      it('returns false by default', async () => {
        const result = await getDebugModeSetting();
        expect(result).toBe(false);
      });

      it('returns true when localStorage has true', async () => {
        localStorageMock.setItem('doggybag_debug', 'true');
        const result = await getDebugModeSetting();
        expect(result).toBe(true);
      });

      it('returns false when localStorage has other values', async () => {
        localStorageMock.setItem('doggybag_debug', 'false');
        const result = await getDebugModeSetting();
        expect(result).toBe(false);
      });
    });

    describe('saveDebugMode', () => {
      it('saves to localStorage in browser mode', async () => {
        await saveDebugMode(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('doggybag_debug', 'true');

        await saveDebugMode(false);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('doggybag_debug', 'false');
      });
    });

    describe('toggleDebugMode', () => {
      it('toggles from false to true', async () => {
        const result = await toggleDebugMode();
        expect(result).toBe(true);
        expect(localStorageMock.setItem).toHaveBeenCalledWith('doggybag_debug', 'true');
      });

      it('toggles from true to false', async () => {
        localStorageMock.setItem('doggybag_debug', 'true');
        const result = await toggleDebugMode();
        expect(result).toBe(false);
      });
    });
  });

  describe('Devtools', () => {
    describe('toggleDevtools', () => {
      it('returns false in browser mode', async () => {
        const result = await toggleDevtools();
        expect(result).toBe(false);
      });
    });

    describe('openDevtools', () => {
      it('does nothing in browser mode', async () => {
        await expect(openDevtools()).resolves.toBeUndefined();
      });
    });

    describe('closeDevtools', () => {
      it('does nothing in browser mode', async () => {
        await expect(closeDevtools()).resolves.toBeUndefined();
      });
    });

    describe('isDevtoolsOpen', () => {
      it('returns false in browser mode', async () => {
        const result = await isDevtoolsOpen();
        expect(result).toBe(false);
      });
    });
  });
});
