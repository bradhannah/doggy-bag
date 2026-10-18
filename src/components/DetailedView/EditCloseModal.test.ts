import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import EditCloseModal from './EditCloseModal.svelte';
import { apiClient } from '$lib/api/client';
import '@testing-library/jest-dom/vitest';

vi.mock('$lib/api/client', () => ({
  apiClient: { post: vi.fn().mockResolvedValue({}), put: vi.fn() },
}));
vi.mock('../../stores/toast', () => ({ success: vi.fn(), error: vi.fn() }));

describe('Edit & Close', () => {
  it('submits the amount and date shown in the payment preview in one request', async () => {
    render(EditCloseModal, {
      props: {
        open: true,
        month: '2025-04',
        instanceId: 'bill',
        occurrenceId: 'occ',
        expectedAmount: 10000,
        expectedDate: '2025-04-01',
        itemName: 'Rent',
      },
    });
    await fireEvent.input(screen.getByLabelText(/^Amount/), { target: { value: '75.00' } });
    await fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '10' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Record payment $75.00' }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/months/2025-04/bills/bill/occurrences/occ/close',
        expect.objectContaining({
          expected_amount: 7500,
          expected_date: '2025-04-10',
          closed_date: '2025-04-01',
        })
      )
    );
    expect(apiClient.put).not.toHaveBeenCalled();
  });
  it('editing an income plan does not expose receipt-recording controls', async () => {
    vi.clearAllMocks();
    render(EditCloseModal, {
      props: {
        open: true,
        mode: 'plan',
        type: 'income',
        month: '2025-04',
        instanceId: 'salary',
        occurrenceId: 'occ',
        expectedAmount: 10000,
        expectedDate: '2025-04-10',
      },
    });
    expect(screen.queryByLabelText('Receipt Date')).not.toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText(/^Amount/), { target: { value: '150.00' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save plan changes' }));
    await waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/months/2025-04/incomes/salary/occurrences/occ',
        '',
        expect.objectContaining({ expected_amount: 15000 })
      )
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
