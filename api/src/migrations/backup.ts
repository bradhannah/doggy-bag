/**
 * Backup utility for user data
 * Creates timestamped backups before migrations
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  filesBackedUp?: number;
}

/**
 * Creates a timestamped backup of the data directory
 * @param dataDir - Path to the data directory
 * @param backupDir - Path to store backups (defaults to dataDir/../backups)
 * @param reason - Reason for backup (e.g., 'pre-migration', 'manual')
 */
export function createBackup(
  dataDir: string,
  backupDir?: string,
  reason: string = 'manual'
): BackupResult {
  try {
    // Verify data directory exists
    if (!existsSync(dataDir)) {
      return {
        success: false,
        error: `Data directory does not exist: ${dataDir}`,
      };
    }

    // Create backup directory if it doesn't exist
    const backupRoot = backupDir || join(dataDir, '..', 'backups');
    if (!existsSync(backupRoot)) {
      mkdirSync(backupRoot, { recursive: true });
    }

    // Create timestamped backup folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${reason}_${timestamp}`;
    const backupPath = join(backupRoot, backupName);
    mkdirSync(backupPath, { recursive: true });

    // Copy all JSON files from data directory
    const files = readdirSync(dataDir);
    let filesBackedUp = 0;

    for (const file of files) {
      const sourcePath = join(dataDir, file);
      const stat = statSync(sourcePath);

      // Only backup files (not directories) that are JSON
      if (stat.isFile() && file.endsWith('.json')) {
        const destPath = join(backupPath, file);
        copyFileSync(sourcePath, destPath);
        filesBackedUp++;
      }
    }

    // Also backup monthly data subdirectory if it exists
    const monthlyDir = join(dataDir, 'months');
    if (existsSync(monthlyDir)) {
      const monthlyBackupDir = join(backupPath, 'months');
      mkdirSync(monthlyBackupDir, { recursive: true });

      const monthlyFiles = readdirSync(monthlyDir);
      for (const file of monthlyFiles) {
        const sourcePath = join(monthlyDir, file);
        const stat = statSync(sourcePath);

        if (stat.isFile() && file.endsWith('.json')) {
          const destPath = join(monthlyBackupDir, file);
          copyFileSync(sourcePath, destPath);
          filesBackedUp++;
        }
      }
    }

    return {
      success: true,
      backupPath,
      filesBackedUp,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during backup',
    };
  }
}

/**
 * Lists available backups
 * @param backupDir - Path to the backups directory
 */
export function listBackups(backupDir: string): string[] {
  if (!existsSync(backupDir)) {
    return [];
  }

  const entries = readdirSync(backupDir);
  return entries
    .filter((entry) => {
      const path = join(backupDir, entry);
      return statSync(path).isDirectory();
    })
    .sort()
    .reverse(); // Most recent first
}

/**
 * Gets the most recent backup path
 * @param backupDir - Path to the backups directory
 */
export function getLatestBackup(backupDir: string): string | null {
  const backups = listBackups(backupDir);
  return backups.length > 0 ? join(backupDir, backups[0]) : null;
}
