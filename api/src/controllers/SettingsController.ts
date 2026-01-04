import { Controller, Route, Get, Post, Body, Response, Tags, SuccessResponse } from 'tsoa';
import type {
  MigrateDataRequest,
  SwitchDirectoryRequest,
  ValidateDirectoryRequest,
  ApiError,
} from '../types/requests';
import type {
  SettingsResponse,
  DataDirectoryResponse,
  DirectoryValidation,
  MigrationResult,
} from '../models/settings';

/**
 * Controller for application settings
 */
@Route('api/settings')
@Tags('Settings')
export class SettingsController extends Controller {
  /**
   * Get current application settings
   * @summary Get settings
   */
  @Get()
  @SuccessResponse(200, 'OK')
  public async getSettings(): Promise<SettingsResponse> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Get current data directory configuration
   * @summary Get data directory
   */
  @Get('data-directory')
  @SuccessResponse(200, 'OK')
  public async getDataDirectory(): Promise<DataDirectoryResponse> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Validate a directory for use as data storage
   * @summary Validate directory
   */
  @Post('validate-directory')
  @SuccessResponse(200, 'OK')
  public async validateDirectory(
    @Body() body: ValidateDirectoryRequest
  ): Promise<DirectoryValidation> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Migrate data to a new directory
   * @summary Migrate data
   */
  @Post('migrate-data')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Migration failed')
  public async migrateData(@Body() body: MigrateDataRequest): Promise<MigrationResult> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Switch to a different data directory
   * @summary Switch directory
   */
  @Post('switch-directory')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Switch failed')
  public async switchDirectory(
    @Body() body: SwitchDirectoryRequest
  ): Promise<{ success: boolean; message: string }> {
    throw new Error('Not implemented - use existing handlers');
  }
}
