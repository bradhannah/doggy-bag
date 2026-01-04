// Settings API handlers

import { getSettingsService } from '../../services/settings-service';
import { StorageServiceImpl } from '../../services/storage';
import type { MigrationRequest } from '../../models/settings';

const settingsService = getSettingsService();

/**
 * GET /api/settings
 * Returns current application settings.
 */
export async function getSettings(_req: Request): Promise<Response> {
  try {
    const settings = settingsService.getSettings();
    return new Response(JSON.stringify(settings), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * GET /api/settings/data-directory
 * Returns current data directory configuration.
 */
export async function getDataDirectory(_req: Request): Promise<Response> {
  try {
    const dataDir = await settingsService.getDataDirectory();
    return new Response(JSON.stringify(dataDir), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /api/settings/validate-directory
 * Validates a directory for use as data storage.
 */
export async function validateDirectory(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { path?: string };

    if (!body.path) {
      return new Response(JSON.stringify({ error: 'path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validation = await settingsService.validateDirectory(body.path);
    return new Response(JSON.stringify(validation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /api/settings/migrate-data
 * Migrates data from one directory to another.
 */
export async function migrateData(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as MigrationRequest;

    if (!body.sourceDir || !body.destDir || !body.mode) {
      return new Response(
        JSON.stringify({
          error: 'sourceDir, destDir, and mode are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['copy', 'fresh', 'use_existing'].includes(body.mode)) {
      return new Response(
        JSON.stringify({
          error: 'mode must be one of: copy, fresh, use_existing',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await settingsService.migrateData(body.sourceDir, body.destDir, body.mode);

    // If migration was successful, switch the storage service to use the new directory
    if (result.success) {
      StorageServiceImpl.switchDataDirectory(body.destDir);
    }

    const status = result.success ? 200 : 500;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /api/settings/switch-directory
 * Switches the data directory at runtime (for development mode).
 * In production, the app should be restarted instead.
 */
export async function switchDirectory(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { path?: string };

    if (!body.path) {
      return new Response(JSON.stringify({ error: 'path is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate the directory first
    const validation = await settingsService.validateDirectory(body.path);

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error || 'Directory is not valid',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Switch the storage service to use the new directory
    StorageServiceImpl.switchDataDirectory(body.path);

    return new Response(
      JSON.stringify({
        success: true,
        dataDirectory: body.path,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
