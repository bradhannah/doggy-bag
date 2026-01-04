<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import { categories, loadCategories } from '../../stores/categories';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let month: string;
  export let type: 'bill' | 'income' = 'bill';
  export let instanceId: string;
  export let instanceName: string = '';
  export let instanceAmount: number = 0;

  const dispatch = createEventDispatcher();

  // Form fields - pre-filled from instance
  let name = '';
  let amount = '';
  let categoryId = '';
  let paymentSourceId = '';
  let billingPeriod: 'monthly' | 'bi_weekly' | 'weekly' | 'semi_annually' = 'monthly';
  let dueDay = '';
  let saving = false;
  let error = '';

  // Filter categories by type
  $: filteredCategories = $categories.filter((c) => {
    const catType = (c as { type?: string }).type;
    return catType === type;
  });

  $: activePaymentSources = $paymentSources.filter((p) => p.is_active);

  // Pre-fill form when opened
  $: if (open) {
    name = instanceName;
    amount = (instanceAmount / 100).toFixed(2);
  }

  onMount(async () => {
    const promises = [];
    if ($categories.length === 0) {
      promises.push(loadCategories());
    }
    if ($paymentSources.length === 0) {
      promises.push(loadPaymentSources());
    }
    await Promise.all(promises);

    // Set defaults after loading
    if (filteredCategories.length > 0 && !categoryId) {
      categoryId = filteredCategories[0].id;
    }
    if (activePaymentSources.length > 0 && !paymentSourceId) {
      paymentSourceId = activePaymentSources[0].id;
    }
  });

  function parseDollarsToCents(value: string): number {
    const dollars = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(dollars) ? 0 : Math.round(dollars * 100);
  }

  function handleClose() {
    open = false;
    resetForm();
    dispatch('close');
  }

  function resetForm() {
    name = '';
    amount = '';
    categoryId = '';
    paymentSourceId = '';
    billingPeriod = 'monthly';
    dueDay = '';
    error = '';
  }

  async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    const amountCents = parseDollarsToCents(amount);
    if (amountCents <= 0) {
      error = 'Please enter a valid amount';
      return;
    }

    if (!categoryId) {
      error = 'Please select a category';
      return;
    }

    if (!paymentSourceId) {
      error = 'Please select a payment source';
      return;
    }

    saving = true;
    error = '';

    try {
      const endpoint =
        type === 'bill'
          ? `/api/months/${month}/adhoc/bills/${instanceId}/make-regular`
          : `/api/months/${month}/adhoc/incomes/${instanceId}/make-regular`;

      const payload: {
        name: string;
        amount: number;
        category_id: string;
        payment_source_id: string;
        billing_period: string;
        due_day?: number;
      } = {
        name: name.trim(),
        amount: amountCents,
        category_id: categoryId,
        payment_source_id: paymentSourceId,
        billing_period: billingPeriod,
      };

      if (dueDay) {
        payload.due_day = parseInt(dueDay, 10);
      }

      await apiClient.post(endpoint, payload);

      success(`Created recurring ${type}: ${name}`);
      dispatch('converted');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to convert to regular ${type}`;
      showError(error);
    } finally {
      saving = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="drawer-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
  >
    <div
      class="drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="make-regular-title"
      tabindex="-1"
    >
      <header class="drawer-header">
        <h3 id="make-regular-title">Make Regular {type === 'bill' ? 'Bill' : 'Income'}</h3>
        <button class="close-btn" on:click={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <div class="drawer-content">
        <p class="description">
          Convert this ad-hoc {type} to a recurring {type}. It will appear in future months.
        </p>

        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
            <label for="name">Name</label>
            <input
              id="name"
              type="text"
              bind:value={name}
              placeholder={type === 'bill' ? 'e.g., Netflix' : 'e.g., Salary'}
              disabled={saving}
            />
          </div>

          <div class="form-group">
            <label for="amount">Amount</label>
            <div class="amount-input-group">
              <span class="prefix">$</span>
              <input
                id="amount"
                type="text"
                bind:value={amount}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
          </div>

          <div class="form-group">
            <label for="category">Category</label>
            <select id="category" bind:value={categoryId} disabled={saving}>
              <option value="">-- Select Category --</option>
              {#each filteredCategories as category (category.id)}
                <option value={category.id}>{category.name}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="paymentSource">Payment Source</label>
            <select id="paymentSource" bind:value={paymentSourceId} disabled={saving}>
              <option value="">-- Select Payment Source --</option>
              {#each activePaymentSources as source (source.id)}
                <option value={source.id}>{source.name}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="billingPeriod">Billing Period</label>
            <select id="billingPeriod" bind:value={billingPeriod} disabled={saving}>
              <option value="monthly">Monthly</option>
              <option value="bi_weekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
              <option value="semi_annually">Semi-annually</option>
            </select>
          </div>

          {#if billingPeriod === 'monthly'}
            <div class="form-group">
              <label for="dueDay">Due Day (Optional)</label>
              <select id="dueDay" bind:value={dueDay} disabled={saving}>
                <option value="">-- Not Set --</option>
                {#each Array.from({ length: 31 }, (_, i) => i + 1) as day (day)}
                  <option value={day}>{day}</option>
                {/each}
              </select>
            </div>
          {/if}

          {#if error}
            <p class="error-message">{error}</p>
          {/if}

          <div class="form-actions">
            <button type="button" class="cancel-btn" on:click={handleClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" class="submit-btn" disabled={saving}>
              {saving ? 'Converting...' : 'Make Regular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: flex-end;
    z-index: 1000;
  }

  .drawer {
    width: 100%;
    max-width: 400px;
    height: 100%;
    background: #1a1a2e;
    border-left: 1px solid #333355;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #333355;
  }

  .drawer-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #e4e4e7;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #e4e4e7;
  }

  .drawer-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  }

  .description {
    color: #888;
    font-size: 0.875rem;
    margin-bottom: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: #888;
    margin-bottom: 8px;
  }

  .form-group input[type='text'],
  .form-group select {
    width: 100%;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 1rem;
    height: 42px;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #24c8db;
  }

  .amount-input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .amount-input-group .prefix {
    color: #888;
    font-size: 1rem;
  }

  .amount-input-group input {
    flex: 1;
    padding: 10px 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 1rem;
  }

  .amount-input-group input:focus {
    outline: none;
    border-color: #24c8db;
  }

  .error-message {
    color: #f87171;
    font-size: 0.875rem;
    margin: 0 0 16px 0;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid #333355;
    color: #888;
  }

  .cancel-btn:hover:not(:disabled) {
    border-color: #e4e4e7;
    color: #e4e4e7;
  }

  .submit-btn {
    background: #a78bfa;
    border: none;
    color: #000;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .cancel-btn:disabled,
  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
