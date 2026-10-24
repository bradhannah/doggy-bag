import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FilterBar from './FilterBar.svelte';
import '@testing-library/jest-dom/vitest';

describe('FilterBar', () => {
  it('Enter keeps the filter applied instead of clearing it like Escape', async () => {
    const escape = vi.fn();
    render(FilterBar, { props: { open: true, query: 'rent' }, events: { escape } });
    const input = screen.getByPlaceholderText('Type to filter bills and income');
    input.focus();

    await fireEvent.keyDown(input, { key: 'Enter' });

    expect(escape).not.toHaveBeenCalled();
    expect(input).toHaveValue('rent');
    expect(input).not.toHaveFocus();
  });

  it('Escape asks the page to clear and close the filter', async () => {
    const escape = vi.fn();
    render(FilterBar, { props: { open: true, query: 'rent' }, events: { escape } });

    await fireEvent.keyDown(screen.getByPlaceholderText('Type to filter bills and income'), {
      key: 'Escape',
    });

    expect(escape).toHaveBeenCalledOnce();
  });
});
