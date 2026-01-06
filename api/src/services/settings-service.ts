// Settings Service - Manages application settings and data directory configuration

import { StorageServiceImpl, type StorageService } from './storage';
import type {
  SettingsResponse,
  DataDirectoryResponse,
  DirectoryValidation,
  MigrationResult,
  MigrationMode,
} from '../models/settings';
import { access, constants, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Application version
const APP_VERSION = '0.1.0';

export class SettingsService {
  private storage: StorageService;

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
  }

  /**
   * Get current application settings.
   */
  getSettings(): SettingsResponse {
    const config = StorageServiceImpl.getConfig();
    return {
      dataDirectory: config.basePath,
      isDevelopment: config.isDevelopment,
      version: APP_VERSION,
    };
  }

  /**
   * Get current data directory configuration.
   */
  async getDataDirectory(): Promise<DataDirectoryResponse> {
    const config = StorageServiceImpl.getConfig();
    const isWritable = await this.checkWritable(config.basePath);

    return {
      path: config.basePath,
      entitiesDir: config.entitiesDir,
      monthsDir: config.monthsDir,
      isDevelopment: config.isDevelopment,
      isWritable,
    };
  }

  /**
   * Check if a directory is writable.
   */
  private async checkWritable(path: string): Promise<boolean> {
    try {
      await access(path, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate a directory for use as data storage.
   */
  async validateDirectory(path: string): Promise<DirectoryValidation> {
    const result: DirectoryValidation = {
      isValid: false,
      exists: false,
      isWritable: false,
      hasExistingData: false,
      existingFiles: [],
    };

    // Check if path is empty or invalid
    if (!path || typeof path !== 'string') {
      result.error = 'Invalid path: path is required';
      return result;
    }

    // Check if directory exists
    try {
      await access(path, constants.F_OK);
      result.exists = true;
    } catch {
      result.exists = false;
      // Directory doesn't exist - that's okay, we can create it
      // Check if parent directory is writable
      try {
        const parentPath = join(path, '..');
        await access(parentPath, constants.W_OK);
        result.isWritable = true;
      } catch {
        result.error = 'Cannot create directory: parent directory is not writable';
        return result;
      }
    }

    // Check if directory is writable (if it exists)
    if (result.exists) {
      try {
        await access(path, constants.W_OK);
        result.isWritable = true;
      } catch {
        result.error = 'Permission denied: directory is not writable';
        return result;
      }
    }

    // Check for existing data
    if (result.exists) {
      const entitiesDir = join(path, 'entities');
      const monthsDir = join(path, 'months');

      try {
        const entityFiles = await this.storage.listFiles(entitiesDir);
        const monthFiles = await this.storage.listFiles(monthsDir);

        result.existingFiles = [
          ...entityFiles.map((f) => `entities/${f}`),
          ...monthFiles.map((f) => `months/${f}`),
        ];

        result.hasExistingData = result.existingFiles.length > 0;
      } catch {
        // No existing data directories - that's fine
      }
    }

    result.isValid = result.isWritable || !result.exists;
    return result;
  }

  /**
   * Migrate data from one directory to another.
   */
  async migrateData(
    sourceDir: string,
    destDir: string,
    mode: MigrationMode
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      entityFilesCopied: 0,
      monthFilesCopied: 0,
      filesCopied: [],
      sourceDir,
      destDir,
    };

    // Note: We no longer block migration based on "development mode".
    // The frontend controls access (only available in Tauri desktop app).
    // This allows migration to work regardless of whether DATA_DIR was set on startup.

    // Validate destination directory
    const validation = await this.validateDirectory(destDir);
    if (!validation.isValid) {
      result.error = validation.error || 'Destination directory is not valid';
      return result;
    }

    try {
      // Create destination directories
      const destEntities = join(destDir, 'entities');
      const destMonths = join(destDir, 'months');

      await mkdir(destEntities, { recursive: true });
      await mkdir(destMonths, { recursive: true });

      if (mode === 'fresh') {
        // Create empty data files
        const emptyEntities = [
          'bills.json',
          'incomes.json',
          'categories.json',
          'payment-sources.json',
        ];
        for (const file of emptyEntities) {
          await writeFile(join(destEntities, file), '[]', 'utf-8');
          result.filesCopied.push(`entities/${file}`);
          result.entityFilesCopied++;
        }
        result.success = true;
        return result;
      }

      if (mode === 'use_existing') {
        // Just validate that data exists at destination
        if (!validation.hasExistingData) {
          result.error = 'No existing data found at destination';
          return result;
        }
        result.success = true;
        return result;
      }

      // mode === 'copy': Copy all data from source to destination
      const sourceEntities = join(sourceDir, 'entities');
      const sourceMonths = join(sourceDir, 'months');

      // Copy entity files
      try {
        const entityFiles = await this.storage.listFiles(sourceEntities);
        for (const file of entityFiles) {
          const srcPath = join(sourceEntities, file);
          const destPath = join(destEntities, file);
          await this.storage.copyFile(srcPath, destPath);
          result.filesCopied.push(`entities/${file}`);
          result.entityFilesCopied++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        result.error = `Failed to copy entity files: ${errorMessage}`;
        return result;
      }

      // Copy month files
      try {
        const monthFiles = await this.storage.listFiles(sourceMonths);
        for (const file of monthFiles) {
          const srcPath = join(sourceMonths, file);
          const destPath = join(destMonths, file);
          await this.storage.copyFile(srcPath, destPath);
          result.filesCopied.push(`months/${file}`);
          result.monthFilesCopied++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        result.error = `Failed to copy month files: ${errorMessage}`;
        return result;
      }

      result.success = true;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      result.error = `Migration failed: ${errorMessage}`;
      return result;
    }
  }
}

// Singleton instance
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService();
  }
  return settingsServiceInstance;
}
