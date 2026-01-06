// Toast Component Tests
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toast from './Toast.svelte';
import type { Toast as ToastType } from '../../stores/toast';

// Mock the toast store
vi.mock('../../stores/toast', () => ({
  removeToast: vi.fn(),
}));

import { removeToast } from '../../stores/toast';

const mockRemoveToast = vi.mocked(removeToast);

// Helper to create a toast with required fields
function createToast(overrides: Partial<ToastType> & { id: string; message: string }): ToastType {
  return {
    type: 'success',
    duration: 4000,
    ...overrides,
  };
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders toast message', () => {
      const toast = createToast({
        id: 'toast-1',
        type: 'success',
        message: 'Operation successful!',
      });

      render(Toast, { props: { toast } });

      expect(screen.getByText('Operation successful!')).toBeDefined();
    });

    it('renders success icon', () => {
      const toast = createToast({
        id: 'toast-1',
        type: 'success',
        message: 'Success message',
      });

      render(Toast, { props: { toast } });

      expect(screen.getByText('✓')).toBeDefined();
    });

    it('renders error icon', () => {
      const toast = createToast({
        id: 'toast-2',
        type: 'error',
        message: 'Error message',
      });

      render(Toast, { props: { toast } });

      // Error icon is ✕ but close button also has ✕, so check for multiple
      const allX = screen.getAllByText('✕');
      expect(allX.length).toBeGreaterThanOrEqual(1);
      // Verify toast-icon class is present
      const iconElement = allX.find((el) => el.classList.contains('toast-icon'));
      expect(iconElement).toBeDefined();
    });

    it('renders warning icon', () => {
      const toast = createToast({
        id: 'toast-3',
        type: 'warning',
        message: 'Warning message',
      });

      render(Toast, { props: { toast } });

      expect(screen.getByText('⚠')).toBeDefined();
    });

    it('renders info icon', () => {
      const toast = createToast({
        id: 'toast-4',
        type: 'info',
        message: 'Info message',
      });

      render(Toast, { props: { toast } });

      expect(screen.getByText('ℹ')).toBeDefined();
    });

    it('has correct role for accessibility', () => {
      const toast = createToast({
        id: 'toast-1',
        type: 'success',
        message: 'Test message',
      });

      render(Toast, { props: { toast } });

      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  describe('type-specific styling', () => {
    it('applies success class', () => {
      const toast = createToast({
        id: 'toast-1',
        type: 'success',
        message: 'Success',
      });

      render(Toast, { props: { toast } });

      const alert = screen.getByRole('alert');
      expect(alert.classList.contains('toast-success')).toBe(true);
    });

    it('applies error class', () => {
      const toast = createToast({
        id: 'toast-2',
        type: 'error',
        message: 'Error',
      });

      render(Toast, { props: { toast } });

      const alert = screen.getByRole('alert');
      expect(alert.classList.contains('toast-error')).toBe(true);
    });

    it('applies warning class', () => {
      const toast = createToast({
        id: 'toast-3',
        type: 'warning',
        message: 'Warning',
      });

      render(Toast, { props: { toast } });

      const alert = screen.getByRole('alert');
      expect(alert.classList.contains('toast-warning')).toBe(true);
    });

    it('applies info class', () => {
      const toast = createToast({
        id: 'toast-4',
        type: 'info',
        message: 'Info',
      });

      render(Toast, { props: { toast } });

      const alert = screen.getByRole('alert');
      expect(alert.classList.contains('toast-info')).toBe(true);
    });
  });

  describe('close button', () => {
    it('renders close button', () => {
      const toast = createToast({
        id: 'toast-1',
        type: 'success',
        message: 'Test',
      });

      render(Toast, { props: { toast } });

      expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    });

    it('calls removeToast when close button is clicked', async () => {
      const toast = createToast({
        id: 'toast-123',
        type: 'success',
        message: 'Test',
      });

      render(Toast, { props: { toast } });

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await fireEvent.click(closeButton);

      expect(mockRemoveToast).toHaveBeenCalledWith('toast-123');
    });

    it('calls removeToast with correct toast id', async () => {
      const toast = createToast({
        id: 'unique-toast-id-456',
        type: 'error',
        message: 'Error occurred',
      });

      render(Toast, { props: { toast } });

      const closeButton = screen.getByRole('button', { name: 'Close' });
      await fireEvent.click(closeButton);

      expect(mockRemoveToast).toHaveBeenCalledWith('unique-toast-id-456');
      expect(mockRemoveToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('message content', () => {
    it('displays long messages', () => {
      const longMessage =
        'This is a very long message that should still be displayed correctly in the toast component.';
      const toast = createToast({
        id: 'toast-1',
        type: 'info',
        message: longMessage,
      });

      render(Toast, { props: { toast } });

      expect(screen.getByText(longMessage)).toBeDefined();
    });

    it('displays messages with special characters', () => {
      const specialMessage = "Bill 'Electric' saved & updated! <test>";
      const toast = createToast({
        id: 'toast-1',
        type: 'success',
        message: specialMessage,
      });

      render(Toast, { props: { toast } });

      expect(screen.getByText(specialMessage)).toBeDefined();
    });
  });
});
