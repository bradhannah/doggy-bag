import {
  Controller,
  Route,
  Get,
  Post,
  Response,
  Tags,
} from 'tsoa';

// TODO: Implement in Phase 7 (User Story 2)
// Placeholder for OpenAPI spec generation

@Route('incomes')
@Tags('Incomes')
export class IncomesController extends Controller {
  @Get()
  @Response('200', 'OK')
  @Response('501', 'Not Implemented')
  public async getIncomes() {
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
  public async createIncome() {
    return {
      status: 'error',
      message: 'Not implemented yet'
    };
  }
}
