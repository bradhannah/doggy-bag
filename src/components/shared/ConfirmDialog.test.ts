import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

describe('Confirmation keyboard behaviour', () => {
  it('leaves Enter to the focused button and contains Tab focus', async () => {
    const confirm = vi.fn();
    render(ConfirmDialog, { props: { open: true }, events: { confirm } });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const accept = screen.getByRole('button', { name: 'Delete' });
    await waitFor(() => expect(document.activeElement).toBe(cancel));
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    cancel.dispatchEvent(event);
    expect(confirm).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    await fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(accept);
    await fireEvent.keyDown(accept, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
  });
});
