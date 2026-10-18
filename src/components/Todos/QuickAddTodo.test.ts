import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import QuickAddTodo from './QuickAddTodo.svelte';

describe('Quick-add todo due dates', () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    ['2026-10', '2026-10-17'],
    ['2026-11', '2026-11-01'],
    ['2026-02', '2026-02-28'],
  ])('uses a valid date in the selected month %s', async (month, dueDate) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 17, 12));
    const save = vi.fn();
    render(QuickAddTodo, { props: { month, onSave: save, onCancel: vi.fn() } });
    expect((screen.getByLabelText('Todo due date') as HTMLInputElement).value).toBe(dueDate);
    await fireEvent.input(screen.getByLabelText('Todo title'), {
      target: { value: 'Review budget' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Add Todo' }));
    expect(save).toHaveBeenCalledWith({ title: 'Review budget', due_date: dueDate });
  });
});
