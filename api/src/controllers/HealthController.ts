import { Controller, Route, Get, SuccessResponse, Tags } from 'tsoa';

interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
}

/**
 * Health check endpoint for monitoring
 */
@Route('api/health')
@Tags('Health')
export class HealthController extends Controller {
  /**
   * Check API health status
   * @summary Health check
   */
  @SuccessResponse(200, 'OK')
  @Get()
  public async getHealth(): Promise<HealthResponse> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
