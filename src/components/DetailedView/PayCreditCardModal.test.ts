import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PayCreditCardModal from './PayCreditCardModal.svelte';
import { apiClient } from '$lib/api/client';
import '@testing-library/jest-dom/vitest';

vi.mock('$lib/api/client', () => ({
  apiClient: { post: vi.fn().mockResolvedValue({ instance: {}, newBalance: 0, remaining: 0 }) },
}));
vi.mock('../../stores/toast', () => ({ success: vi.fn(), error: vi.fn() }));

const props = {
  open: true,
  month: '2030-06',
  instanceId: 'visa',
  cardName: 'Visa',
  currentBalance: 50000,
  paidSoFar: 0,
  remaining: 50000,
};

describe('Pay credit card', () => {
  beforeEach(() => vi.mocked(apiClient.post).mockClear());

  it('defaults the payment date into the month being viewed', () => {
    render(PayCreditCardModal, { props });
    expect(screen.getByLabelText('Payment date')).toHaveValue('1');
  });

  it('does not send a $0 balance when an override is typed and then cleared', async () => {
    render(PayCreditCardModal, { props });
    await fireEvent.input(screen.getByLabelText('Payment amount'), { target: { value: '100' } });
    const override = screen.getByLabelText(/New balance/);
    await fireEvent.input(override, { target: { value: '5' } });
    await fireEvent.input(override, { target: { value: '' } });

    await fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toEqual({
      amount: 10000,
      date: '2030-06-01',
    });
  });
});
