// Notes API Handlers
// Handles CRUD operations for quick notes

import { NotesServiceImpl } from '../../services/notes-service';
import type { NotesService } from '../../services/notes-service';
import { formatErrorForUser } from '../../utils/errors';

const notesService: NotesService = new NotesServiceImpl();

/**
 * GET /api/notes - List all notes (newest first)
 * GET /api/notes/:id - Get single note
 */
export function createNotesHandlerGET() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      // Check if this is a single note request: /api/notes/:id
      if (pathParts.length === 3 && pathParts[0] === 'api' && pathParts[1] === 'notes') {
        const id = pathParts[2];
        const note = await notesService.getById(id);

        if (!note) {
          return new Response(
            JSON.stringify({
              error: 'Note not found',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 404,
            }
          );
        }

        return new Response(JSON.stringify(note), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const notes = await notesService.getAll();

      return new Response(JSON.stringify(notes), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[NotesHandler] GET failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to load notes',
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
 * POST /api/notes - Create new note
 */
export function createNotesHandlerPOST() {
  return async (request: Request) => {
    try {
      const body = await request.json();
      const validation = notesService.validate(body);

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

      const newNote = await notesService.create({ content: body.content });

      return new Response(JSON.stringify(newNote), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    } catch (error) {
      console.error('[NotesHandler] POST failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to create note',
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
 * PUT /api/notes/:id - Update note
 */
export function createNotesHandlerPUT() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing note ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const body = await request.json();
      const updatedNote = await notesService.update(id, { content: body.content });

      if (!updatedNote) {
        return new Response(
          JSON.stringify({
            error: 'Note not found',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      return new Response(JSON.stringify(updatedNote), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error) {
      console.error('[NotesHandler] PUT failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to update note',
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
 * DELETE /api/notes/:id - Delete note
 */
export function createNotesHandlerDELETE() {
  return async (request: Request) => {
    try {
      const url = new URL(request.url);
      const id = url.pathname.split('/').pop();

      if (!id) {
        return new Response(
          JSON.stringify({
            error: 'Missing note ID',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      await notesService.delete(id);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      console.error('[NotesHandler] DELETE failed:', error);

      return new Response(
        JSON.stringify({
          error: formatErrorForUser(error),
          message: 'Failed to delete note',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  };
}
