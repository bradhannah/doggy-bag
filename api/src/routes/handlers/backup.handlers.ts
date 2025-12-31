// Backup Handlers - Export and import backup functionality

import { BackupServiceImpl } from '../../services/backup-service';
import type { BackupFileData } from '../../types';

const backupService = BackupServiceImpl.getInstance();

/**
 * GET /api/backup - Export all data as JSON backup
 */
export function createBackupHandlerGET() {
  return async (req: Request): Promise<Response> => {
    try {
      const backupData = await backupService.exportBackup();
      
      return new Response(JSON.stringify(backupData), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="budgetforfun-backup-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } catch (error) {
      console.error('Error exporting backup:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to export backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * POST /api/backup - Import data from backup JSON
 */
export function createBackupHandlerPOST() {
  return async (req: Request): Promise<Response> => {
    try {
      const body = await req.json() as BackupFileData;
      
      // Validate the backup data first
      const validation = backupService.validateBackup(body);
      if (!validation.isValid) {
        return new Response(JSON.stringify({ 
          error: 'Invalid backup data',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Import the backup
      await backupService.importBackup(body);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Backup imported successfully',
        imported: {
          bills: body.bills?.length || 0,
          incomes: body.incomes?.length || 0,
          payment_sources: body.payment_sources?.length || 0,
          categories: body.categories?.length || 0
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error importing backup:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to import backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * POST /api/backup/validate - Validate backup file structure without importing
 */
export function createBackupHandlerValidate() {
  return async (req: Request): Promise<Response> => {
    try {
      const body = await req.json() as BackupFileData;
      const validation = backupService.validateBackup(body);
      
      return new Response(JSON.stringify({
        isValid: validation.isValid,
        errors: validation.errors,
        summary: validation.isValid ? {
          bills: body.bills?.length || 0,
          incomes: body.incomes?.length || 0,
          payment_sources: body.payment_sources?.length || 0,
          categories: body.categories?.length || 0,
          export_date: body.export_date
        } : null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error validating backup:', error);
      return new Response(JSON.stringify({ 
        isValid: false,
        errors: ['Failed to parse backup file: ' + (error instanceof Error ? error.message : 'Unknown error')]
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}
