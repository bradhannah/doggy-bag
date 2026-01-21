// Projections API Handlers

import { ProjectionsService, ProjectionsServiceImpl } from '../../services/projections-service';
import { formatErrorForUser } from '../../utils/errors';

const projectionsService: ProjectionsService = new ProjectionsServiceImpl();

export function createProjectionsHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const month = url.searchParams.get('month');

      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid or missing month parameter (format: YYYY-MM)',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const projection = await projectionsService.getProjection(month);

      return new Response(JSON.stringify(projection), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[ProjectionsHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load projections',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
