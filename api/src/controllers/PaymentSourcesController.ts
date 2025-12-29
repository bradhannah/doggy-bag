import {
  Controller,
  Route,
  Get,
  Post,
  Response,
  Tags,
} from 'tsoa';

// TODO: Implement in Phase 5 (User Story 0)
// Placeholder for OpenAPI spec generation

@Route('payment-sources')
@Tags('Payment Sources')
export class PaymentSourcesController extends Controller {
  @Get()
  @Response('200', 'OK')
  @Response('501', 'Not Implemented')
  public async getPaymentSources() {
    return {
      status: 'error',
      message: 'Not implemented yet',
      data: []
    };
  }

  @Post()
  @Response('201', 'Created')
  @Response('400', 'Bad Request')
  @Response('501', 'Not Implemented')
  public async createPaymentSource() {
    return {
      status: 'error',
      message: 'Not implemented yet'
    };
  }
}
