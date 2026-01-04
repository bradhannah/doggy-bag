import {
  Controller,
  Route,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Path,
  Query,
  Response,
  Tags,
  SuccessResponse,
  Example
} from 'tsoa';
import type { MonthlyData, DetailedMonthResponse } from '../types';
import type { 
  UpdateBankBalancesRequest, 
  GenerateMonthRequest,
  LockMonthRequest,
  ApiError 
} from '../types/requests';

interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  leftover: number;
  isLocked: boolean;
}

interface MonthListItem {
  month: string;
  exists: boolean;
  isLocked: boolean;
}

interface MonthExistsResponse {
  exists: boolean;
  isLocked: boolean;
}

/**
 * Controller for managing monthly budget data.
 * Handles month generation, detailed views, and bank balances.
 */
@Route('api/months')
@Tags('Months')
export class MonthsController extends Controller {
  
  /**
   * List all available months
   * @summary List months
   */
  @Get()
  @SuccessResponse(200, 'OK')
  public async listMonths(): Promise<MonthListItem[]> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Get monthly data for a specific month
   * @summary Get month data
   * @param month Month in YYYY-MM format
   */
  @Get('{month}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(404, 'Not Found')
  public async getMonth(
    @Path() month: string
  ): Promise<MonthlyData> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Get detailed view for a month (used by the main UI)
   * @summary Get detailed month view
   * @param month Month in YYYY-MM format
   */
  @Get('detailed/{month}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(404, 'Not Found')
  public async getDetailedMonth(
    @Path() month: string
  ): Promise<DetailedMonthResponse> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Get month summary (income, expenses, leftover)
   * @summary Get month summary
   * @param month Month in YYYY-MM format
   */
  @Get('summary/{month}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(404, 'Not Found')
  public async getMonthSummary(
    @Path() month: string
  ): Promise<MonthSummary> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Check if a month exists
   * @summary Check month exists
   * @param month Month in YYYY-MM format
   */
  @Get('exists/{month}')
  @SuccessResponse(200, 'OK')
  public async monthExists(
    @Path() month: string
  ): Promise<MonthExistsResponse> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Get month management info
   * @summary Get manage info
   */
  @Get('manage')
  @SuccessResponse(200, 'OK')
  public async getManageInfo(): Promise<{ months: MonthListItem[] }> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Generate a new month from bill/income templates
   * @summary Generate month
   * @param month Month in YYYY-MM format
   */
  @Post('generate/{month}')
  @SuccessResponse(201, 'Created')
  @Response<ApiError>(400, 'Bad Request')
  public async generateMonth(
    @Path() month: string,
    @Body() body?: GenerateMonthRequest
  ): Promise<MonthlyData> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Create a month (same as generate)
   * @summary Create month
   * @param month Month in YYYY-MM format
   */
  @Post('create/{month}')
  @SuccessResponse(201, 'Created')
  @Response<ApiError>(400, 'Bad Request')
  public async createMonth(
    @Path() month: string
  ): Promise<MonthlyData> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Sync month with current bill/income templates
   * @summary Sync month
   * @param month Month in YYYY-MM format
   */
  @Post('sync/{month}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(404, 'Not Found')
  public async syncMonth(
    @Path() month: string
  ): Promise<MonthlyData> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Lock or unlock a month
   * @summary Lock/unlock month
   * @param month Month in YYYY-MM format
   */
  @Post('lock/{month}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(404, 'Not Found')
  public async lockMonth(
    @Path() month: string,
    @Body() body: LockMonthRequest
  ): Promise<MonthlyData> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Update bank balances for a month
   * @summary Update bank balances
   * @param month Month in YYYY-MM format
   */
  @Put('bank-balances/{month}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(404, 'Not Found')
  public async updateBankBalances(
    @Path() month: string,
    @Body() body: UpdateBankBalancesRequest
  ): Promise<MonthlyData> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Delete a month
   * @summary Delete month
   * @param month Month in YYYY-MM format
   */
  @Delete('{month}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiError>(404, 'Not Found')
  public async deleteMonth(
    @Path() month: string
  ): Promise<void> {
    throw new Error('Not implemented - use existing handlers');
  }
}
