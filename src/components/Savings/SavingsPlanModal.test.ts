import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SavingsPlanModal from './SavingsPlanModal.svelte';
import { apiClient } from '$lib/api/client';
import type { SavingsMonthSummary } from '$lib/types/budget-workflow';

vi.mock('$lib/api/client', () => ({
  apiClient: { post: vi.fn().mockResolvedValue({ recurring: true, key: 'bill:new' }) },
}));

describe('Savings planner', () => {
  it('saves a recurring plan before the budget exists with distinct funding and destination accounts', async () => {
    const summary: SavingsMonthSummary = {
      month: '2026-10',
      exists: false,
      is_read_only: false,
      accounts: [
        {
          id: 'savings',
          name: 'Emergency fund',
          is_active: true,
          is_investment: false,
          planned: 0,
          recorded: 0,
          unbudgeted_legacy: 0,
          entries: [],
        },
      ],
      spending_accounts: [{ id: 'checking', name: 'Checking' }],
    };
    const saved = vi.fn();
    render(SavingsPlanModal, { props: { summary, onClose: vi.fn(), onSaved: saved } });
    await fireEvent.input(screen.getByRole('spinbutton', { name: 'Amount ($)' }), {
      target: { value: '125.50' },
    });
    await fireEvent.input(screen.getByLabelText('First transfer date'), {
      target: { value: '2026-10-20' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save recurring plan' }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/savings-plans',
      expect.objectContaining({
        amount: 12550,
        savings_account_id: 'savings',
        spending_account_id: 'checking',
        recurring: true,
        date: '2026-10-20',
      })
    );
  });
});
