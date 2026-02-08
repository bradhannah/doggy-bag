<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { loadPaymentSources, paymentSources } from '../../../stores/payment-sources';
  import { createSavingsGoal, type SavingsGoalData } from '../../../stores/savings-goals';
  import { createBill } from '../../../stores/bills';
  import { apiClient } from '$lib/api/client';
  import { success, error as showError } from '../../../stores/toast';
  import { formatCurrency } from '$lib/utils/format';

  let name = '';
  let targetAmountDollars = '';
  let targetDate = '';
  let linkedAccountId = '';
  let notes = '';
  let isOpenEnded = false; // No target date - indefinite saving
  let hasTargetAmount = true; // Whether user has a specific target amount in mind

  let saving = false;
  let creatingBill = false;

  // Payment schedule selection
  type ScheduleType = 'weekly' | 'biweekly' | 'monthly';
  let selectedSchedule: ScheduleType | null = null;
  let showScheduleForm = false;
  let scheduleStartDate = new Date().toISOString().split('T')[0];
  let includeCurrentMonth = true;

  // Custom amount schedule for open-ended goals
  let customAmountDollars = '';
  let customFrequency: 'weekly' | 'bi_weekly' | 'monthly' = 'monthly';

  // Success modal state
  let successModal: {
    goalName: string;
    billCreated: boolean;
    billName?: string;
    amount?: number;
    frequency?: string;
  } | null = null;

  // Get payment sources for account selection (only bank accounts and cash)
  $: bankAccounts = $paymentSources.filter(
    (ps) => ps.type === 'bank_account' || ps.type === 'cash'
  );

  // Form validation - target date and target amount are optional for open-ended goals
  $: isValid =
    name.trim() !== '' &&
    (hasTargetAmount ? parseFloat(targetAmountDollars) > 0 : true) &&
    (isOpenEnded || targetDate !== '') &&
    linkedAccountId !== '';

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Calculate payment schedule info
  $: targetAmountCents = Math.round((parseFloat(targetAmountDollars) || 0) * 100);
  $: daysUntilTarget = calculateDaysUntil(targetDate);
  $: weeksUntilTarget = Math.ceil(daysUntilTarget / 7);
  $: monthsUntilTarget = calculateMonthsUntil(targetDate);

  // Calculated payment amounts
  $: weeklyPayment = weeksUntilTarget > 0 ? Math.ceil(targetAmountCents / weeksUntilTarget) : 0;
  $: biweeklyPayment =
    weeksUntilTarget > 1 ? Math.ceil(targetAmountCents / Math.ceil(weeksUntilTarget / 2)) : 0;
  $: monthlyPayment = monthsUntilTarget > 0 ? Math.ceil(targetAmountCents / monthsUntilTarget) : 0;

  // Calculate final payment dates for each schedule option
  $: weeklyFinalDate = calculateFinalPaymentDate('weekly');
  $: biweeklyFinalDate = calculateFinalPaymentDate('biweekly');
  $: monthlyFinalDate = calculateFinalPaymentDate('monthly');

  function calculateFinalPaymentDate(schedule: 'weekly' | 'biweekly' | 'monthly'): string {
    if (!targetDate || !scheduleStartDate) return '';
    const start = new Date(scheduleStartDate);
    start.setHours(0, 0, 0, 0);

    let finalDate: Date;

    switch (schedule) {
      case 'weekly':
        if (weeksUntilTarget <= 0) return '';
        finalDate = new Date(start);
        finalDate.setDate(finalDate.getDate() + (weeksUntilTarget - 1) * 7);
        break;
      case 'biweekly': {
        if (weeksUntilTarget <= 1) return '';
        const biweeklyPayments = Math.ceil(weeksUntilTarget / 2);
        finalDate = new Date(start);
        finalDate.setDate(finalDate.getDate() + (biweeklyPayments - 1) * 14);
        break;
      }
      case 'monthly':
        if (monthsUntilTarget <= 0) return '';
        finalDate = new Date(start);
        finalDate.setMonth(finalDate.getMonth() + monthsUntilTarget - 1);
        break;
      default:
        return '';
    }

    return formatDateShort(finalDate);
  }

  function formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function selectSchedule(schedule: ScheduleType) {
    selectedSchedule = selectedSchedule === schedule ? null : schedule;
  }

  function calculateDaysUntil(date: string): number {
    if (!date) return 0;
    const targetTime = new Date(date).setHours(0, 0, 0, 0);
    const todayTime = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((targetTime - todayTime) / (1000 * 60 * 60 * 24));
  }

  function calculateMonthsUntil(date: string): number {
    if (!date) return 0;
    const target = new Date(date);
    const now = new Date();
    const months =
      (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    return Math.max(0, months);
  }

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
        target_amount: hasTargetAmount
          ? Math.round(parseFloat(targetAmountDollars) * 100)
          : undefined, // Convert to cents, or undefined for no-target goals
        target_date: isOpenEnded ? undefined : targetDate || undefined,
        linked_account_id: linkedAccountId,
        notes: notes.trim() || undefined,
      };

      const createdGoal = await createSavingsGoal(data);

      // If a payment schedule was selected, create the bill
      let billCreated = false;
      let billName = '';
      let billAmount = 0;
      let billFrequency = '';

      // Check if we have a schedule to create:
      // - For targeted goals: selectedSchedule is set
      // - For open-ended goals: customAmountDollars is filled in and showScheduleForm is true
      const hasTargetedSchedule = selectedSchedule && !isOpenEnded;
      const hasOpenEndedSchedule =
        isOpenEnded && showScheduleForm && parseFloat(customAmountDollars) > 0;

      if ((hasTargetedSchedule || hasOpenEndedSchedule) && createdGoal?.id) {
        creatingBill = true;
        try {
          // Get or create the Savings Goals category
          const categoryResponse = await fetch(
            `${apiClient.getBaseUrl()}/api/categories/ensure-goals`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (categoryResponse.ok) {
            const category = await categoryResponse.json();

            // Determine amount and billing period
            let amount: number;
            let billingPeriod: 'weekly' | 'bi_weekly' | 'monthly';
            let dayOfMonth: number | undefined;

            if (hasOpenEndedSchedule) {
              // Open-ended goal with custom schedule
              amount = Math.round(parseFloat(customAmountDollars) * 100);
              billingPeriod = customFrequency;
              billFrequency =
                customFrequency === 'weekly'
                  ? 'Weekly'
                  : customFrequency === 'bi_weekly'
                    ? 'Every 2 Weeks'
                    : 'Monthly';
              if (customFrequency === 'monthly' && scheduleStartDate) {
                dayOfMonth = parseInt(scheduleStartDate.split('-')[2], 10);
              }
            } else if (selectedSchedule === 'weekly') {
              amount = weeklyPayment;
              billingPeriod = 'weekly';
              billFrequency = 'Weekly';
            } else if (selectedSchedule === 'biweekly') {
              amount = biweeklyPayment;
              billingPeriod = 'bi_weekly';
              billFrequency = 'Every 2 Weeks';
            } else {
              amount = monthlyPayment;
              billingPeriod = 'monthly';
              billFrequency = 'Monthly';
              // For monthly bills, extract day of month from start date (1-31)
              // Use split/parseInt to avoid timezone shifts
              if (scheduleStartDate) {
                dayOfMonth = parseInt(scheduleStartDate.split('-')[2], 10);
              }
            }

            billName = `Savings: ${name.trim()}`;
            billAmount = amount;

            await createBill({
              name: billName,
              amount: amount,
              billing_period: billingPeriod,
              start_date: scheduleStartDate,
              day_of_month: dayOfMonth,
              payment_source_id: linkedAccountId,
              category_id: category.id,
              goal_id: createdGoal.id,
              payment_method: 'manual',
            });

            // If "include current month" is checked and start date is after today,
            // create an immediate ad-hoc contribution for this month
            if (includeCurrentMonth) {
              const todayDate = new Date().toISOString().split('T')[0];
              const startDateObj = new Date(scheduleStartDate);
              const todayObj = new Date(todayDate);

              // Only create ad-hoc if schedule starts in the future
              if (startDateObj > todayObj) {
                try {
                  await apiClient.post(`/api/savings-goals/${createdGoal.id}/contribute`, {
                    amount: amount,
                    date: todayDate,
                  });
                } catch {
                  // Ignore errors for optional current month payment
                  console.warn('Failed to create current month contribution');
                }
              }
            }

            billCreated = true;
          }
        } catch (billError) {
          // Bill creation failed, but goal was created - show partial success
          console.error('Failed to create bill:', billError);
        } finally {
          creatingBill = false;
        }
      }

      // Show success modal
      successModal = {
        goalName: name.trim(),
        billCreated,
        billName: billCreated ? billName : undefined,
        amount: billCreated ? billAmount : undefined,
        frequency: billCreated ? billFrequency : undefined,
      };
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to create goal');
    } finally {
      saving = false;
    }
  }

  function closeSuccessModal() {
    successModal = null;
    goto('/goals');
  }

  function handleCancel() {
    goto('/goals');
  }
