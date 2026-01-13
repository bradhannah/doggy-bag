// Version Service - Tracks app version and triggers backups on version change

import { StorageServiceImpl, type StorageService } from './storage';
import { BackupServiceImpl, type BackupService } from './backup-service';
import { mkdir, readdir, unlink, stat, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Version resolution priority:
// 1. APP_VERSION env var (injected at compile time for production builds)
// 2. tauri.conf.json (source of truth in development)
// 3. package.json (fallback)
// 4. '0.0.0' (last resort)
let cachedVersion: string | null = null;

async function readVersionFromTauriConfig(): Promise<string> {
  if (cachedVersion) return cachedVersion;

  // Priority 1: Check for compile-time injected version (production builds)
  // Bun inlines process.env values at compile time when using --compile
  const envVersion = process.env.APP_VERSION;
  if (envVersion && envVersion !== 'undefined') {
    cachedVersion = envVersion;
    return cachedVersion;
  }

  try {
    // Priority 2: Try to find tauri.conf.json relative to the api directory
    // In development: ../src-tauri/tauri.conf.json
    // The API runs from /api/src, so we go up to project root
    const apiDir = dirname(fileURLToPath(import.meta.url));
    const projectRoot = join(apiDir, '..', '..', '..');
    const tauriConfigPath = join(projectRoot, 'src-tauri', 'tauri.conf.json');

    const content = await readFile(tauriConfigPath, 'utf-8');
    const config = JSON.parse(content) as { version: string };
    cachedVersion = config.version;
    return cachedVersion;
  } catch {
    // Priority 3: Fallback to root package.json
    try {
      const apiDir = dirname(fileURLToPath(import.meta.url));
      const projectRoot = join(apiDir, '..', '..', '..');
      const packageJsonPath = join(projectRoot, 'package.json');

      const content = await readFile(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(content) as { version: string };
      cachedVersion = pkg.version;
      return cachedVersion;
    } catch {
      // Priority 4: Last resort - return a default
      console.warn(
        '[VersionService] Could not read version from APP_VERSION, tauri.conf.json, or package.json'
      );
      cachedVersion = '0.0.0';
      return cachedVersion;
    }
  }
}

export interface VersionInfo {
  current: string;
  previous: string | null;
  lastChecked: string;
}

export interface VersionBackup {
  filename: string;
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  size: number;
  backupType: 'version_upgrade' | 'manual';
  note?: string; // Optional note for manual backups
}

export interface VersionCheckResult {
  versionChanged: boolean;
  previousVersion: string | null;
  currentVersion: string;
  backupCreated: boolean;
  backupPath?: string;
  error?: string;
}

export interface VersionService {
  getAppVersion(): Promise<string>;
  getVersionInfo(): Promise<VersionInfo>;
  checkVersionAndBackup(): Promise<VersionCheckResult>;
  createManualBackup(note?: string): Promise<string>;
  listVersionBackups(): Promise<VersionBackup[]>;
  restoreVersionBackup(filename: string): Promise<void>;
  deleteVersionBackup(filename: string): Promise<void>;
  pruneOldBackups(keepCount?: number, backupType?: 'version_upgrade' | 'manual'): Promise<string[]>;
}

export class VersionServiceImpl implements VersionService {
  private static instance: VersionServiceImpl | null = null;
  private storage: StorageService;
  private backup: BackupService;
  private readonly VERSION_FILE = 'version.json';
  private readonly BACKUPS_DIR = 'backups';
  private readonly MAX_VERSION_BACKUPS = 5;
  private readonly MAX_MANUAL_BACKUPS = 20;

  public static getInstance(): VersionService {
    if (!VersionServiceImpl.instance) {
      VersionServiceImpl.instance = new VersionServiceImpl();
    }
    return VersionServiceImpl.instance;
  }

  constructor() {
    this.storage = StorageServiceImpl.getInstance();
    this.backup = BackupServiceImpl.getInstance();
  }

  /**
   * Get the current app version.
   */
  async getAppVersion(): Promise<string> {
    return await readVersionFromTauriConfig();
  }

  /**
   * Get the version file path.
   */
  private getVersionFilePath(): string {
    const config = StorageServiceImpl.getConfig();
    return join(config.basePath, this.VERSION_FILE);
  }

  /**
   * Get the backups directory path.
   */
  private getBackupsDir(): string {
    const config = StorageServiceImpl.getConfig();
    return join(config.basePath, this.BACKUPS_DIR);
  }

  /**
   * Get stored version info.
   */
  async getVersionInfo(): Promise<VersionInfo> {
    const appVersion = await readVersionFromTauriConfig();
    try {
      const stored = await this.storage.readJSON<VersionInfo>(this.getVersionFilePath());
      if (stored) {
        return {
          ...stored,
          current: appVersion,
        };
      }
    } catch {
      // No version file yet
    }

    return {
      current: appVersion,
      previous: null,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Check if version changed and create backup if needed.
   * Call this on app startup.
   */
  async checkVersionAndBackup(): Promise<VersionCheckResult> {
    const appVersion = await readVersionFromTauriConfig();
    const result: VersionCheckResult = {
      versionChanged: false,
      previousVersion: null,
      currentVersion: appVersion,
      backupCreated: false,
    };

    try {
      // Read stored version
      let storedVersion: string | null = null;
      try {
        const versionData = await this.storage.readJSON<{ version: string }>(
          this.getVersionFilePath()
        );
        storedVersion = versionData?.version ?? null;
      } catch {
        // No version file - first run
      }

      result.previousVersion = storedVersion;

      // Check if version changed
      if (storedVersion && storedVersion !== appVersion) {
        result.versionChanged = true;
        console.log(`[VersionService] Version changed: ${storedVersion} -> ${appVersion}`);

        // Check if there's any data to backup
        const hasData = await this.hasExistingData();
        if (hasData) {
          // Create version backup
          const backupFilename = await this.createVersionBackup(storedVersion, appVersion);
          result.backupCreated = true;
          result.backupPath = backupFilename;

          // Prune old backups
          await this.pruneOldBackups();
        } else {
          console.log('[VersionService] No existing data to backup');
        }
      }

      // Update stored version
      await this.storage.writeJSON(this.getVersionFilePath(), {
        version: appVersion,
        previous: storedVersion,
        lastChecked: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VersionService] Version check failed:', errorMessage);
      result.error = errorMessage;
      return result;
    }
  }

  /**
   * Check if there's any existing data to backup.
   */
  private async hasExistingData(): Promise<boolean> {
    try {
      const config = StorageServiceImpl.getConfig();
      const [bills, incomes, paymentSources] = await Promise.all([
        this.storage.readJSON<unknown[]>(join(config.basePath, 'entities/bills.json')),
        this.storage.readJSON<unknown[]>(join(config.basePath, 'entities/incomes.json')),
        this.storage.readJSON<unknown[]>(join(config.basePath, 'entities/payment-sources.json')),
      ]);

      const hasEntities =
        (bills && bills.length > 0) ||
        (incomes && incomes.length > 0) ||
        (paymentSources && paymentSources.length > 0);

      return hasEntities ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Create a version backup.
   */
  private async createVersionBackup(fromVersion: string, toVersion: string): Promise<string> {
    const backupsDir = this.getBackupsDir();

    // Ensure backups directory exists
    await mkdir(backupsDir, { recursive: true });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `v${fromVersion}_to_v${toVersion}_${timestamp}.json`;

    // Export backup data
    const backupData = await this.backup.exportBackup();

    // Add version metadata
    const versionBackupData = {
      ...backupData,
      backup_type: 'version_upgrade',
      from_version: fromVersion,
      to_version: toVersion,
    };

    // Write backup file
    await this.storage.writeJSON(join(backupsDir, filename), versionBackupData);

    console.log(`[VersionService] Created backup: ${filename}`);
    return filename;
  }

  /**
   * Create a manual backup triggered by user.
   * @param note Optional note to include with the backup
   */
  async createManualBackup(note?: string): Promise<string> {
    const backupsDir = this.getBackupsDir();
    const appVersion = await readVersionFromTauriConfig();

    // Ensure backups directory exists
    await mkdir(backupsDir, { recursive: true });

    // Generate filename: manual_{timestamp}.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `manual_${timestamp}.json`;

    // Export backup data
    const backupData = await this.backup.exportBackup();

    // Add manual backup metadata (including optional note)
    const manualBackupData: Record<string, unknown> = {
      ...backupData,
      backup_type: 'manual',
      app_version: appVersion,
    };

    // Only include note if provided and non-empty
    if (note && note.trim()) {
      manualBackupData.note = note.trim();
    }

    // Write backup file
    await this.storage.writeJSON(join(backupsDir, filename), manualBackupData);

    // Prune old manual backups
    await this.pruneOldBackups(this.MAX_MANUAL_BACKUPS, 'manual');

    console.log(`[VersionService] Created manual backup: ${filename}`);
    return filename;
  }

  /**
   * List all version backups (both version upgrades and manual).
   */
  async listVersionBackups(): Promise<VersionBackup[]> {
    const backupsDir = this.getBackupsDir();

    try {
      const files = await readdir(backupsDir);
      const backups: VersionBackup[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        // Try to parse as version upgrade: v{from}_to_v{to}_{timestamp}.json
        const versionMatch = file.match(/^v(.+?)_to_v(.+?)_(.+)\.json$/);
        // Try to parse as manual backup: manual_{timestamp}.json
        const manualMatch = file.match(/^manual_(.+)\.json$/);

        if (!versionMatch && !manualMatch) continue;

        try {
          const filepath = join(backupsDir, file);
          const stats = await stat(filepath);

          if (versionMatch) {
            const [, fromVersion, toVersion, timestamp] = versionMatch;
            // Convert timestamp from filename format back to ISO format
            const isoTimestamp = timestamp.replace(
              /T(\d{2})-(\d{2})-(\d{2})-(\d+)Z$/,
              'T$1:$2:$3.$4Z'
            );

            backups.push({
              filename: file,
              fromVersion,
              toVersion,
              timestamp: isoTimestamp,
              size: stats.size,
              backupType: 'version_upgrade',
            });
          } else if (manualMatch) {
            const [, timestamp] = manualMatch;
            // Convert timestamp from filename format back to ISO format
            const isoTimestamp = timestamp.replace(
              /T(\d{2})-(\d{2})-(\d{2})-(\d+)Z$/,
              'T$1:$2:$3.$4Z'
            );

            // Try to read note from backup file
            let note: string | undefined;
            try {
              const backupContent = await this.storage.readJSON<{ note?: string }>(filepath);
              note = backupContent?.note;
            } catch {
              // Ignore errors reading note
            }

            backups.push({
              filename: file,
              fromVersion: '', // Manual backups don't have version info in filename
              toVersion: '',
              timestamp: isoTimestamp,
              size: stats.size,
              backupType: 'manual',
              note,
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort by timestamp descending (newest first)
      return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch {
      // Directory doesn't exist yet
      return [];
    }
  }

  /**
   * Restore from a version backup.
   */
  async restoreVersionBackup(filename: string): Promise<void> {
    const filepath = join(this.getBackupsDir(), filename);

    const backupData = await this.storage.readJSON<{
      bills: unknown[];
      incomes: unknown[];
      payment_sources: unknown[];
      categories: unknown[];
      months: unknown[];
      export_date: string;
    }>(filepath);

    if (!backupData) {
      throw new Error(`Backup file not found: ${filename}`);
    }

    // Validate backup has required fields
    if (!backupData.export_date || !Array.isArray(backupData.bills)) {
      throw new Error('Invalid backup file format');
    }

    // Use existing backup service to restore
    await this.backup.importBackup(backupData as Parameters<BackupService['importBackup']>[0]);

    console.log(`[VersionService] Restored from backup: ${filename}`);
  }

  /**
   * Delete a version backup.
   */
  async deleteVersionBackup(filename: string): Promise<void> {
    const filepath = join(this.getBackupsDir(), filename);

    await unlink(filepath);
    console.log(`[VersionService] Deleted backup: ${filename}`);
  }

  /**
   * Prune old backups, keeping only the most recent ones.
   * @param keepCount Number of backups to keep (defaults to MAX_VERSION_BACKUPS)
   * @param backupType Optional filter for backup type ('version_upgrade' or 'manual')
   */
  async pruneOldBackups(
    keepCount?: number,
    backupType?: 'version_upgrade' | 'manual'
  ): Promise<string[]> {
    const allBackups = await this.listVersionBackups();
    const deleted: string[] = [];

    // Filter by backup type if specified
    const backups = backupType ? allBackups.filter((b) => b.backupType === backupType) : allBackups;

    // Determine keep count based on backup type
    const limit =
      keepCount ?? (backupType === 'manual' ? this.MAX_MANUAL_BACKUPS : this.MAX_VERSION_BACKUPS);

    if (backups.length <= limit) {
      return deleted;
    }

    // Delete oldest backups (list is sorted newest first)
    const toDelete = backups.slice(limit);

    for (const backup of toDelete) {
      try {
        await this.deleteVersionBackup(backup.filename);
        deleted.push(backup.filename);
      } catch (error) {
        console.error(`[VersionService] Failed to delete backup ${backup.filename}:`, error);
      }
    }

    return deleted;
  }
}

// Singleton export
let versionServiceInstance: VersionService | null = null;

export function getVersionService(): VersionService {
  if (!versionServiceInstance) {
    versionServiceInstance = VersionServiceImpl.getInstance();
  }
  return versionServiceInstance;
}
