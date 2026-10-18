import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Drawer from './Drawer.svelte';
import '@testing-library/jest-dom/vitest';

describe('Drawer keyboard ownership', () => {
  it('keeps Escape and focus in the unsaved-changes dialog until it is dismissed', async () => {
    const close = vi.fn();
    render(Drawer, {
      props: { isOpen: true, title: 'Edit account', onClose: close, isDirty: () => true },
    });
    const trigger = screen.getByRole('button', { name: 'Close drawer' });
    await waitFor(() => expect(trigger).toHaveFocus());
    await fireEvent.keyDown(document, { key: 'Escape' });
    const cancel = await screen.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());
    await fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Unsaved Changes' })).not.toBeInTheDocument()
    );
    expect(close).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    await fireEvent.keyDown(document, { key: 'Escape' });
    await fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});
