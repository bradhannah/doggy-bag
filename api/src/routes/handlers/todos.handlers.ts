// Todos API Handlers
// Handles CRUD operations for Todo templates

import { TodosServiceImpl } from '../../services/todos-service';
import type { TodosService } from '../../services/todos-service';
import { TodoInstancesServiceImpl } from '../../services/todo-instances-service';
import type { TodoInstancesService } from '../../services/todo-instances-service';
import { formatErrorForUser } from '../../utils/errors';

const todosService: TodosService = new TodosServiceImpl();
const todoInstancesService: TodoInstancesService = new TodoInstancesServiceImpl();

/**
 * GET /api/todos - List all todos
 * GET /api/todos/:id - Get single todo
 */
export function createTodosHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Check if this is a single todo request: /api/todos/:id
      if (pathParts.length === 3 && pathParts[0] === 'api' && pathParts[1] === 'todos') {
        const id = pathParts[2];
        const todo = await todosService.getById(id);

        if (!todo) {
          return new Response(
            JSON.stringify({
              error: 'Todo not found',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 404,
            }
          );
        }

        return new Response(JSON.stringify(todo), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Check for active filter: /api/todos?active=true
      const activeFilter = url.searchParams.get('active');
      let todos;

      if (activeFilter === 'true') {
        todos = await todosService.getActive();
      } else {
        todos = await todosService.getAll();
      }

      return new Response(JSON.stringify(todos), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodosHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load todos',
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
 * POST /api/todos - Create new todo
 */
export function createTodosHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = todosService.validate(body);

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

      // Add default values for status and is_active if not provided
      const todoData = {
        ...body,
        status: body.status || 'pending',
        is_active: body.is_active !== undefined ? body.is_active : true,
      };

      const newTodo = await todosService.create(todoData);

      // Auto-generate instances for the current month (and future months if needed)
      // This ensures newly created todos immediately appear in the Todos view and Calendar
      if (newTodo.is_active !== false) {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        try {
          await todoInstancesService.syncInstancesForMonth(currentMonth);
          console.log(
            `[TodosHandler] Synced instances for ${currentMonth} after creating todo "${newTodo.title}"`
          );
        } catch (syncError) {
          // Log but don't fail the request - the todo was created successfully
          console.warn('[TodosHandler] Failed to sync instances after todo creation:', syncError);
        }
      }

      return new Response(JSON.stringify(newTodo), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[TodosHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create todo',
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
 * PUT /api/todos/:id - Update todo
 */
export function createTodosHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing todo ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedTodo = await todosService.update(id, body);

      if (!updatedTodo) {
        return new Response(
          JSON.stringify({
            error: 'Todo not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedTodo), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodosHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update todo',
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
 * DELETE /api/todos/:id - Delete todo
 * Query params:
 *   - deleteInstances=current - Delete template + instances from current month
 *   - deleteInstances=future - Delete template + instances from current and future months
 *   - (default) - Delete template only
 */
export function createTodosHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing todo ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Check for delete options
      const deleteInstances = url.searchParams.get('deleteInstances');
      let instancesDeleted = 0;
      let monthsAffected: string[] = [];

      if (deleteInstances === 'current' || deleteInstances === 'future') {
        // Delete instances from current month (and optionally future months)
        const result = await todoInstancesService.deleteInstancesByTodoId(id, {
          includeCurrentMonth: true,
          includeFutureMonths: deleteInstances === 'future',
        });
        instancesDeleted = result.deletedCount;
        monthsAffected = result.monthsAffected;
      }

      // Delete the template
      await todosService.delete(id);

      return new Response(
        JSON.stringify({
          success: true,
          instancesDeleted,
          monthsAffected,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error) {
      console.error('[TodosHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete todo',
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
 * POST /api/todos/:id/complete - Complete a todo template
 */
export function createTodosCompleteHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / todos / :id / complete
      const id = pathParts[2];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing todo ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const completedTodo = await todosService.complete(id);

      if (!completedTodo) {
        return new Response(
          JSON.stringify({
            error: 'Todo not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(completedTodo), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodosHandler] COMPLETE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to complete todo';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to complete todo',
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
 * POST /api/todos/:id/reopen - Reopen a completed todo template
 */
export function createTodosReopenHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Path: api / todos / :id / reopen
      const id = pathParts[2];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing todo ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const reopenedTodo = await todosService.reopen(id);

      if (!reopenedTodo) {
        return new Response(
          JSON.stringify({
            error: 'Todo not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(reopenedTodo), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodosHandler] REOPEN failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to reopen todo';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to reopen todo',
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
 * POST /api/todos/:id/activate - Activate a todo (enable instance generation)
 */
export function createTodosActivateHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[2];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing todo ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const activatedTodo = await todosService.activate(id);

      if (!activatedTodo) {
        return new Response(
          JSON.stringify({
            error: 'Todo not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(activatedTodo), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodosHandler] ACTIVATE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to activate todo';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to activate todo',
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
 * POST /api/todos/:id/deactivate - Deactivate a todo (disable instance generation)
 */
export function createTodosDeactivateHandler() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[2];

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing todo ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const deactivatedTodo = await todosService.deactivate(id);

      if (!deactivatedTodo) {
        return new Response(
          JSON.stringify({
            error: 'Todo not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(deactivatedTodo), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[TodosHandler] DEACTIVATE failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate todo';

      return new Response(
        JSON.stringify({
          error: errorMessage,
          message: 'Failed to deactivate todo',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  };
}
