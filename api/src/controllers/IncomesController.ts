import {
  Controller,
  Route,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Path,
  Response,
  Tags,
  SuccessResponse,
  Example,
} from 'tsoa';
import type { Income } from '../types';
import type { CreateIncomeRequest, UpdateIncomeRequest, ApiError } from '../types/requests';

/**
 * Controller for managing recurring income definitions.
 * Incomes are templates that generate monthly instances.
 */
@Route('api/incomes')
@Tags('Incomes')
export class IncomesController extends Controller {
  /**
   * Get all income definitions
   * @summary List all incomes
   */
  @Get()
  @SuccessResponse(200, 'OK')
  @Example<Income[]>([
    {
      id: 'inc-123',
      name: 'Salary',
      amount: 500000,
      billing_period: 'bi_weekly',
      start_date: '2025-01-03',
      payment_source_id: 'ps-001',
      category_id: 'cat-employment',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ])
  public async getIncomes(): Promise<Income[]> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Create a new income definition
   * @summary Create an income
   */
  @Post()
  @SuccessResponse(201, 'Created')
  @Response<ApiError>(400, 'Bad Request')
  public async createIncome(@Body() _body: CreateIncomeRequest): Promise<Income> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Update an existing income definition
   * @summary Update an income
   * @param id The income ID
   */
  @Put('{id}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Bad Request')
  @Response<ApiError>(404, 'Not Found')
  public async updateIncome(
    @Path('id') _id: string,
    @Body() _body: UpdateIncomeRequest
  ): Promise<Income> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Delete an income definition
   * @summary Delete an income
   * @param id The income ID
   */
  @Delete('{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiError>(404, 'Not Found')
  public async deleteIncome(@Path('id') _id: string): Promise<void> {
    throw new Error('Not implemented - use existing handlers');
  }
}
