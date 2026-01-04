import { Controller, Route, Get, Post, Response, Body, Tags, SuccessResponse } from 'tsoa';
import type { UndoEntry } from '../types';
import type { ApiError } from '../types/requests';

/**
 * Controller for undo/redo operations
 */
@Route('api/undo')
@Tags('Undo')
export class UndoController extends Controller {
  /**
   * Get undo history (last 5 entries)
   * @summary Get undo history
   */
  @Get()
  @SuccessResponse(200, 'OK')
  public async getUndoHistory(): Promise<UndoEntry[]> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Perform undo operation (restore last change)
   * @summary Undo last change
   */
  @Post()
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Nothing to undo')
  public async undo(): Promise<{ success: boolean; message: string }> {
    throw new Error('Not implemented - use existing handlers');
  }
}
