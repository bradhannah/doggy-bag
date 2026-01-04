<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import { categories, loadCategories } from '../../stores/categories';
  import { bills, loadBills, type Bill } from '../../stores/bills';
  import { incomes, loadIncomes, type Income } from '../../stores/incomes';
  import { detailedMonthData } from '../../stores/detailed-month';
  import { success, error as showError } from '../../stores/toast';

  export let open = false;
  export let month: string;
  export let type: 'bill' | 'income' = 'bill';
  export let defaultCategoryId: string = '';

  const dispatch = createEventDispatcher();

  // Mode: 'existing' to add occurrence to existing item, 'adhoc' to create new
  let mode: 'existing' | 'adhoc' = 'adhoc';
  let selectedExistingId = ''; // The instanceId of the selected existing item

  let name = '';
  let amount = '';
  let categoryId = '';
  let saving = false;
  let error = '';
  let loadingExisting = false;

  // Existing items from master list that have instances in this month
  // { master: Bill | Income, instanceId: string }
  type ExistingItem = { master: Bill | Income; instanceId: string; name: string; amount: number };
  let existingItems: ExistingItem[] = [];

  // Filter categories by type
  $: filteredCategories = $categories.filter((c) => {
    const catType = (c as any).type;
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

  // Build existing items when form opens
  $: if (open && !loadingExisting) {
    buildExistingItems();
  }

  async function buildExistingItems() {
    loadingExisting = true;
    existingItems = [];

    try {
      // Ensure master lists are loaded
      if ($bills.length === 0 && type === 'bill') {
        await loadBills();
      }
      if ($incomes.length === 0 && type === 'income') {
        await loadIncomes();
      }

      const monthData = $detailedMonthData;
      if (!monthData) {
        loadingExisting = false;
        return;
      }

      if (type === 'bill') {
        // Build mapping: bill_id -> instance from billSections
        const instanceByBillId = new Map<string, { id: string }>();
        for (const section of monthData.billSections) {
          for (const inst of section.items as any[]) {
            if (inst.bill_id && !inst.is_adhoc && !inst.is_payoff_bill) {
              instanceByBillId.set(inst.bill_id, { id: inst.id });
            }
          }
        }

        // For each master bill in this category, find its instance
        for (const bill of $bills) {
          if (!bill.is_active) continue;
          const instance = instanceByBillId.get(bill.id);
          if (instance) {
            existingItems.push({
              master: bill,
              instanceId: instance.id,
              name: bill.name,
              amount: bill.amount,
            });
          }
        }
      } else {
        // Build mapping: income_id -> instance from incomeSections
        const instanceByIncomeId = new Map<string, { id: string }>();
        for (const section of monthData.incomeSections) {
          for (const inst of section.items as any[]) {
            if (inst.income_id && !inst.is_adhoc) {
              instanceByIncomeId.set(inst.income_id, { id: inst.id });
            }
          }
        }

        // For each master income in this category, find its instance
        for (const income of $incomes) {
          if (!income.is_active) continue;
          const instance = instanceByIncomeId.get(income.id);
          if (instance) {
            existingItems.push({
              master: income,
              instanceId: instance.id,
              name: income.name,
              amount: income.amount,
            });
          }
        }
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
      loadingExisting = false;
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
    selectedExistingId = '';
    mode = 'adhoc';
    error = '';
    existingItems = [];
    loadingExisting = false;
  }

  async function handleSubmit() {
    saving = true;
    error = '';

    try {
      if (mode === 'existing') {
        // Add occurrence to existing item
        if (!selectedExistingId) {
          error = 'Please select an existing item';
          saving = false;
          return;
        }

        // Find the selected item to get its amount
        const selectedItem = filteredExistingItems.find(
          (item) => item.instanceId === selectedExistingId
        );
        if (!selectedItem) {
          error = 'Selected item not found';
          saving = false;
          return;
        }

        const expectedDate = getLastDayOfMonth(month);
        const expectedAmount = Math.floor(selectedItem.master.amount / 2); // Half of master amount

        const endpoint =
          type === 'bill'
            ? `/api/months/${month}/bills/${selectedExistingId}/occurrences`
            : `/api/months/${month}/incomes/${selectedExistingId}/occurrences`;

        await apiClient.post(endpoint, {
          expected_date: expectedDate,
          expected_amount: expectedAmount,
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
        if (amountCents <= 0) {
          error = 'Please enter a valid amount';
          saving = false;
          return;
        }

        const endpoint =
          type === 'bill'
            ? `/api/months/${month}/adhoc/bills`
            : `/api/months/${month}/adhoc/incomes`;

        const payload: any = {
          name: name.trim(),
          amount: amountCents,
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
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
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
      aria-labelledby="adhoc-form-title"
      tabindex="-1"
    >
      <header class="drawer-header">
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

      <div class="drawer-content">
        <form on:submit|preventDefault={handleSubmit}>
          {#if filteredExistingItems.length > 0}
            <!-- Mode: Add occurrence to existing item -->
            <div class="mode-section">
              <div class="mode-header">
                <input
                  type="radio"
                  id="mode-existing"
                  value="existing"
                  bind:group={mode}
                  disabled={saving}
                />
                <label for="mode-existing">Add occurrence to existing {type}</label>
              </div>

              {#if mode === 'existing'}
                <div class="mode-content">
                  <p class="mode-description">
                    Add another occurrence of an existing {type} for this month.
                  </p>
                  <div class="form-group">
                    <label for="existing-item">Select {type === 'bill' ? 'Bill' : 'Income'}</label>
                    <select
                      id="existing-item"
                      bind:value={selectedExistingId}
                      disabled={saving}
                      class:error={!!error && !selectedExistingId}
                    >
                      <option value="">-- Select --</option>
                      {#each filteredExistingItems as item}
                        <option value={item.instanceId}>
                          {item.master.name} (${(item.master.amount / 100).toFixed(2)})
                        </option>
                      {/each}
                    </select>
                  </div>
                </div>
              {/if}
            </div>

            <div class="mode-divider">
              <span>OR</span>
            </div>

            <!-- Mode: Create new ad-hoc item -->
            <div class="mode-section">
              <div class="mode-header">
                <input
                  type="radio"
                  id="mode-adhoc"
                  value="adhoc"
                  bind:group={mode}
                  disabled={saving}
                />
                <label for="mode-adhoc">Create new ad-hoc {type}</label>
              </div>

              {#if mode === 'adhoc'}
                <div class="mode-content">
                  <p class="mode-description">
                    Add a one-time {type} for this month only.
                  </p>

                  <div class="form-group">
                    <label for="name">Name</label>
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
                    <label for="amount">Amount</label>
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
                    <label for="category">Category (Optional)</label>
                    <select id="category" bind:value={categoryId} disabled={saving}>
                      <option value="">-- Select Category --</option>
                      {#each filteredCategories as category}
                        <option value={category.id}>{category.name}</option>
                      {/each}
                    </select>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <!-- No existing items, show only ad-hoc form -->
            <p class="description">
              Add a one-time {type} for this month only. You can convert it to a recurring {type} later.
            </p>

            <div class="form-group">
              <label for="name">Name</label>
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
              <label for="amount">Amount</label>
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
              <label for="category">Category (Optional)</label>
              <select id="category" bind:value={categoryId} disabled={saving}>
                <option value="">-- Select Category --</option>
                {#each filteredCategories as category}
                  <option value={category.id}>{category.name}</option>
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
              {saving ? 'Adding...' : `Add ${type === 'bill' ? 'Bill' : 'Income'}`}
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

  /* Mode selection styles */
  .mode-section {
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid #333355;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
  }

  .mode-section:has(input[type='radio']:checked) {
    border-color: #24c8db;
    background: rgba(36, 200, 219, 0.05);
  }

  .mode-header {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .mode-header input[type='radio'] {
    width: 18px;
    height: 18px;
    accent-color: #24c8db;
    cursor: pointer;
  }

  .mode-header label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #e4e4e7;
    cursor: pointer;
  }

  .mode-content {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #333355;
  }

  .mode-description {
    color: #888;
    font-size: 0.8rem;
    margin: 0 0 16px 0;
  }

  .mode-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 16px 0;
    color: #666;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .mode-divider::before,
  .mode-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #333355;
    margin: 0 12px;
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

  .form-group input.error,
  .form-group select.error {
    border-color: #f87171;
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

  .amount-input-group input.error {
    border-color: #f87171;
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
    background: #24c8db;
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
