<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import { categories, loadCategories } from '../../stores/categories';
  import { bills, loadBills, type Bill } from '../../stores/bills';
  import { incomes, loadIncomes, type Income } from '../../stores/incomes';
  import { detailedMonth, detailedMonthData } from '../../stores/detailed-month';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let month: string;
  export let type: 'bill' | 'income' = 'bill';
  export let defaultCategoryId: string = '';

  const dispatch = createEventDispatcher();

  // Mode: 'existing' to add occurrence to existing item, 'adhoc' to create new
  let mode: 'existing' | 'adhoc' = 'adhoc';
  let selectedExistingId = ''; // The instanceId of the selected existing item
  let existingAmount = ''; // Custom amount for existing item occurrence

  let name = '';
  let amount = '';
  let categoryId = '';
  let paymentSourceId = ''; // Required payment source
  let saving = false;
  let error = '';
  let _loadingExisting = false;

  // Existing items from master list that have instances in this month
  // { master: Bill | Income, instanceId: string }
  type ExistingItem = { master: Bill | Income; instanceId: string; name: string; amount: number };
  let existingItems: ExistingItem[] = [];

  // Track previous open state to detect when form opens
  let prevOpen = false;

  // Filter payment sources (exclude investments, and for income also exclude debt accounts)
  $: filteredPaymentSources = $paymentSources.filter((ps) => {
    // Exclude investment accounts - we don't pay bills or receive income from investments
    if (ps.type === 'investment') return false;

    // For income, also exclude credit cards and lines of credit
    if (type === 'income') {
      return ps.type === 'bank_account' || ps.type === 'cash';
    }
    // For bills, show bank accounts, cash, credit cards, lines of credit
    return true;
  });

  // Filter categories by type
  $: filteredCategories = $categories.filter((c) => {
    const catType = (c as { type?: string }).type;
    return catType === type || c.name === 'Ad-hoc';
  });

  // Filter existing items by the current category
  $: filteredExistingItems = defaultCategoryId
    ? existingItems.filter((item) => item.master.category_id === defaultCategoryId)
    : existingItems;

  // Set default category when form opens
  $: if (open && defaultCategoryId && categoryId === '') {
    categoryId = defaultCategoryId;
  }

  // Build existing items when form opens (only trigger once when open changes to true)
  $: if (open && !prevOpen) {
    prevOpen = true;
    buildExistingItems();
  } else if (!open && prevOpen) {
    prevOpen = false;
  }

  async function buildExistingItems() {
    _loadingExisting = true;
    existingItems = [];

    try {
      // Force refresh month data to get latest bills/incomes
      await detailedMonth.loadMonth(month);

      // Ensure master lists are loaded
      if ($bills.length === 0 && type === 'bill') {
        await loadBills();
      }
      if ($incomes.length === 0 && type === 'income') {
        await loadIncomes();
      }
      if ($paymentSources.length === 0) {
        await loadPaymentSources();
      }

      const monthData = $detailedMonthData;
      if (!monthData) {
        _loadingExisting = false;
        return;
      }

      // Type for section items
      interface SectionItem {
        id: string;
        bill_id?: string;
        income_id?: string;
        is_adhoc?: boolean;
        is_payoff_bill?: boolean;
      }

      if (type === 'bill') {
        // Build mapping: bill_id -> instance from billSections
        // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local computation, not reactive
        const instanceByBillId = new Map<string, { id: string }>();
        for (const section of monthData.billSections) {
          for (const inst of section.items as SectionItem[]) {
            if (inst.bill_id && !inst.is_adhoc && !inst.is_payoff_bill) {
              instanceByBillId.set(inst.bill_id, { id: inst.id });
            }
          }
        }

        // For each master bill in this category, find its instance
        const items: ExistingItem[] = [];
        for (const bill of $bills) {
          if (!bill.is_active) continue;
          const instance = instanceByBillId.get(bill.id);
          if (instance) {
            items.push({
              master: bill,
              instanceId: instance.id,
              name: bill.name,
              amount: bill.amount,
            });
          }
        }
        existingItems = items; // Reassign for Svelte reactivity
      } else {
        // Build mapping: income_id -> instance from incomeSections
        // eslint-disable-next-line svelte/prefer-svelte-reactivity -- local computation, not reactive
        const instanceByIncomeId = new Map<string, { id: string }>();
        for (const section of monthData.incomeSections) {
          for (const inst of section.items as SectionItem[]) {
            if (inst.income_id && !inst.is_adhoc) {
              instanceByIncomeId.set(inst.income_id, { id: inst.id });
            }
          }
        }

        // For each master income in this category, find its instance
        const items: ExistingItem[] = [];
        for (const income of $incomes) {
          if (!income.is_active) continue;
          const instance = instanceByIncomeId.get(income.id);
          if (instance) {
            items.push({
              master: income,
              instanceId: instance.id,
              name: income.name,
              amount: income.amount,
            });
          }
        }
        existingItems = items; // Reassign for Svelte reactivity
      }

      // Set default mode based on available items for this category
      // Need to wait for reactive update of filteredExistingItems
      setTimeout(() => {
        if (filteredExistingItems.length > 0) {
          mode = 'existing';
        } else {
          mode = 'adhoc';
        }
      }, 0);
    } catch (err) {
      console.error('Failed to load existing items:', err);
    } finally {
      _loadingExisting = false;
    }
  }

  onMount(async () => {
    if ($categories.length === 0) {
      await loadCategories();
    }
  });

  // Helper to get last day of month
  function getLastDayOfMonth(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, monthNum, 0).getDate();
    return `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  }

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
    categoryId = defaultCategoryId || '';
    paymentSourceId = '';
    selectedExistingId = '';
    existingAmount = '';
    mode = 'adhoc';
    error = '';
    existingItems = [];
    _loadingExisting = false;
  }

  async function handleSubmit() {
    saving = true;
    error = '';

    try {
      // Payment source is required for both modes
      if (!paymentSourceId) {
        error = 'Payment source is required';
        saving = false;
        return;
      }

      if (mode === 'existing') {
        // Add occurrence to existing item
        if (!selectedExistingId) {
          error = 'Please select an existing item';
          saving = false;
          return;
        }

        // Validate and parse the amount
        const amountCents = parseDollarsToCents(existingAmount);
        if (amountCents <= 0 || isNaN(amountCents)) {
          error = 'Amount is required and must be greater than $0';
          saving = false;
          return;
        }

        // Find the selected item for the success message
        const selectedItem = filteredExistingItems.find(
          (item) => item.instanceId === selectedExistingId
        );
        if (!selectedItem) {
          error = 'Selected item not found';
          saving = false;
          return;
        }

        const expectedDate = getLastDayOfMonth(month);

        const endpoint =
          type === 'bill'
            ? `/api/months/${month}/bills/${selectedExistingId}/occurrences`
            : `/api/months/${month}/incomes/${selectedExistingId}/occurrences`;

        await apiClient.post(endpoint, {
          expected_date: expectedDate,
          expected_amount: amountCents,
          payment_source_id: paymentSourceId,
        });

        success(`Occurrence added to ${selectedItem.master.name}`);
      } else {
        // Create new ad-hoc item (original behavior)
        if (!name.trim()) {
          error = 'Name is required';
          saving = false;
          return;
        }

        const amountCents = parseDollarsToCents(amount);
        if (amountCents < 0 || isNaN(amountCents)) {
          error = 'Amount must be $0 or greater';
          saving = false;
          return;
        }

        const endpoint =
          type === 'bill'
            ? `/api/months/${month}/adhoc/bills`
            : `/api/months/${month}/adhoc/incomes`;

        const payload: {
          name: string;
          amount: number;
          category_id?: string;
          payment_source_id?: string;
        } = {
          name: name.trim(),
          amount: amountCents,
          payment_source_id: paymentSourceId,
        };

        if (categoryId) {
          payload.category_id = categoryId;
        }

        await apiClient.post(endpoint, payload);

        success(`Ad-hoc ${type} added`);
      }

      dispatch('created');
      handleClose();
    } catch (err) {
      error = err instanceof Error ? err.message : `Failed to add ${type}`;
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
    class="modal-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adhoc-form-title"
      tabindex="-1"
    >
      <header class="modal-header">
        <h3 id="adhoc-form-title">Add {type === 'bill' ? 'Bill' : 'Income'}</h3>
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

      <div class="modal-content">
        <form on:submit|preventDefault={handleSubmit}>
          <!-- Mode Selection - Always visible -->
          <div class="mode-toggle">
            <label class="mode-option" class:selected={mode === 'adhoc'}>
              <input type="radio" value="adhoc" bind:group={mode} disabled={saving} />
              <span class="mode-label">New ad-hoc {type === 'bill' ? 'expense' : 'income'}</span>
            </label>
            <label
              class="mode-option"
              class:selected={mode === 'existing'}
              class:disabled={filteredExistingItems.length === 0}
            >
              <input
                type="radio"
                value="existing"
                bind:group={mode}
                disabled={saving || filteredExistingItems.length === 0}
              />
              <span class="mode-label">
                Add to existing
                {#if filteredExistingItems.length === 0}
                  <span class="mode-hint">(none available)</span>
                {/if}
              </span>
            </label>
          </div>

          <!-- Form fields based on mode -->
          {#if mode === 'adhoc'}
            <!-- Ad-hoc mode: Create new one-time item -->
            <p class="mode-description">
              Add a one-time {type === 'bill' ? 'expense' : 'income'} for this month only.
            </p>

            <div class="form-group">
              <label for="name">Name <span class="required">*</span></label>
              <input
                id="name"
                type="text"
                bind:value={name}
                placeholder={type === 'bill' ? 'e.g., Car Repair' : 'e.g., Bonus'}
                disabled={saving}
                class:error={!!error && !name.trim()}
              />
            </div>

            <div class="form-group">
              <label for="amount">Amount <span class="required">*</span></label>
              <div class="amount-input-group">
                <span class="prefix">$</span>
                <input
                  id="amount"
                  type="text"
                  bind:value={amount}
                  placeholder="0.00"
                  disabled={saving}
                  class:error={!!error && parseDollarsToCents(amount) <= 0}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="adhoc-payment-source"
                >Payment Source <span class="required">*</span></label
              >
              <select
                id="adhoc-payment-source"
                bind:value={paymentSourceId}
                disabled={saving}
                class:error={!!error && !paymentSourceId}
              >
                <option value="">-- Select Payment Source --</option>
                {#each filteredPaymentSources as source (source.id)}
                  <option value={source.id}>{source.name}</option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="category">Category (Optional)</label>
              <select id="category" bind:value={categoryId} disabled={saving}>
                <option value="">-- Select Category --</option>
                {#each filteredCategories as category (category.id)}
                  <option value={category.id}>{category.name}</option>
                {/each}
              </select>
            </div>
          {:else}
            <!-- Existing mode: Add occurrence to existing item -->
            <p class="mode-description">
              Add another occurrence of an existing {type === 'bill' ? 'bill' : 'income'} for this month.
            </p>

            <div class="form-group">
              <label for="existing-item"
                >Select {type === 'bill' ? 'Bill' : 'Income'} <span class="required">*</span></label
              >
              <select
                id="existing-item"
                bind:value={selectedExistingId}
                disabled={saving}
                class:error={!!error && !selectedExistingId}
              >
                <option value="">-- Select --</option>
                {#each filteredExistingItems as item (item.instanceId)}
                  <option value={item.instanceId}>
                    {item.master.name}
                  </option>
                {/each}
              </select>
            </div>

            <div class="form-group">
              <label for="existing-amount">Amount <span class="required">*</span></label>
              <div class="amount-input-group">
                <span class="prefix">$</span>
                <input
                  id="existing-amount"
                  type="text"
                  bind:value={existingAmount}
                  placeholder="0.00"
                  disabled={saving}
                  class:error={!!error && parseDollarsToCents(existingAmount) <= 0}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="existing-payment-source"
                >Payment Source <span class="required">*</span></label
              >
              <select
                id="existing-payment-source"
                bind:value={paymentSourceId}
                disabled={saving}
                class:error={!!error && !paymentSourceId}
              >
                <option value="">-- Select Payment Source --</option>
                {#each filteredPaymentSources as source (source.id)}
                  <option value={source.id}>{source.name}</option>
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
              {saving ? 'Adding...' : `Add ${type === 'bill' ? 'Expense' : 'Income'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal {
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.2s ease-out;
    box-shadow: var(--shadow-heavy);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-5);
    border-bottom: 1px solid var(--border-default);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: var(--space-1);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .modal-content {
    flex: 1;
    padding: var(--space-5);
    overflow-y: auto;
  }

  /* Mode toggle styles */
  .mode-toggle {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
  }

  .mode-option {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-option:hover:not(.disabled) {
    border-color: var(--border-hover);
  }

  .mode-option.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .mode-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mode-option input[type='radio'] {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    cursor: inherit;
  }

  .mode-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .mode-hint {
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-tertiary);
  }

  .mode-description {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin: 0 0 var(--space-5) 0;
  }

  .form-group {
    margin-bottom: var(--space-5);
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .form-group label .required {
    color: var(--error);
  }

  .form-group input[type='text'],
  .form-group select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 1rem;
    height: 42px;
    box-sizing: border-box;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent);
  }

  .form-group input.error,
  .form-group select.error {
    border-color: var(--error);
  }

  .amount-input-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .amount-input-group .prefix {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .amount-input-group input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .amount-input-group input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .amount-input-group input.error {
    border-color: var(--error);
  }

  .error-message {
    color: var(--error);
    font-size: 0.875rem;
    margin: 0 0 var(--space-4) 0;
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .cancel-btn:hover:not(:disabled) {
    border-color: var(--text-primary);
    color: var(--text-primary);
  }

  .submit-btn {
    background: var(--accent);
    border: none;
    color: var(--text-inverse);
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
