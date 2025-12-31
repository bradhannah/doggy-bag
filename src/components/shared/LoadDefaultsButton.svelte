<script lang="ts">
  import { apiClient } from '../../lib/api/client';
  import { loadPaymentSources } from '../../stores/payment-sources';
  import { loadBills } from '../../stores/bills';
  import { loadIncomes } from '../../stores/incomes';

  type Status = 'idle' | 'loading' | 'success' | 'error' | 'exists';
  let status: Status = 'idle';
  let message = '';

  interface SeedResult {
    seeded: boolean;
    message: string;
    created: {
      paymentSources: number;
      bills: number;
      incomes: number;
    };
  }

  async function handleClick() {
    status = 'loading';
    message = '';

    try {
      const result: SeedResult = await apiClient.post('/api/seed-defaults', {});
      
      if (result.seeded) {
        status = 'success';
        message = `Created ${result.created.paymentSources} payment sources, ${result.created.bills} bills, ${result.created.incomes} incomes`;
        
        // Refresh all stores
        await Promise.all([
          loadPaymentSources(),
          loadBills(),
          loadIncomes()
        ]);
      } else {
        status = 'exists';
        message = result.message;
      }
    } catch (e) {
      status = 'error';
      message = e instanceof Error ? e.message : 'Failed to load defaults';
    }
  }
</script>

<div class="load-defaults">
  <button 
    class="btn btn-secondary"
    on:click={handleClick}
    disabled={status === 'loading'}
  >
    {#if status === 'loading'}
      Loading...
    {:else}
      Load Example Data
    {/if}
  </button>
  
  {#if message}
    <span class="message" class:success={status === 'success'} class:error={status === 'error'} class:exists={status === 'exists'}>
      {message}
    </span>
  {/if}
</div>

<style>
  .load-defaults {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s ease;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #333355;
    color: #fff;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #444466;
  }

  .message {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .message.success {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }

  .message.error {
    color: #ff4444;
    background: rgba(255, 68, 68, 0.1);
  }

  .message.exists {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.1);
  }
</style>
