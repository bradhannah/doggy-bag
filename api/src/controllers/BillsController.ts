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
import type { Bill } from '../types';
import type { CreateBillRequest, UpdateBillRequest, ApiError } from '../types/requests';

/**
 * Controller for managing recurring bill definitions.
 * Bills are templates that generate monthly instances.
 */
@Route('api/bills')
@Tags('Bills')
export class BillsController extends Controller {
  /**
   * Get all bill definitions
   * @summary List all bills
   */
  @Get()
  @SuccessResponse(200, 'OK')
  @Example<Bill[]>([
    {
      id: 'bill-123',
      name: 'Electric Bill',
      amount: 15000,
      billing_period: 'monthly',
      day_of_month: 15,
      payment_source_id: 'ps-001',
      category_id: 'cat-utilities',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ])
  public async getBills(): Promise<Bill[]> {
    // Implementation handled by existing route handlers
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Create a new bill definition
   * @summary Create a bill
   */
  @Post()
  @SuccessResponse(201, 'Created')
  @Response<ApiError>(400, 'Bad Request')
  @Example<Bill>({
    id: 'bill-123',
    name: 'Electric Bill',
    amount: 15000,
    billing_period: 'monthly',
    day_of_month: 15,
    payment_source_id: 'ps-001',
    category_id: 'cat-utilities',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  })
  public async createBill(@Body() _body: CreateBillRequest): Promise<Bill> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Update an existing bill definition
   * @summary Update a bill
   * @param id The bill ID
   */
  @Put('{id}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Bad Request')
  @Response<ApiError>(404, 'Not Found')
  public async updateBill(@Path() _id: string, @Body() _body: UpdateBillRequest): Promise<Bill> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Delete a bill definition
   * @summary Delete a bill
   * @param id The bill ID
   */
  @Delete('{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiError>(404, 'Not Found')
  public async deleteBill(@Path() _id: string): Promise<void> {
    throw new Error('Not implemented - use existing handlers');
  }
}
