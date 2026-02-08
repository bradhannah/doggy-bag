// Backup Handlers - Export and import backup functionality

import { BackupServiceImpl } from '../../services/backup-service';
import { getVersionService } from '../../services/version-service';
import type { BackupFileData } from '../../types';

const backupService = BackupServiceImpl.getInstance();

/**
 * GET /api/backup - Export all data as JSON backup
 */
export function createBackupHandlerGET() {
  return async (_req: Request): Promise<Response> => {
    try {
      const backupData = await backupService.exportBackup();

      return new Response(JSON.stringify(backupData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="doggybag-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } catch (error) {
      console.error('Error exporting backup:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to export backup',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/backup - Import data from backup JSON
 */
export function createBackupHandlerPOST() {
  return async (req: Request): Promise<Response> => {
    try {
      const body = (await req.json()) as BackupFileData;

      // Validate the backup data first
      const validation = backupService.validateBackup(body);
      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Invalid backup data',
            details: validation.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Import the backup
      await backupService.importBackup(body);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Backup imported successfully',
          imported: {
            bills: body.bills?.length || 0,
            incomes: body.incomes?.length || 0,
            payment_sources: body.payment_sources?.length || 0,
            categories: body.categories?.length || 0,
            months: body.months?.length || 0,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error importing backup:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to import backup',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/backup/validate - Validate backup file structure without importing
 */
export function createBackupHandlerValidate() {
  return async (req: Request): Promise<Response> => {
    try {
      const body = (await req.json()) as BackupFileData;
      const validation = backupService.validateBackup(body);

      return new Response(
        JSON.stringify({
          isValid: validation.isValid,
          errors: validation.errors,
          summary: validation.isValid
            ? {
                bills: body.bills?.length || 0,
                incomes: body.incomes?.length || 0,
                payment_sources: body.payment_sources?.length || 0,
                categories: body.categories?.length || 0,
                months: body.months?.length || 0,
                export_date: body.export_date,
              }
            : null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error validating backup:', error);
      return new Response(
        JSON.stringify({
          isValid: false,
          errors: [
            'Failed to parse backup file: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
          ],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

// ============================================================================
// Version Backup Handlers
// ============================================================================

/**
 * GET /api/version - Get current app version info
 */
export function createVersionHandlerGET() {
  const versionService = getVersionService();
  return async (_req: Request): Promise<Response> => {
    try {
      const versionInfo = await versionService.getVersionInfo();
      return new Response(JSON.stringify(versionInfo), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error getting version info:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to get version info',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/version/check - Check version and create backup if needed
 * Call this on app startup
 */
export function createVersionCheckHandler() {
  const versionService = getVersionService();
  return async (_req: Request): Promise<Response> => {
    try {
      const result = await versionService.checkVersionAndBackup();
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error checking version:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to check version',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * GET /api/version/backups - List all version backups
 */
export function createVersionBackupsListHandler() {
  const versionService = getVersionService();
  return async (_req: Request): Promise<Response> => {
    try {
      const backups = await versionService.listVersionBackups();
      return new Response(JSON.stringify(backups), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error listing version backups:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to list version backups',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/version/backups/:filename/restore - Restore from a version backup
 */
export function createVersionBackupRestoreHandler() {
  const versionService = getVersionService();
  return async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/version/backups/:filename/restore
      const filenameIndex = pathParts.indexOf('backups') + 1;
      const filename = decodeURIComponent(pathParts[filenameIndex]);

      if (!filename) {
        return new Response(JSON.stringify({ error: 'Filename is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await versionService.restoreVersionBackup(filename);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Restored from backup: ${filename}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error restoring version backup:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to restore backup',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * DELETE /api/version/backups/:filename - Delete a version backup
 */
export function createVersionBackupDeleteHandler() {
  const versionService = getVersionService();
  return async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      // Path: /api/version/backups/:filename
      const filename = decodeURIComponent(pathParts[pathParts.length - 1]);

      if (!filename) {
        return new Response(JSON.stringify({ error: 'Filename is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await versionService.deleteVersionBackup(filename);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Deleted backup: ${filename}`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error deleting version backup:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to delete backup',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * POST /api/version/backups/manual - Create a manual backup
 */
export function createManualBackupHandler() {
  const versionService = getVersionService();
  return async (req: Request): Promise<Response> => {
    try {
      // Parse optional note from request body
      let note: string | undefined;
      try {
        const body = (await req.json()) as { note?: string };
        note = body?.note;
      } catch {
        // No body or invalid JSON - that's fine, note is optional
      }

      const filename = await versionService.createManualBackup(note);

      return new Response(
        JSON.stringify({
          success: true,
          filename,
          message: 'Manual backup created successfully',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error creating manual backup:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to create manual backup',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
