import {
  Controller,
  Route,
  Get,
  Post,
  Response,
  Tags,
} from 'tsoa';

// TODO: Implement in Phase 5 (User Story 1)
// Placeholder for OpenAPI spec generation

@Route('bills')
@Tags('Bills')
export class BillsController extends Controller {
  @Get()
  @Response('200', 'OK')
  @Response('501', 'Not Implemented')
  public async getBills() {
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
  public async createBill() {
    return {
      status: 'error',
      message: 'Not implemented yet'
    };
  }
}
