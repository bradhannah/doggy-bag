// Todo Instances API Handlers
// Handles CRUD operations for TodoInstances within a specific month

import { TodoInstancesServiceImpl } from '../../services/todo-instances-service';
import type { TodoInstancesService } from '../../services/todo-instances-service';
import { formatErrorForUser } from '../../utils/errors';

const todoInstancesService: TodoInstancesService = new TodoInstancesServiceImpl();

/**
 * GET /api/months/:month/todos - List all todo instances for a month
 * GET /api/months/:month/todos?status=pending - Filter by status
 * GET /api/months/:month/todos?status=completed - Filter by status
 * GET /api/months/:month/todos?status=overdue - Get overdue items
 */
export function createTodoInstancesHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / months / :month / todos / [:id]
      const month = pathParts[2];

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Missing month parameter',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check if this is a single instance request: /api/months/:month/todos/:id
      if (pathParts.length === 5 && pathParts[3] === 'todos') {
        const instanceId = pathParts[4];
        const instance = await todoInstancesService.getById(month, instanceId);

        if (!instance) {
          return new Response(
            JSON.stringify({
              error: 'Todo instance not found',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 404,
            }
          );
        }

        return new Response(JSON.stringify(instance), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Check for status filter
      const statusFilter = url.searchParams.get('status');
      let instances;

      switch (statusFilter) {
        case 'pending':
          instances = await todoInstancesService.getPending(month);
          break;
        case 'completed':
          instances = await todoInstancesService.getCompleted(month);
          break;
        case 'overdue':
          instances = await todoInstancesService.getOverdue(month);
          break;
        default:
          instances = await todoInstancesService.getForMonth(month);
      }

      return new Response(JSON.stringify(instances), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load todo instances',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

/**
 * POST /api/months/:month/todos - Create ad-hoc todo instance
 */
export function createTodoInstancesHandlerPOST() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const month = pathParts[2];

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Missing month parameter',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const validation = todoInstancesService.validate(body);

      if (!validation.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validation.errors,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const newInstance = await todoInstancesService.createAdhoc(month, body);

      return new Response(JSON.stringify(newInstance), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create todo instance',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

/**
 * PUT /api/months/:month/todos/:id - Update todo instance
 */
export function createTodoInstancesHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / months / :month / todos / :id
      const month = pathParts[2];
      const instanceId = pathParts[4];

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Missing month or instance ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedInstance = await todoInstancesService.update(month, instanceId, body);

      if (!updatedInstance) {
        return new Response(
          JSON.stringify({
            error: 'Todo instance not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedInstance), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update todo instance',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

/**
 * DELETE /api/months/:month/todos/:id - Delete todo instance
 */
export function createTodoInstancesHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const month = pathParts[2];
      const instanceId = pathParts[4];

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Missing month or instance ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await todoInstancesService.delete(month, instanceId);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete todo instance',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}

/**
 * POST /api/months/:month/todos/:id/complete - Complete a todo instance
 */
export function createTodoInstancesCompleteHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / months / :month / todos / :id / complete
      const month = pathParts[2];
      const instanceId = pathParts[4];

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Missing month or instance ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const completedInstance = await todoInstancesService.complete(month, instanceId);

      if (!completedInstance) {
        return new Response(
          JSON.stringify({
            error: 'Todo instance not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(completedInstance), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] COMPLETE failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to complete todo instance';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to complete todo instance',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}

/**
 * POST /api/months/:month/todos/:id/reopen - Reopen a completed todo instance
 */
export function createTodoInstancesReopenHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / months / :month / todos / :id / reopen
      const month = pathParts[2];
      const instanceId = pathParts[4];

      if (!month || !instanceId) {
        return new Response(
          JSON.stringify({
            error: 'Missing month or instance ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const reopenedInstance = await todoInstancesService.reopen(month, instanceId);

      if (!reopenedInstance) {
        return new Response(
          JSON.stringify({
            error: 'Todo instance not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(reopenedInstance), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] REOPEN failed:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reopen todo instance';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to reopen todo instance',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}

/**
 * POST /api/months/:month/todos/sync - Sync todo instances for a month
 * Generates instances from active todos without overwriting existing ones
 */
export function createTodoInstancesSyncHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / months / :month / todos / sync
      const month = pathParts[2];

      if (!month) {
        return new Response(
          JSON.stringify({
            error: 'Missing month parameter',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Validate month format
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid month format. Expected YYYY-MM',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const instances = await todoInstancesService.syncInstancesForMonth(month);

      return new Response(JSON.stringify(instances), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodoInstancesHandler] SYNC failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to sync todo instances',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
