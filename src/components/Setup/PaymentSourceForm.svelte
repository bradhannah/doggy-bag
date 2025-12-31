<script lang="ts">
  /**
   * PaymentSourceForm - Drawer-compatible form for payment sources
   * 
   * @prop editingItem - Payment source being edited (null for new)
   * @prop onSave - Callback after successful save
   * @prop onCancel - Callback to close form without saving
   */
  import { createPaymentSource, updatePaymentSource } from '../../stores/payment-sources';
  import { success, error as showError } from '../../stores/toast';
  import type { PaymentSource } from '../../stores/payment-sources';

  export let editingItem: PaymentSource | null = null;
  export let onSave: () => void = () => {};
  export let onCancel: () => void = () => {};

  // Form state - balance is stored in dollars for user input
  let name = editingItem?.name || '';
  let type: 'bank_account' | 'credit_card' | 'cash' = editingItem?.type || 'bank_account';
  let balanceDollars = editingItem ? (editingItem.balance / 100).toFixed(2) : '0.00';
  let error = '';
  let saving = false;

  // Reset form when editingItem changes
  $: if (editingItem) {
    name = editingItem.name;
    type = editingItem.type;
    balanceDollars = (editingItem.balance / 100).toFixed(2);
  }

  // Convert dollars to cents
  function dollarsToCents(dollars: string): number {
    const parsed = parseFloat(dollars.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }

  async function handleSubmit() {
    // Validation
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    saving = true;
    error = '';

    const balanceCents = dollarsToCents(balanceDollars);

    try {
      if (editingItem) {
        await updatePaymentSource(editingItem.id, { name, type, balance: balanceCents });
        success(`Payment source "${name}" updated`);
      } else {
        await createPaymentSource({ name, type, balance: balanceCents });
        success(`Payment source "${name}" added`);
      }
      onSave();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save payment source';
      showError(error);
    } finally {
      saving = false;
    }
  }
</script>

<form class="entity-form" on:submit|preventDefault={handleSubmit}>
  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  <div class="form-group">
    <label for="ps-name">Name</label>
    <input
      id="ps-name"
      type="text"
      bind:value={name}
      placeholder="e.g., Main Checking"
      required
      disabled={saving}
    />
  </div>

  <div class="form-group">
    <label for="ps-type">Type</label>
    <select id="ps-type" bind:value={type} disabled={saving}>
      <option value="bank_account">Bank Account</option>
      <option value="credit_card">Credit Card</option>
      <option value="cash">Cash</option>
    </select>
  </div>

  <div class="form-group">
    <label for="ps-balance">Current Balance</label>
    <div class="amount-input-wrapper">
      <span class="currency-prefix">$</span>
      <input
        id="ps-balance"
        type="text"
        bind:value={balanceDollars}
        placeholder="0.00"
        required
        disabled={saving}
      />
    </div>
    <div class="help-text">For credit cards, enter balance owed as positive</div>
  </div>

  <div class="form-actions">
    <button type="button" class="btn btn-secondary" on:click={onCancel} disabled={saving}>
      Cancel
    </button>
    <button type="submit" class="btn btn-primary" disabled={saving}>
      {saving ? 'Saving...' : (editingItem ? 'Save Changes' : 'Add Payment Source')}
    </button>
  </div>
</form>

<style>
  .entity-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .error-message {
    background: #ff4444;
    color: #fff;
    padding: 12px;
    border-radius: 6px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-weight: 500;
    font-size: 14px;
    color: #e4e4e7;
  }

  input, select {
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #333355;
    background: #0f0f0f;
    color: #fff;
    font-size: 15px;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #24c8db;
  }

  input:disabled, select:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .amount-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .currency-prefix {
    position: absolute;
    left: 12px;
    color: #888;
    font-size: 15px;
    pointer-events: none;
  }

  .amount-input-wrapper input {
    padding-left: 28px;
    width: 100%;
  }

  .help-text {
    font-size: 12px;
    color: #24c8db;
    margin-top: 4px;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .btn {
    flex: 1;
    padding: 12px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1ab0c9;
  }

  .btn-secondary {
    background: #333355;
    color: #fff;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #444466;
  }
</style>
