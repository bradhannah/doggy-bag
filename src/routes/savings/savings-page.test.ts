import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SavingsPage from './+page.svelte';
import { currentMonth } from '../../stores/ui';
import { apiClient } from '$lib/api/client';
import type { SavingsMonthSummary } from '$lib/types/budget-workflow';

vi.mock('$lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/api/client')>()),
  apiClient: { get: vi.fn(), putPath: vi.fn().mockResolvedValue({}), post: vi.fn() },
}));
vi.mock('../../stores/toast', () => ({ success: vi.fn(), error: vi.fn() }));

describe('Savings balances', () => {
  const summary: SavingsMonthSummary = {
    month: '2026-10',
    exists: true,
    is_read_only: false,
    spending_accounts: [{ id: 'checking', name: 'Checking' }],
    accounts: [
      {
        id: 'savings',
        name: 'Emergency fund',
        is_active: true,
        is_investment: false,
        start: 100000,
        end: 0,
        planned: 20000,
        recorded: 5000,
        unbudgeted_legacy: 0,
        entries: [],
      },
    ],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    currentMonth.set('2026-10');
  });

  it('shows a recorded zero and clears it explicitly when Final is blank', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(summary);
    render(SavingsPage);
    const input = await screen.findByRole('textbox', { name: 'Emergency fund final balance' });
    expect((input as HTMLInputElement).value).toBe('0.00');
    await fireEvent.input(input, { target: { value: '' } });
    await fireEvent.blur(input);
    await waitFor(() =>
      expect(apiClient.putPath).toHaveBeenCalledWith('/api/months/2026-10/savings-balances', {
        end: { savings: null },
      })
    );
  });

  it('offers month creation while still allowing recurring savings plans', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ ...summary, exists: false });
    render(SavingsPage);
    expect(await screen.findByRole('button', { name: /Create/i })).toBeDefined();
    expect(screen.queryByText(/POST \/api/)).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Plan a transfer' }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('makes locked month inputs read-only', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ ...summary, is_read_only: true });
    render(SavingsPage);
    const input = await screen.findByRole('textbox', { name: 'Emergency fund final balance' });
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it('shows budget-derived planned and recorded amounts instead of a second contribution input', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(summary);
    render(SavingsPage);
    await screen.findByRole('textbox', { name: 'Emergency fund final balance' });
    expect(screen.queryByRole('textbox', { name: 'Emergency fund contribution' })).toBeNull();
    expect(screen.getAllByText('$200.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0);
  });
});
