// Undo API Handlers

import { UndoServiceImpl, createUndoEntry } from '../../services/undo-service';
import { BillsServiceImpl } from '../../services/bills-service';
import { IncomesServiceImpl } from '../../services/incomes-service';
import { PaymentSourcesServiceImpl } from '../../services/payment-sources-service';
import { formatErrorForUser } from '../../utils/errors';
import type { UndoEntry, UndoEntityType } from '../../types';

const undoService = UndoServiceImpl.getInstance();
const billsService = new BillsServiceImpl();
const incomesService = new IncomesServiceImpl();
const paymentSourcesService = new PaymentSourcesServiceImpl();

// GET /api/undo - Get the current undo stack
export function createUndoHandlerGET() {
  return async (_request: Request) => {
    try {
      const stack = await undoService.getStack();
      const isEmpty = stack.length === 0;
      
      return new Response(JSON.stringify({
        stack,
        count: stack.length,
        isEmpty,
        canUndo: !isEmpty
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[UndoHandler] GET failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to get undo stack'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// POST /api/undo - Undo the most recent change
export function createUndoHandlerPOST() {
  return async (_request: Request) => {
    try {
      const entry = await undoService.undo();
      
      if (!entry) {
        return new Response(JSON.stringify({
          error: 'Nothing to undo',
          message: 'The undo stack is empty'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }
      
      // Actually restore the old value based on entity type
      let restored = false;
      let restoredEntity: unknown = null;
      
      switch (entry.entity_type) {
        case 'bill':
          if (entry.old_value === null) {
            // Was created, need to delete
            await billsService.delete(entry.entity_id);
            restored = true;
          } else if (entry.new_value === null) {
            // Was deleted, need to restore
            // For soft delete, we need to reactivate
            restoredEntity = await billsService.update(entry.entity_id, { 
              ...entry.old_value,
              is_active: true 
            });
            restored = true;
          } else {
            // Was updated, restore old values
            restoredEntity = await billsService.update(entry.entity_id, entry.old_value);
            restored = true;
          }
          break;
          
        case 'income':
          if (entry.old_value === null) {
            await incomesService.delete(entry.entity_id);
            restored = true;
          } else if (entry.new_value === null) {
            restoredEntity = await incomesService.update(entry.entity_id, {
              ...entry.old_value,
              is_active: true
            });
            restored = true;
          } else {
            restoredEntity = await incomesService.update(entry.entity_id, entry.old_value);
            restored = true;
          }
          break;
          
        case 'payment_source':
          if (entry.old_value === null) {
            await paymentSourcesService.delete(entry.entity_id);
            restored = true;
          } else if (entry.new_value === null) {
            restoredEntity = await paymentSourcesService.update(entry.entity_id, {
              ...entry.old_value,
              is_active: true
            });
            restored = true;
          } else {
            restoredEntity = await paymentSourcesService.update(entry.entity_id, entry.old_value);
            restored = true;
          }
          break;
          
        // For instances and expenses, we'd need month service
        // For now, just return the entry so the UI can handle it
        default:
          console.log(`[UndoHandler] Entity type ${entry.entity_type} requires manual restoration`);
      }
      
      // Get updated stack
      const stack = await undoService.getStack();
      
      return new Response(JSON.stringify({
        undone: entry,
        restored,
        restoredEntity,
        stack,
        count: stack.length,
        canUndo: stack.length > 0
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[UndoHandler] POST failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to undo'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}

// DELETE /api/undo - Clear the undo stack
export function createUndoHandlerDELETE() {
  return async (_request: Request) => {
    try {
      await undoService.clear();
      
      return new Response(JSON.stringify({
        message: 'Undo stack cleared',
        stack: [],
        count: 0,
        canUndo: false
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('[UndoHandler] DELETE failed:', error);
      
      return new Response(JSON.stringify({
        error: formatErrorForUser(error),
        message: 'Failed to clear undo stack'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  };
}