</script>

<div class="new-goal-page">
  <header class="page-header">
    <a href="/goals" class="back-link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Back to Goals
    </a>
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
          <label class="checkbox-field target-amount-toggle">
            <input type="checkbox" bind:checked={hasTargetAmount} />
            <span>I have a specific target amount</span>
          </label>
          {#if hasTargetAmount}
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
          {:else}
            <p class="no-target-hint">
              Great for open-ended goals like emergency funds or rainy day savings.
            </p>
          {/if}
        </div>

        <div class="form-field">
          <label for="targetDate">Target Date</label>
          <input
            type="date"
            id="targetDate"
            bind:value={targetDate}
            min={today}
            disabled={isOpenEnded}
          />
          <label class="checkbox-field open-ended-checkbox">
            <input type="checkbox" bind:checked={isOpenEnded} />
            <span>Open-ended goal (no target date)</span>
          </label>
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
        <span class="field-hint">This is the account where you'll save money for this goal.</span>
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

    <!-- Payment Schedule Section - only for goals with a target date -->
    {#if !isOpenEnded && targetAmountCents > 0 && daysUntilTarget > 0}
      <div class="form-section schedule-section">
        <h2>Payment Schedule (Optional)</h2>

        {#if showScheduleForm}
          <!-- Schedule Creation Form -->
          <div class="schedule-form">
            <p class="schedule-intro">
              To reach <strong>{formatCurrency(targetAmountCents)}</strong> by your target date, choose
              a payment frequency:
            </p>

            <div class="form-field">
              <label for="scheduleStartDate">Start Date</label>
              <input
                type="date"
                id="scheduleStartDate"
                bind:value={scheduleStartDate}
                min={new Date().toISOString().split('T')[0]}
              />
              <span class="field-hint">First payment will be on this date</span>
            </div>

            <label class="checkbox-field">
              <input type="checkbox" bind:checked={includeCurrentMonth} />
              <span>Include current month</span>
              <span class="checkbox-hint">
                Add an extra payment for this month if schedule starts in the future
              </span>
            </label>

            <div class="payment-options">
              {#if weeklyPayment > 0 && weeksUntilTarget > 0}
                <button
                  type="button"
                  class="payment-option"
                  class:selected={selectedSchedule === 'weekly'}
                  on:click={() => selectSchedule('weekly')}
                >
                  {#if selectedSchedule === 'weekly'}
                    <div class="selected-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  {/if}
                  <div class="payment-amount">{formatCurrency(weeklyPayment)}</div>
                  <div class="payment-label">per week</div>
                  <div class="payment-detail">{weeksUntilTarget} payments</div>
                  {#if weeklyFinalDate}
                    <div class="payment-final">Final: {weeklyFinalDate}</div>
                  {/if}
                </button>
              {/if}

              {#if biweeklyPayment > 0 && weeksUntilTarget > 1}
                <button
                  type="button"
                  class="payment-option"
                  class:selected={selectedSchedule === 'biweekly'}
                  on:click={() => selectSchedule('biweekly')}
                >
                  {#if selectedSchedule === 'biweekly'}
                    <div class="selected-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  {/if}
                  <div class="payment-amount">{formatCurrency(biweeklyPayment)}</div>
                  <div class="payment-label">every 2 weeks</div>
                  <div class="payment-detail">{Math.ceil(weeksUntilTarget / 2)} payments</div>
                  {#if biweeklyFinalDate}
                    <div class="payment-final">Final: {biweeklyFinalDate}</div>
                  {/if}
                </button>
              {/if}

              {#if monthlyPayment > 0 && monthsUntilTarget > 0}
                <button
                  type="button"
                  class="payment-option"
                  class:selected={selectedSchedule === 'monthly'}
                  on:click={() => selectSchedule('monthly')}
                >
                  {#if selectedSchedule === 'monthly'}
                    <div class="selected-check">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 6L9 17L4 12"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  {/if}
                  <div class="payment-amount">{formatCurrency(monthlyPayment)}</div>
                  <div class="payment-label">per month</div>
                  <div class="payment-detail">{monthsUntilTarget} payments</div>
                  {#if monthlyFinalDate}
                    <div class="payment-final">Final: {monthlyFinalDate}</div>
                  {/if}
                </button>
              {/if}
            </div>

            {#if selectedSchedule}
              <p class="schedule-selected-note">
                A recurring payment of <strong
                  >{formatCurrency(
                    selectedSchedule === 'weekly'
                      ? weeklyPayment
                      : selectedSchedule === 'biweekly'
                        ? biweeklyPayment
                        : monthlyPayment
                  )}</strong
                >
                ({selectedSchedule === 'biweekly' ? 'every 2 weeks' : selectedSchedule}) will be
                created when you save this goal.
              </p>
            {/if}

            <button
              type="button"
              class="btn-text"
              on:click={() => {
                showScheduleForm = false;
                selectedSchedule = null;
              }}
            >
              Cancel
            </button>
          </div>
        {:else}
          <!-- Add Schedule Button -->
          <div class="no-schedule">
            <p class="no-schedule-text">Set up automatic payments to reach your goal on time.</p>
            <button type="button" class="btn-accent" on:click={() => (showScheduleForm = true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              Add Payment Schedule
            </button>
            <p class="schedule-optional-hint">
              You can always add or modify a schedule later from the goal's edit page.
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Payment Schedule Section for Open-Ended Goals -->
    {#if isOpenEnded}
      <div class="form-section schedule-section">
        <h2>Payment Schedule (Optional)</h2>

        {#if showScheduleForm}
          <!-- Custom Amount Schedule Form for Open-Ended Goals -->
          <div class="schedule-form">
            <p class="schedule-intro">Set up a recurring contribution for your open-ended goal:</p>

            <div class="form-field">
              <label for="customScheduleStartDate">Start Date</label>
              <input
                type="date"
                id="customScheduleStartDate"
                bind:value={scheduleStartDate}
                min={new Date().toISOString().split('T')[0]}
              />
              <span class="field-hint">First contribution will be on this date</span>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="customAmount">Contribution Amount</label>
                <div class="input-with-prefix">
                  <span class="prefix">$</span>
                  <input
                    type="number"
                    id="customAmount"
                    bind:value={customAmountDollars}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>

              <div class="form-field">
                <label for="customFrequency">Frequency</label>
                <select id="customFrequency" bind:value={customFrequency}>
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly">Every 2 Weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {#if parseFloat(customAmountDollars) > 0}
              <p class="schedule-selected-note">
                A recurring contribution of <strong
                  >{formatCurrency(Math.round(parseFloat(customAmountDollars) * 100))}</strong
                >
                ({customFrequency === 'bi_weekly' ? 'every 2 weeks' : customFrequency}) will be
                created when you save this goal.
              </p>
            {/if}

            <button
              type="button"
              class="btn-text"
              on:click={() => {
                showScheduleForm = false;
                customAmountDollars = '';
              }}
            >
              Cancel
            </button>
          </div>
        {:else}
          <!-- Add Schedule Button for Open-Ended Goals -->
          <div class="no-schedule">
            <p class="no-schedule-text">
              Set up recurring contributions to build your savings steadily.
            </p>
            <button type="button" class="btn-accent" on:click={() => (showScheduleForm = true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              Add Contribution Schedule
            </button>
            <p class="schedule-optional-hint">
              You can always add or modify a schedule later from the goal's edit page.
            </p>
          </div>
        {/if}
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={handleCancel}>Cancel</button>
      <button type="submit" class="btn-primary" disabled={!isValid || saving || creatingBill}>
        {#if creatingBill}
          Setting up payment...
        {:else if saving}
          Creating...
        {:else}
          Create Goal
        {/if}
      </button>
    </div>
  </form>
</div>

<!-- Success Modal -->
{#if successModal}
  <div
    class="modal-overlay"
    on:click={closeSuccessModal}
    on:keydown={(e) => e.key === 'Escape' && closeSuccessModal()}
    role="button"
    tabindex="0"
    aria-label="Close modal"
  >
    <div
      class="modal-content success-modal"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="0"
    >
      <div class="success-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <path
            d="M9 12l2 2 4-4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <h2>Goal Created!</h2>

      <p class="success-message">
        <strong>{successModal.goalName}</strong> has been created successfully.
      </p>

      {#if successModal.billCreated}
        <div class="bill-created-info">
          <h3>Payment Schedule Set Up</h3>
          <p>
            A recurring payment of <strong>{formatCurrency(successModal.amount || 0)}</strong>
            ({successModal.frequency}) has been added to your budget.
          </p>
          <p class="bill-location-hint">
            You'll find <strong>"{successModal.billName}"</strong> in your Bills section under the "Savings
            Goals" category.
          </p>
        </div>
      {:else}
        <p class="no-schedule-hint">
          You can add a payment schedule from the goal's edit page at any time.
        </p>
      {/if}

      <button class="btn-primary" on:click={closeSuccessModal}> View Goals </button>
    </div>
  </div>
{/if}

<style>
  .new-goal-page {
    max-width: var(--content-max-setup);
    margin: 0 auto;
    padding: var(--content-padding);
  }

  .page-header {
    margin-bottom: var(--section-gap);
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: var(--space-2);
    transition: color 0.2s;
  }

  .back-link:hover {
    color: var(--accent);
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

  /* Schedule Section */
  .schedule-section {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px solid var(--border-default);
  }

  .schedule-section h2 {
    color: var(--accent);
  }

  .schedule-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .schedule-intro {
    margin: 0;
    color: var(--text-secondary);
  }

  .schedule-intro strong {
    color: var(--text-primary);
  }

  .checkbox-field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .checkbox-field input[type='checkbox'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .checkbox-hint {
    width: 100%;
    padding-left: 26px;
    font-size: 0.8rem;
    color: var(--text-tertiary);
  }

  .open-ended-checkbox {
    margin-top: var(--space-2);
    font-size: 0.875rem;
  }

  .open-ended-checkbox span {
    color: var(--text-secondary);
  }

  .target-amount-toggle {
    margin-bottom: var(--space-2);
    font-size: 0.875rem;
  }

  .target-amount-toggle span {
    color: var(--text-secondary);
  }

  .no-target-hint {
    margin: var(--space-2) 0 0 0;
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .schedule-selected-note {
    margin: 0;
    padding: var(--space-3);
    background: var(--accent-muted);
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .btn-text {
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.875rem;
    padding: var(--space-2);
  }

  .btn-text:hover {
    color: var(--text-primary);
  }

  .no-schedule {
    text-align: center;
    padding: var(--space-4) 0;
  }

  .no-schedule-text {
    margin: 0 0 var(--space-4) 0;
    color: var(--text-secondary);
  }

  .schedule-optional-hint {
    margin: var(--space-3) 0 0 0;
    font-size: 0.8rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  .btn-accent {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    background: var(--accent);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-accent:hover {
    background: var(--accent-hover);
  }

  .calculator-intro {
    margin: 0 0 var(--space-4) 0;
    color: var(--text-secondary);
  }

  .calculator-intro strong {
    color: var(--text-primary);
  }

  .payment-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .payment-option {
    position: relative;
    background: var(--bg-surface);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .payment-option:hover {
    border-color: var(--accent);
    background: var(--bg-hover);
  }

  .payment-option.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .selected-check {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 20px;
    height: 20px;
    background: var(--accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-inverse);
  }

  .payment-amount {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--success);
  }

  .payment-label {
    font-size: 0.875rem;
    color: var(--text-primary);
    margin-top: var(--space-1);
  }

  .payment-detail {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    margin-top: var(--space-1);
  }

  .payment-final {
    font-size: 0.7rem;
    color: var(--text-secondary);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-subtle);
  }

  .payment-option.selected .payment-final {
    color: var(--accent);
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

  /* Success Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
  }

  .modal-content {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .success-modal {
    padding: var(--section-gap);
    text-align: center;
  }

  .success-icon {
    color: var(--success);
    margin-bottom: var(--space-4);
  }

  .success-modal h2 {
    margin: 0 0 var(--space-4) 0;
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .success-message {
    color: var(--text-secondary);
    margin-bottom: var(--space-4);
  }

  .success-message strong {
    color: var(--text-primary);
  }

  .bill-created-info {
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-6);
    text-align: left;
  }

  .bill-created-info h3 {
    margin: 0 0 var(--space-2) 0;
    font-size: 0.875rem;
    color: var(--success);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .bill-created-info p {
    margin: 0 0 var(--space-2) 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .bill-created-info p:last-child {
    margin-bottom: 0;
  }

  .bill-created-info strong {
    color: var(--text-primary);
  }

  .bill-location-hint {
    font-style: italic;
    color: var(--text-tertiary);
  }

  .no-schedule-hint {
    color: var(--text-tertiary);
    font-style: italic;
    margin-bottom: var(--space-6);
  }

  .success-modal .btn-primary {
    min-width: 150px;
  }
</style>
