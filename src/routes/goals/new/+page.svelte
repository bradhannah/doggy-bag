<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { loadPaymentSources, paymentSources } from '../../../stores/payment-sources';
  import { createSavingsGoal, type SavingsGoalData } from '../../../stores/savings-goals';
  import { success, error as showError } from '../../../stores/toast';

  let name = '';
  let targetAmountDollars = '';
  let targetDate = '';
  let linkedAccountId = '';
  let notes = '';

  let saving = false;

  // Get payment sources for account selection (only bank accounts)
  $: bankAccounts = $paymentSources.filter(
    (ps) => ps.type === 'bank_account' || ps.type === 'cash'
  );

  // Form validation
  $: isValid =
    name.trim() !== '' &&
    parseFloat(targetAmountDollars) > 0 &&
    targetDate !== '' &&
    linkedAccountId !== '';

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  onMount(async () => {
    await loadPaymentSources();
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isValid || saving) return;

    saving = true;
    try {
      const data: SavingsGoalData = {
        name: name.trim(),
        target_amount: Math.round(parseFloat(targetAmountDollars) * 100), // Convert to cents
        target_date: targetDate,
        linked_account_id: linkedAccountId,
        notes: notes.trim() || undefined,
      };

      await createSavingsGoal(data);
      success(`Goal "${name}" created!`);
      goto('/goals');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to create goal');
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    goto('/goals');
  }
</script>

<div class="new-goal-page">
  <header class="page-header">
    <h1>Create New Goal</h1>
  </header>

  <form class="goal-form" on:submit={handleSubmit}>
    <div class="form-section">
      <h2>Goal Details</h2>

      <div class="form-field">
        <label for="name">What are you saving for?</label>
        <input
          type="text"
          id="name"
          bind:value={name}
          placeholder="e.g., New Laptop, Vacation, Emergency Fund"
          maxlength="100"
        />
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="targetAmount">Target Amount</label>
          <div class="input-with-prefix">
            <span class="prefix">$</span>
            <input
              type="number"
              id="targetAmount"
              bind:value={targetAmountDollars}
              placeholder="0.00"
              min="0.01"
              step="0.01"
            />
          </div>
        </div>

        <div class="form-field">
          <label for="targetDate">Target Date</label>
          <input type="date" id="targetDate" bind:value={targetDate} min={today} />
        </div>
      </div>

      <div class="form-field">
        <label for="linkedAccount">Linked Account</label>
        <select id="linkedAccount" bind:value={linkedAccountId}>
          <option value="">Select an account...</option>
          {#each bankAccounts as account (account.id)}
            <option value={account.id}>{account.name}</option>
          {/each}
        </select>
        <span class="field-hint"> This is the account where you'll save money for this goal. </span>
      </div>

      <div class="form-field">
        <label for="notes">Notes (optional)</label>
        <textarea
          id="notes"
          bind:value={notes}
          placeholder="Any additional notes about this goal..."
          rows="3"
        ></textarea>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={handleCancel}>Cancel</button>
      <button type="submit" class="btn-primary" disabled={!isValid || saving}>
        {saving ? 'Creating...' : 'Create Goal'}
      </button>
    </div>
  </form>
</div>

<style>
  .new-goal-page {
    max-width: var(--content-max-setup);
    margin: 0 auto;
    padding: var(--content-padding);
  }

  .page-header {
    margin-bottom: var(--section-gap);
  }

  .page-header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .goal-form {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--section-gap);
  }

  .form-section {
    margin-bottom: var(--section-gap);
  }

  .form-section h2 {
    margin: 0 0 var(--space-4) 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-field {
    margin-bottom: var(--form-field-gap);
  }

  .form-field label {
    display: block;
    margin-bottom: var(--space-2);
    font-weight: 500;
    color: var(--text-primary);
  }

  .form-field input,
  .form-field select,
  .form-field textarea {
    width: 100%;
    padding: var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 1rem;
  }

  .form-field input:focus,
  .form-field select:focus,
  .form-field textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  .form-field textarea {
    resize: vertical;
    min-height: 80px;
  }

  .field-hint {
    display: block;
    margin-top: var(--space-1);
    font-size: 0.875rem;
    color: var(--text-tertiary);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--section-gap);
  }

  .input-with-prefix {
    display: flex;
    align-items: center;
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .input-with-prefix:focus-within {
    border-color: var(--accent);
  }

  .input-with-prefix .prefix {
    padding: var(--space-3);
    color: var(--text-secondary);
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-default);
  }

  .input-with-prefix input {
    border: none;
    background: transparent;
  }

  .input-with-prefix input:focus {
    outline: none;
    border: none;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--section-gap);
    border-top: 1px solid var(--border-default);
  }

  .btn-primary,
  .btn-secondary {
    padding: var(--space-3) var(--space-6);
    border-radius: var(--radius-md);
    font-weight: 500;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
