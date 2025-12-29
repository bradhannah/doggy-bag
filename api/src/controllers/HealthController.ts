import {
  Controller,
  Route,
  Get,
  SuccessResponse,
  Response,
  Tags,
} from 'tsoa';

interface HealthResponse {
  status: string;
  timestamp: string;
}

@Route('health')
@Tags('Health')
export class HealthController extends Controller {
  @SuccessResponse('200', 'OK')
  @Get()
  public async getHealth(): Promise<HealthResponse> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
