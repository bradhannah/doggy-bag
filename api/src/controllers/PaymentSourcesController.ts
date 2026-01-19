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
import type { PaymentSource } from '../types';
import type {
  CreatePaymentSourceRequest,
  UpdatePaymentSourceRequest,
  ApiError,
} from '../types/requests';

/**
 * Controller for managing payment sources (bank accounts, credit cards, etc.)
 */
@Route('api/payment-sources')
@Tags('Payment Sources')
export class PaymentSourcesController extends Controller {
  /**
   * Get all payment sources
   * @summary List all payment sources
   */
  @Get()
  @SuccessResponse(200, 'OK')
  @Example<PaymentSource[]>([
    {
      id: 'ps-001',
      name: 'Checking Account',
      type: 'bank_account',
      is_active: true,
      exclude_from_leftover: false,
      pay_off_monthly: false,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ])
  public async getPaymentSources(): Promise<PaymentSource[]> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Create a new payment source
   * @summary Create a payment source
   */
  @Post()
  @SuccessResponse(201, 'Created')
  @Response<ApiError>(400, 'Bad Request')
  public async createPaymentSource(
    @Body() _body: CreatePaymentSourceRequest
  ): Promise<PaymentSource> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Update an existing payment source
   * @summary Update a payment source
   * @param id The payment source ID
   */
  @Put('{id}')
  @SuccessResponse(200, 'OK')
  @Response<ApiError>(400, 'Bad Request')
  @Response<ApiError>(404, 'Not Found')
  public async updatePaymentSource(
    @Path('id') _id: string,
    @Body() _body: UpdatePaymentSourceRequest
  ): Promise<PaymentSource> {
    throw new Error('Not implemented - use existing handlers');
  }

  /**
   * Delete a payment source
   * @summary Delete a payment source
   * @param id The payment source ID
   */
  @Delete('{id}')
  @SuccessResponse(204, 'No Content')
  @Response<ApiError>(404, 'Not Found')
  public async deletePaymentSource(@Path('id') _id: string): Promise<void> {
    throw new Error('Not implemented - use existing handlers');
  }
}
