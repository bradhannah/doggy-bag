// Toast Store Tests
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { toasts, addToast, removeToast, clearToasts, success, error, info, warning } from './toast';

describe('Toast Store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearToasts();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearToasts();
  });

  describe('addToast', () => {
    it('adds a toast with default values', () => {
      const id = addToast('Test message');
      const currentToasts = get(toasts);

      expect(currentToasts).toHaveLength(1);
      expect(currentToasts[0].message).toBe('Test message');
      expect(currentToasts[0].type).toBe('info');
      expect(currentToasts[0].duration).toBe(4000);
      expect(currentToasts[0].id).toBe(id);
    });

    it('adds a toast with custom type', () => {
      addToast('Error message', 'error');
      const currentToasts = get(toasts);

      expect(currentToasts[0].type).toBe('error');
    });

    it('adds a toast with custom duration', () => {
      addToast('Long message', 'info', 10000);
      const currentToasts = get(toasts);

      expect(currentToasts[0].duration).toBe(10000);
    });

    it('adds multiple toasts', () => {
      addToast('First');
      addToast('Second');
      addToast('Third');

      const currentToasts = get(toasts);
      expect(currentToasts).toHaveLength(3);
      expect(currentToasts[0].message).toBe('First');
      expect(currentToasts[2].message).toBe('Third');
    });

    it('auto-removes toast after duration', () => {
      addToast('Temporary', 'info', 3000);

      expect(get(toasts)).toHaveLength(1);

      vi.advanceTimersByTime(3000);

      expect(get(toasts)).toHaveLength(0);
    });

    it('does not auto-remove if duration is 0', () => {
      addToast('Permanent', 'info', 0);

      vi.advanceTimersByTime(10000);

      expect(get(toasts)).toHaveLength(1);
    });

    it('generates unique IDs', () => {
      const id1 = addToast('First');
      const id2 = addToast('Second');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^toast-/);
    });
  });

  describe('removeToast', () => {
    it('removes a toast by ID', () => {
      const id = addToast('To remove');
      expect(get(toasts)).toHaveLength(1);

      removeToast(id);
      expect(get(toasts)).toHaveLength(0);
    });

    it('only removes the specified toast', () => {
      addToast('First');
      const idToRemove = addToast('Second');
      addToast('Third');

      removeToast(idToRemove);

      const currentToasts = get(toasts);
      expect(currentToasts).toHaveLength(2);
      expect(currentToasts[0].message).toBe('First');
      expect(currentToasts[1].message).toBe('Third');
    });

    it('handles removing non-existent ID gracefully', () => {
      addToast('Existing');
      removeToast('non-existent-id');

      expect(get(toasts)).toHaveLength(1);
    });
  });

  describe('clearToasts', () => {
    it('removes all toasts', () => {
      addToast('First');
      addToast('Second');
      addToast('Third');

      expect(get(toasts)).toHaveLength(3);

      clearToasts();

      expect(get(toasts)).toHaveLength(0);
    });

    it('handles clearing empty store', () => {
      clearToasts();
      expect(get(toasts)).toHaveLength(0);
    });
  });

  describe('convenience functions', () => {
    describe('success', () => {
      it('creates success toast with default duration', () => {
        success('Success!');
        const currentToasts = get(toasts);

        expect(currentToasts[0].type).toBe('success');
        expect(currentToasts[0].message).toBe('Success!');
        expect(currentToasts[0].duration).toBe(4000);
      });

      it('creates success toast with custom duration', () => {
        success('Quick success', 1000);
        expect(get(toasts)[0].duration).toBe(1000);
      });
    });

    describe('error', () => {
      it('creates error toast with longer default duration', () => {
        error('Error!');
        const currentToasts = get(toasts);

        expect(currentToasts[0].type).toBe('error');
        expect(currentToasts[0].duration).toBe(6000);
      });

      it('creates error toast with custom duration', () => {
        error('Quick error', 2000);
        expect(get(toasts)[0].duration).toBe(2000);
      });
    });

    describe('info', () => {
      it('creates info toast', () => {
        info('Info message');
        const currentToasts = get(toasts);

        expect(currentToasts[0].type).toBe('info');
        expect(currentToasts[0].duration).toBe(4000);
      });
    });

    describe('warning', () => {
      it('creates warning toast with medium duration', () => {
        warning('Warning!');
        const currentToasts = get(toasts);

        expect(currentToasts[0].type).toBe('warning');
        expect(currentToasts[0].duration).toBe(5000);
      });

      it('creates warning toast with custom duration', () => {
        warning('Quick warning', 2000);
        expect(get(toasts)[0].duration).toBe(2000);
      });
    });
  });
});
