import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import BudgetUpdatesModal from './BudgetUpdatesModal.svelte';
import { apiClient, ApiError } from '$lib/api/client';
import type { BudgetUpdatePreview } from '$lib/types/budget-workflow';

vi.mock('$lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/api/client')>()),
  apiClient: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../stores/toast', () => ({ success: vi.fn() }));

const preview: BudgetUpdatePreview = {
  month: '2026-10',
  revision: 'revision-1',
  available: 100000,
  is_read_only: false,
  items: [
    {
      key: 'bill:savings',
      kind: 'bill',
      group: 'savings',
      savings_account_id: 'savings',
      name: 'Emergency fund',
      amount: 20000,
      impact: -20000,
      dates: ['2026-10-20'],
      excluded: false,
      operation: 'add',
      reason: 'Missing savings plan',
    },
    {
      key: 'income:pay',
      kind: 'income',
      group: 'income',
      name: 'Pay',
      amount: 100000,
      impact: 100000,
      dates: ['2026-10-20'],
      excluded: false,
      operation: 'add',
      reason: 'Missing income',
    },
    {
      key: 'bill:gym',
      kind: 'bill',
      group: 'expenses',
      name: 'Gym',
      amount: 5000,
      impact: -5000,
      dates: ['2026-10-20'],
      excluded: false,
      operation: 'add',
      reason: 'Missing expense',
    },
  ],
};

describe('Review budget updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue(preview);
  });

  it('previews financial impact and submits only the chosen additions and skips', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      month: '2026-10',
      added: 2,
      linked: 0,
      skipped: 1,
    });
    const applied = vi.fn();
    render(BudgetUpdatesModal, {
      props: { month: '2026-10', onClose: vi.fn(), onApplied: applied },
    });
    await fireEvent.click(await screen.findByRole('checkbox', { name: /Emergency fund/ }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Add Pay' }));
    const gym = screen.getByText('Gym').closest('.update-row') as HTMLElement;
    await fireEvent.click(within(gym).getByRole('button', { name: 'Skip this month' }));
    expect(screen.getByText('$1,800.00')).toBeDefined();
    await fireEvent.click(screen.getByRole('button', { name: 'Apply selected updates' }));
    await waitFor(() => expect(applied).toHaveBeenCalled());
    expect(apiClient.post).toHaveBeenCalledWith('/api/months/2026-10/budget-updates', {
      revision: 'revision-1',
      selected_keys: ['bill:savings', 'income:pay'],
      skipped_keys: ['bill:gym'],
    });
  });

  it('refreshes a stale preview without silently applying the old selection', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new ApiError('Budget changed. Review again.', 409));
    const applied = vi.fn();
    render(BudgetUpdatesModal, {
      props: {
        month: '2026-10',
        initialSelected: ['bill:savings'],
        onClose: vi.fn(),
        onApplied: applied,
      },
    });
    await screen.findByRole('checkbox', { name: /Emergency fund/ });
    await fireEvent.click(screen.getByRole('button', { name: 'Apply selected updates' }));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    expect(applied).not.toHaveBeenCalled();
    expect(await screen.findByText('Budget changed. Review again.')).toBeDefined();
    expect(
      (screen.getByRole('checkbox', { name: /Emergency fund/ }) as HTMLInputElement).checked
    ).toBe(false);
  });

  it('counts a selected recurring plan toward the old unlinked Savings amount in the preview', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      ...preview,
      items: [
        preview.items[0],
        {
          ...preview.items[0],
          key: 'legacy-savings:savings',
          name: 'Legacy plan',
          legacy: { target: 20000, planned: 0 },
        },
      ],
    });
    render(BudgetUpdatesModal, { props: { month: '2026-10', onClose: vi.fn() } });
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Add unlinked amount for Legacy plan' })
    );
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Add Emergency fund' }));
    expect(screen.getByText('$800.00')).toBeDefined();
    expect(screen.getByText('Covered by selected plans')).toBeDefined();
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Add unlinked amount for Legacy plan',
        }) as HTMLInputElement
      ).disabled
    ).toBe(true);
  });

  it.each([true, false])(
    'keeps monthly overrides unless explicitly replaced (replace=%s)',
    async (replace) => {
      vi.mocked(apiClient.get).mockResolvedValue({
        ...preview,
        items: [
          {
            ...preview.items[2],
            key: 'update:bill:gym',
            operation: 'update',
            impact: 0,
            changes: [
              {
                key: 'amount-change',
                occurrence_id: 'occ',
                field: 'expected_amount',
                date: '2026-10-20',
                original: 5000,
                current: 6000,
                proposed: 5500,
                is_override: true,
                impact: 500,
              },
              {
                key: 'date-change',
                occurrence_id: 'occ',
                field: 'expected_date',
                date: '2026-10-20',
                original: '2026-10-20',
                current: '2026-10-20',
                proposed: '2026-10-25',
                is_override: false,
                impact: 0,
              },
            ],
          },
        ],
      });
      vi.mocked(apiClient.post).mockResolvedValue({
        month: '2026-10',
        added: 0,
        linked: 0,
        skipped: 0,
        updated: 1,
        kept: 0,
      });
      render(BudgetUpdatesModal, {
        props: { month: '2026-10', initialSelected: ['update:bill:gym'], onClose: vi.fn() },
      });
      const checkbox = await screen.findByRole('checkbox', {
        name: 'Select suggested changes for Gym',
      });
      expect((checkbox as HTMLInputElement).checked).toBe(false);
      await fireEvent.click(checkbox);
      await fireEvent.click(screen.getByText('Review monthly overrides and changes'));
      expect(
        (screen.getByRole('radio', { name: 'Keep my monthly value — $60.00' }) as HTMLInputElement)
          .checked
      ).toBe(true);
      if (replace)
        await fireEvent.click(
          screen.getByRole('radio', { name: 'Use latest recurring value — $55.00' })
        );
      expect(screen.getByText(replace ? '$1,005.00' : '$1,000.00')).toBeDefined();
      await fireEvent.click(screen.getByRole('button', { name: 'Apply selected updates' }));
      expect(apiClient.post).toHaveBeenCalledWith('/api/months/2026-10/budget-updates', {
        revision: 'revision-1',
        selected_keys: replace ? ['date-change', 'amount-change'] : ['date-change'],
        skipped_keys: replace ? [] : ['amount-change'],
      });
    }
  );

  it('keeping the monthly plan clears its field selections and submits a version-scoped decision', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      ...preview,
      items: [
        {
          ...preview.items[2],
          key: 'update:bill:gym',
          operation: 'update',
          impact: 0,
          changes: [
            {
              key: 'amount-change',
              occurrence_id: 'occ',
              field: 'expected_amount',
              date: '2026-10-20',
              original: 5000,
              current: 5000,
              proposed: 5500,
              is_override: false,
              impact: -500,
            },
          ],
        },
      ],
    });
    vi.mocked(apiClient.post).mockResolvedValue({
      month: '2026-10',
      added: 0,
      linked: 0,
      skipped: 0,
      kept: 1,
    });
    render(BudgetUpdatesModal, { props: { month: '2026-10', onClose: vi.fn() } });
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Select suggested changes for Gym' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Keep this month as-is' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Apply selected updates' }));
    expect(apiClient.post).toHaveBeenCalledWith('/api/months/2026-10/budget-updates', {
      revision: 'revision-1',
      selected_keys: [],
      skipped_keys: ['update:bill:gym'],
    });
  });
});
