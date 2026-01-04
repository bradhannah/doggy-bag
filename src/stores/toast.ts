// Toast Store - Manages toast notifications

import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

// Store for all active toasts
const { subscribe, update } = writable<Toast[]>([]);

// Generate unique ID
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add a new toast
export function addToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 4000
): string {
  const id = generateId();
  const toast: Toast = { id, message, type, duration };

  update((toasts) => [...toasts, toast]);

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

// Remove a toast by ID
export function removeToast(id: string): void {
  update((toasts) => toasts.filter((t) => t.id !== id));
}

// Clear all toasts
export function clearToasts(): void {
  update(() => []);
}

// Convenience functions
export function success(message: string, duration?: number): string {
  return addToast(message, 'success', duration);
}

export function error(message: string, duration?: number): string {
  return addToast(message, 'error', duration ?? 6000); // Errors stay longer
}

export function info(message: string, duration?: number): string {
  return addToast(message, 'info', duration);
}

export function warning(message: string, duration?: number): string {
  return addToast(message, 'warning', duration ?? 5000);
}

// Export the store
export const toasts = { subscribe };
