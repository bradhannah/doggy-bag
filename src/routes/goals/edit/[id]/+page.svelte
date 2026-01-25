<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { loadPaymentSources, paymentSources } from '../../../../stores/payment-sources';
  import {
    getSavingsGoal,
    updateSavingsGoal,
    getGoalBills,
    completeGoal,
    abandonGoal,
    type SavingsGoal,
    type SavingsGoalUpdate,
  } from '../../../../stores/savings-goals';
  import { createBill, type Bill } from '../../../../stores/bills';
  import { success, error as showError } from '../../../../stores/toast';
  import { apiClient } from '$lib/api/client';

  // Get goal ID from URL
  $: goalId = ($page.params as { id: string }).id;

  let goal: SavingsGoal | null = null;
  let bills: Bill[] = [];
  let loading = true;
  let saving = false;
  let loadError = '';

  // Bill creation state
  let creatingBill = false;
  let billSuccessModal: {
    billName: string;
    amount: number;
    frequency: string;
    startDate: string;
  } | null = null;

  // Schedule creation state
  let showScheduleForm = false;
  let scheduleStartDate = new Date().toISOString().split('T')[0];
  let includeCurrentMonth = true;

  // Custom amount state (for "Set your own amount" feature)
  let customAmountDollars = '';
  let customFrequency: 'weekly' | 'bi_weekly' | 'monthly' = 'monthly';

  // Selected schedule mode: calculated options or custom amount
  type ScheduleSelection =
    | { type: 'calculated'; frequency: 'weekly' | 'bi_weekly' | 'monthly'; amount: number }
    | { type: 'custom' };
  let selectedSchedule: ScheduleSelection | null = null;

  // Confirm modal state
  let confirmModal: {
    type: 'complete' | 'abandon' | 'remove-schedule';
    billId?: string;
  } | null = null;

  // Action loading state
  let actionLoading = false;

  // Removing schedule state
  let removingSchedule = false;

  // Form fields
  let name = '';
  let targetAmountDollars = '';
  let targetDate = '';
  let linkedAccountId = '';
  let notes = '';
  let isOpenEnded = false; // No target date - indefinite saving

  // Get payment sources for account selection
  $: bankAccounts = $paymentSources.filter(
    (ps) => ps.type === 'bank_account' || ps.type === 'cash'
  );

  // Form validation - target date not required for open-ended goals
  $: isValid =
    name.trim() !== '' &&
    parseFloat(targetAmountDollars) > 0 &&
    (isOpenEnded || targetDate !== '') &&
    linkedAccountId !== '';

  // Check if form has changes
  $: hasChanges =
    goal !== null &&
    (name !== goal.name ||
      Math.round(parseFloat(targetAmountDollars) * 100) !== goal.target_amount ||
      targetDate !== (goal.target_date || '') ||
      isOpenEnded !== !goal.target_date ||
      linkedAccountId !== goal.linked_account_id ||
      (notes || '') !== (goal.notes || ''));

  // Calculate minimum date (today for active goals, no restriction for completed)
  $: minDate = goal?.status === 'saving' ? new Date().toISOString().split('T')[0] : undefined;

  // Active schedule detection
  $: activeBills = bills.filter((b) => b.is_active);
  $: hasActiveSchedule = activeBills.length > 0;
  $: activeBill = activeBills[0]; // Primary active schedule

  // Payment schedule calculations (for goals without active bills)
  $: targetAmountCents = goal?.target_amount || 0;
  $: remainingAmount = targetAmountCents - (goal?.saved_amount || 0);
  $: daysUntilTarget = calculateDaysUntil(targetDate);
  $: weeksUntilTarget = Math.ceil(daysUntilTarget / 7);
  $: monthsUntilTarget = calculateMonthsUntil(targetDate);

  // Calculated payment amounts based on REMAINING amount
  $: weeklyPayment = weeksUntilTarget > 0 ? Math.ceil(remainingAmount / weeksUntilTarget) : 0;
  $: biweeklyPayment =
    weeksUntilTarget > 1 ? Math.ceil(remainingAmount / Math.ceil(weeksUntilTarget / 2)) : 0;
  $: monthlyPayment = monthsUntilTarget > 0 ? Math.ceil(remainingAmount / monthsUntilTarget) : 0;

  // Calculate final payment dates for each schedule option
  $: weeklyFinalDate = calculateFinalPaymentDate('weekly', scheduleStartDate);
  $: biweeklyFinalDate = calculateFinalPaymentDate('biweekly', scheduleStartDate);
  $: monthlyFinalDate = calculateFinalPaymentDate('monthly', scheduleStartDate);

  // Custom amount calculations
  $: customAmountCents = Math.round((parseFloat(customAmountDollars) || 0) * 100);
  $: customPaymentsNeeded =
    customAmountCents > 0 ? Math.ceil(remainingAmount / customAmountCents) : 0;
  $: customCompletionInfo = calculateCustomCompletionInfo(
    customAmountCents,
    customFrequency,
    scheduleStartDate,
    targetDate
  );

  // Validate schedule selection for the Create Schedule button
  $: isScheduleSelectionValid =
    selectedSchedule !== null &&
    (selectedSchedule.type === 'calculated' ||
      (selectedSchedule.type === 'custom' && customAmountCents > 0));

  interface CustomCompletionInfo {
    completionDate: string;
    paymentsNeeded: number;
    meetsTarget: boolean;
    monthsBehind: number;
  }

  function calculateCustomCompletionInfo(
    amount: number,
    frequency: 'weekly' | 'bi_weekly' | 'monthly',
    startDate: string,
    goalTargetDate: string
  ): CustomCompletionInfo | null {
    if (amount <= 0 || remainingAmount <= 0) return null;

    const paymentsNeeded = Math.ceil(remainingAmount / amount);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    let completionDate: Date;
    switch (frequency) {
      case 'weekly':
        completionDate = new Date(start);
        completionDate.setDate(completionDate.getDate() + (paymentsNeeded - 1) * 7);
        break;
      case 'bi_weekly':
        completionDate = new Date(start);
        completionDate.setDate(completionDate.getDate() + (paymentsNeeded - 1) * 14);
        break;
      case 'monthly':
        completionDate = new Date(start);
        completionDate.setMonth(completionDate.getMonth() + paymentsNeeded - 1);
        break;
    }

    let meetsTarget = true;
    let monthsBehind = 0;

    if (goalTargetDate) {
      const target = new Date(goalTargetDate);
      target.setHours(0, 0, 0, 0);
      meetsTarget = completionDate <= target;
      if (!meetsTarget) {
        monthsBehind = Math.ceil(
          (completionDate.getTime() - target.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
      }
    }

    return {
      completionDate: formatDateShort(completionDate),
      paymentsNeeded,
      meetsTarget,
      monthsBehind,
    };
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

  function calculateFinalPaymentDate(
    schedule: 'weekly' | 'biweekly' | 'monthly',
    startDate: string
  ): string {
    if (!targetDate || !startDate) return '';
    const start = new Date(startDate);
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

  onMount(async () => {
    await loadGoalData();
  });

  async function loadGoalData() {
    loading = true;
    loadError = '';

    try {
      await loadPaymentSources();
      goal = await getSavingsGoal(goalId);

      // Populate form fields
      name = goal.name;
      targetAmountDollars = (goal.target_amount / 100).toFixed(2);
      targetDate = goal.target_date || '';
      isOpenEnded = !goal.target_date;
      linkedAccountId = goal.linked_account_id;
      notes = goal.notes || '';

      // Load linked bills
      try {
        bills = (await getGoalBills(goalId)) as Bill[];
      } catch {
        // Bills endpoint might fail if no bills, that's OK
        bills = [];
      }
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load goal';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!isValid || saving || !hasChanges) return;

    saving = true;
    try {
      const updates: SavingsGoalUpdate = {
        name: name.trim(),
        target_amount: Math.round(parseFloat(targetAmountDollars) * 100),
        target_date: isOpenEnded ? null : targetDate,
        linked_account_id: linkedAccountId,
        notes: notes.trim() || undefined,
      };

      await updateSavingsGoal(goalId, updates);
      success(`Goal "${name}" updated!`);
      goto('/goals');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to update goal');
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    goto('/goals');
  }

  async function handleCreatePaymentSchedule(
    frequency: 'weekly' | 'bi_weekly' | 'monthly',
    amount: number
  ) {
    if (!goal || creatingBill) return;

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

      if (!categoryResponse.ok) {
        throw new Error('Failed to get savings category');
      }

      const category = await categoryResponse.json();

      // Generate bill name
      const billName = `Savings: ${goal.name}`;

      // Calculate day of month for monthly schedules
      let dayOfMonth: number | undefined;
      if (frequency === 'monthly' && scheduleStartDate) {
        // Use split/parseInt to avoid timezone shifts
        dayOfMonth = parseInt(scheduleStartDate.split('-')[2], 10);
      }

      // Create the bill with the selected start date
      const newBill = await createBill({
        name: billName,
        amount: amount,
        billing_period: frequency,
        start_date: scheduleStartDate,
        day_of_month: dayOfMonth,
        payment_source_id: goal.linked_account_id,
        category_id: category.id,
        goal_id: goal.id,
        payment_method: 'manual',
      });

      // Update local bills list immediately to show active schedule
      bills = [...bills, newBill];

      // If "include current month" is checked, create an immediate contribution for this month
      if (includeCurrentMonth) {
        const today = new Date().toISOString().split('T')[0];

        try {
          await apiClient.post(`/api/savings-goals/${goal.id}/contribute`, {
            amount: amount,
            date: today,
          });
        } catch (e) {
          // Show error to user instead of silently failing
          showError(e instanceof Error ? e.message : 'Failed to create current month contribution');
        }
      }

      // Reload bills to ensure sync (optional, but good practice)
      try {
        const serverBills = (await getGoalBills(goalId)) as Bill[];
        // Only update if we got results back, otherwise keep our local optimistic update
        if (serverBills && serverBills.length > 0) {
          bills = serverBills;
        }
      } catch {
        // Ignore fetch errors, rely on local update
      }

      // Reset schedule form
      showScheduleForm = false;

      // Show success modal
      billSuccessModal = {
        billName,
        amount,
        frequency:
          frequency === 'weekly'
            ? 'Weekly'
            : frequency === 'bi_weekly'
              ? 'Every 2 Weeks'
              : 'Monthly',
        startDate: formatDateShort(new Date(scheduleStartDate)),
      };
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to create payment schedule');
    } finally {
      creatingBill = false;
    }
  }

  /**
   * Handler for the unified "Create Schedule" button that uses the selected schedule option
   */
  async function handleCreateScheduleFromSelection() {
    if (!selectedSchedule) return;

    if (selectedSchedule.type === 'calculated') {
      await handleCreatePaymentSchedule(selectedSchedule.frequency, selectedSchedule.amount);
    } else {
      // Custom amount
      await handleCreatePaymentSchedule(customFrequency, customAmountCents);
    }
    // Reset selection after creation
    selectedSchedule = null;
  }

  async function handleRemoveSchedule() {
    if (!activeBill || removingSchedule) return;

    removingSchedule = true;
    try {
      await apiClient.post(`/api/savings-goals/${goalId}/remove-schedule`, {
        bill_id: activeBill.id,
      });

      success('Payment schedule removed');
      confirmModal = null;

      // Reload bills
      try {
        bills = (await getGoalBills(goalId)) as Bill[];
      } catch {
        bills = [];
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to remove schedule');
    } finally {
      removingSchedule = false;
    }
  }

  async function handleComplete() {
    if (!goal || actionLoading) return;

    actionLoading = true;
    try {
      await completeGoal(goal.id);
      success(`Congratulations! "${goal.name}" completed!`);
      confirmModal = null;
      goto('/goals');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to complete goal');
    } finally {
      actionLoading = false;
    }
  }

  async function handleAbandon() {
    if (!goal || actionLoading) return;

    actionLoading = true;
    try {
      await abandonGoal(goal.id);
      success(`"${goal.name}" abandoned`);
      confirmModal = null;
      goto('/goals');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to abandon goal');
    } finally {
      actionLoading = false;
    }
  }

  function closeBillSuccessModal() {
    billSuccessModal = null;
  }

  function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  }

  function getScheduleSummary(bill: Bill): string {
    const amount = formatCurrency(bill.amount);
    const frequency =
      bill.billing_period === 'weekly'
        ? '/week'
        : bill.billing_period === 'bi_weekly'
          ? '/2 weeks'
          : bill.billing_period === 'monthly'
            ? '/month'
            : '';
    return `${amount}${frequency}`;
  }

  function getStatusClass(status: string): string {
    switch (status) {
      case 'saving':
        return 'status-active';
      case 'paused':
        return 'status-paused';
      case 'bought':
        return 'status-completed';
      case 'abandoned':
        return 'status-abandoned';
      default:
        return '';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'saving':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'bought':
        return 'Completed';
      case 'abandoned':
        return 'Abandoned';
      default:
        return status;
    }
  }
</script>

<div class="edit-goal-page">
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
    <h1>Edit Goal</h1>
  </header>

  {#if loading}
    <div class="loading-state">Loading goal...</div>
  {:else if loadError}
    <div class="error-state">
      <p>{loadError}</p>
      <button class="btn-secondary" on:click={() => goto('/goals')}>Back to Goals</button>
    </div>
  {:else if goal}
    <!-- Goal Status Banner -->
    <div class="status-banner {getStatusClass(goal.status)}">
      <span class="status-label">{getStatusLabel(goal.status)}</span>
      <span class="status-progress">
        {formatCurrency(goal.saved_amount)} of {formatCurrency(goal.target_amount)} saved ({goal.progress_percentage}%)
      </span>
    </div>

    <form class="goal-form" on:submit={handleSubmit}>
      <div class="form-section">
        <h2>Goal Details</h2>

        <div class="form-field">
          <label for="name">Goal Name</label>
          <input
            type="text"
            id="name"
            bind:value={name}
            placeholder="e.g., New Laptop, Vacation, Emergency Fund"
            maxlength="100"
            disabled={goal.status === 'bought' || goal.status === 'abandoned'}
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
                disabled={goal.status === 'bought' || goal.status === 'abandoned'}
              />
            </div>
          </div>

          <div class="form-field">
            <label for="targetDate">Target Date</label>
            <input
              type="date"
              id="targetDate"
              bind:value={targetDate}
              min={minDate}
              disabled={goal.status === 'bought' || goal.status === 'abandoned' || isOpenEnded}
            />
            <label class="checkbox-field open-ended-checkbox">
              <input
                type="checkbox"
                bind:checked={isOpenEnded}
                disabled={goal.status === 'bought' || goal.status === 'abandoned'}
              />
              <span>Open-ended goal (no target date)</span>
            </label>
          </div>
        </div>

        <div class="form-field">
          <label for="linkedAccount">Linked Account</label>
          <select
            id="linkedAccount"
            bind:value={linkedAccountId}
            disabled={goal.status === 'bought' || goal.status === 'abandoned'}
          >
            <option value="">Select an account...</option>
            {#each bankAccounts as account (account.id)}
              <option value={account.id}>{account.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-field">
          <label for="notes">Notes (optional)</label>
          <textarea
            id="notes"
            bind:value={notes}
            placeholder="Any additional notes about this goal..."
            rows="3"
            disabled={goal.status === 'bought' || goal.status === 'abandoned'}
          ></textarea>
        </div>
      </div>

      <!-- Payment Schedule Section -->
      {#if goal.status === 'saving'}
        <div class="form-section schedule-section">
          <h2>Payment Schedule</h2>

          {#if hasActiveSchedule && activeBill}
            <!-- Show Active Schedule -->
            <div class="active-schedule">
              <div class="schedule-info">
                <div class="schedule-summary">
                  <span class="schedule-amount">{getScheduleSummary(activeBill)}</span>
                  <span class="schedule-status active">Active</span>
                </div>
                <p class="schedule-name">{activeBill.name}</p>
              </div>
              <button
                type="button"
                class="btn-danger-outline"
                on:click={() => (confirmModal = { type: 'remove-schedule', billId: activeBill.id })}
              >
                Remove Schedule
              </button>
            </div>
          {:else if showScheduleForm}
            <!-- Schedule Creation Form -->
            <div class="schedule-form">
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

              {#if !isOpenEnded && daysUntilTarget > 0}
                <!-- Calculated Amount Section -->
                <div
                  class="schedule-option-box"
                  class:selected={selectedSchedule?.type === 'calculated'}
                >
                  <label class="option-header">
                    <input
                      type="radio"
                      name="scheduleType"
                      checked={selectedSchedule?.type === 'calculated'}
                      on:change={() =>
                        (selectedSchedule = {
                          type: 'calculated',
                          frequency: 'monthly',
                          amount: monthlyPayment,
                        })}
                    />
                    <span class="option-title">Use calculated amount</span>
                    <span class="option-subtitle">Reach goal by target date</span>
                  </label>

                  <div class="payment-options" class:muted={selectedSchedule?.type === 'custom'}>
                    {#if weeklyPayment > 0 && weeksUntilTarget > 0}
                      <label
                        class="payment-option"
                        class:selected={selectedSchedule?.type === 'calculated' &&
                          selectedSchedule.frequency === 'weekly'}
                      >
                        <input
                          type="radio"
                          name="calculatedFrequency"
                          disabled={selectedSchedule?.type === 'custom'}
                          checked={selectedSchedule?.type === 'calculated' &&
                            selectedSchedule.frequency === 'weekly'}
                          on:change={() =>
                            (selectedSchedule = {
                              type: 'calculated',
                              frequency: 'weekly',
                              amount: weeklyPayment,
                            })}
                        />
                        <div class="payment-amount">{formatCurrency(weeklyPayment)}</div>
                        <div class="payment-label">per week</div>
                        <div class="payment-detail">{weeksUntilTarget} payments</div>
                        {#if weeklyFinalDate}
                          <div class="payment-final">Final: {weeklyFinalDate}</div>
                        {/if}
                      </label>
                    {/if}

                    {#if biweeklyPayment > 0 && weeksUntilTarget > 1}
                      <label
                        class="payment-option"
                        class:selected={selectedSchedule?.type === 'calculated' &&
                          selectedSchedule.frequency === 'bi_weekly'}
                      >
                        <input
                          type="radio"
                          name="calculatedFrequency"
                          disabled={selectedSchedule?.type === 'custom'}
                          checked={selectedSchedule?.type === 'calculated' &&
                            selectedSchedule.frequency === 'bi_weekly'}
                          on:change={() =>
                            (selectedSchedule = {
                              type: 'calculated',
                              frequency: 'bi_weekly',
                              amount: biweeklyPayment,
                            })}
                        />
                        <div class="payment-amount">{formatCurrency(biweeklyPayment)}</div>
                        <div class="payment-label">every 2 weeks</div>
                        <div class="payment-detail">{Math.ceil(weeksUntilTarget / 2)} payments</div>
                        {#if biweeklyFinalDate}
                          <div class="payment-final">Final: {biweeklyFinalDate}</div>
                        {/if}
                      </label>
                    {/if}

                    {#if monthlyPayment > 0 && monthsUntilTarget > 0}
                      <label
                        class="payment-option"
                        class:selected={selectedSchedule?.type === 'calculated' &&
                          selectedSchedule.frequency === 'monthly'}
                      >
                        <input
                          type="radio"
                          name="calculatedFrequency"
                          disabled={selectedSchedule?.type === 'custom'}
                          checked={selectedSchedule?.type === 'calculated' &&
                            selectedSchedule.frequency === 'monthly'}
                          on:change={() =>
                            (selectedSchedule = {
                              type: 'calculated',
                              frequency: 'monthly',
                              amount: monthlyPayment,
                            })}
                        />
                        <div class="payment-amount">{formatCurrency(monthlyPayment)}</div>
                        <div class="payment-label">per month</div>
                        <div class="payment-detail">{monthsUntilTarget} payments</div>
                        {#if monthlyFinalDate}
                          <div class="payment-final">Final: {monthlyFinalDate}</div>
                        {/if}
                      </label>
                    {/if}
                  </div>
                </div>

                <!-- OR Divider -->
                <div class="or-divider">
                  <span>OR</span>
                </div>
              {/if}

              <!-- Set Your Own Amount Section -->
              <div class="schedule-option-box" class:selected={selectedSchedule?.type === 'custom'}>
                <label class="option-header">
                  <input
                    type="radio"
                    name="scheduleType"
                    checked={selectedSchedule?.type === 'custom'}
                    on:change={() => (selectedSchedule = { type: 'custom' })}
                  />
                  <span class="option-title">Set your own amount</span>
                </label>

                <div
                  class="custom-amount-form"
                  class:muted={selectedSchedule?.type === 'calculated'}
                >
                  <div class="form-field">
                    <label for="customAmount">Amount</label>
                    <div class="input-with-prefix">
                      <span class="prefix">$</span>
                      <input
                        type="number"
                        id="customAmount"
                        bind:value={customAmountDollars}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        disabled={selectedSchedule?.type === 'calculated'}
                        on:focus={() => (selectedSchedule = { type: 'custom' })}
                      />
                    </div>
                  </div>

                  <div class="form-field">
                    <label for="customFrequency">Frequency</label>
                    <select
                      id="customFrequency"
                      bind:value={customFrequency}
                      disabled={selectedSchedule?.type === 'calculated'}
                      on:focus={() => (selectedSchedule = { type: 'custom' })}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Every 2 Weeks</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {#if customCompletionInfo && selectedSchedule?.type === 'custom'}
                    <div
                      class="custom-amount-result"
                      class:warning={!customCompletionInfo.meetsTarget}
                    >
                      {#if customCompletionInfo.meetsTarget}
                        <div class="result-icon success">
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
                        <div class="result-text">
                          <strong>{customCompletionInfo.paymentsNeeded} payments</strong> - Goal
                          reached by {customCompletionInfo.completionDate}
                        </div>
                      {:else if targetDate}
                        <div class="result-icon warning">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M12 9V13M12 17H12.01M5.07 19H18.93C20.47 19 21.45 17.33 20.68 16L13.75 4C12.98 2.67 11.02 2.67 10.25 4L3.32 16C2.55 17.33 3.53 19 5.07 19Z"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </div>
                        <div class="result-text">
                          <strong>{customCompletionInfo.paymentsNeeded} payments</strong> - Goal
                          reached {customCompletionInfo.completionDate}
                          <span class="result-warning"
                            >({customCompletionInfo.monthsBehind} month{customCompletionInfo.monthsBehind !==
                            1
                              ? 's'
                              : ''} after target)</span
                          >
                        </div>
                      {:else}
                        <div class="result-icon success">
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
                        <div class="result-text">
                          <strong>{customCompletionInfo.paymentsNeeded} payments</strong> - Goal
                          reached by {customCompletionInfo.completionDate}
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="schedule-actions">
                <button
                  type="button"
                  class="btn-primary"
                  on:click={handleCreateScheduleFromSelection}
                  disabled={creatingBill || !isScheduleSelectionValid}
                >
                  {creatingBill ? 'Creating...' : 'Create Schedule'}
                </button>
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
            </div>
          {:else}
            <!-- Add Schedule Button -->
            <div class="no-schedule">
              <p class="no-schedule-text">No payment schedule set up yet.</p>
              {#if !isOpenEnded && daysUntilTarget > 0 && remainingAmount > 0}
                <button type="button" class="btn-accent" on:click={() => (showScheduleForm = true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5V19"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <path
                      d="M5 12H19"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  Add Payment Schedule
                </button>
              {:else if isOpenEnded}
                <button type="button" class="btn-accent" on:click={() => (showScheduleForm = true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5V19"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                    <path
                      d="M5 12H19"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  Set Your Own Amount
                </button>
              {:else if remainingAmount <= 0}
                <p class="schedule-hint">Goal is fully funded!</p>
              {:else}
                <p class="schedule-hint">
                  Target date has passed. Update target date to add a schedule.
                </p>
              {/if}
            </div>
          {/if}
        </div>
      {/if}

      {#if goal.status === 'bought' || goal.status === 'abandoned'}
        <div class="closed-notice">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
            <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          <span>This goal is closed and cannot be edited.</span>
        </div>
      {/if}

      <div class="form-actions">
        <button type="button" class="btn-secondary" on:click={handleCancel}>
          {hasChanges ? 'Cancel' : 'Back'}
        </button>
        {#if goal.status !== 'bought' && goal.status !== 'abandoned'}
          <button type="submit" class="btn-primary" disabled={!isValid || saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        {/if}
      </div>
    </form>
  {/if}
</div>

<!-- Confirmation Modals -->
{#if confirmModal}
  <div
    class="modal-overlay"
    on:click={() => (confirmModal = null)}
    on:keydown={(e) => e.key === 'Escape' && (confirmModal = null)}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
    >
      {#if confirmModal.type === 'complete'}
        <h2>Complete Goal</h2>
        <p>
          Congratulations! Are you ready to mark <strong>"{goal?.name}"</strong> as complete?
        </p>
        {#if goal}
          <p class="modal-info">
            You've saved {formatCurrency(goal.saved_amount)} of your {formatCurrency(
              goal.target_amount
            )} target.
          </p>
        {/if}
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => (confirmModal = null)}>Cancel</button>
          <button class="btn-success" on:click={handleComplete} disabled={actionLoading}>
            {actionLoading ? 'Completing...' : 'Yes, I bought it!'}
          </button>
        </div>
      {:else if confirmModal.type === 'abandon'}
        <h2>Abandon Goal</h2>
        <p>
          Are you sure you want to abandon <strong>"{goal?.name}"</strong>?
        </p>
        <p class="modal-warning">
          This will mark the goal as abandoned. Any scheduled payments will remain on your budget.
        </p>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => (confirmModal = null)}>Cancel</button>
          <button class="btn-danger" on:click={handleAbandon} disabled={actionLoading}>
            {actionLoading ? 'Abandoning...' : 'Abandon Goal'}
          </button>
        </div>
      {:else if confirmModal.type === 'remove-schedule'}
        <h2>Remove Payment Schedule</h2>
        <p>Are you sure you want to remove the payment schedule for this goal?</p>
        <p class="modal-warning">
          Future scheduled payments will be cancelled. Any payments already made will remain
          credited to this goal.
        </p>
        <div class="modal-actions">
          <button class="btn-secondary" on:click={() => (confirmModal = null)}>Cancel</button>
          <button class="btn-danger" on:click={handleRemoveSchedule} disabled={removingSchedule}>
            {removingSchedule ? 'Removing...' : 'Remove Schedule'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Bill Success Modal -->
{#if billSuccessModal}
  <div
    class="modal-overlay"
    on:click={closeBillSuccessModal}
    on:keydown={(e) => e.key === 'Escape' && closeBillSuccessModal()}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
    >
      <div class="success-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <path
            d="M8 12L11 15L16 9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <h2>Payment Schedule Created!</h2>
      <p>
        Your recurring payment <strong>"{billSuccessModal.billName}"</strong> has been created.
      </p>
      <div class="success-details">
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">{formatCurrency(billSuccessModal.amount)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Frequency:</span>
          <span class="detail-value">{billSuccessModal.frequency}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Starting:</span>
          <span class="detail-value">{billSuccessModal.startDate}</span>
        </div>
      </div>
      <p class="success-note">
        This payment will appear in your monthly budget under the <strong>Savings Goals</strong> category.
        When you close (pay) each occurrence, it will automatically add to your saved amount for this
        goal.
      </p>
      <div class="modal-actions center">
        <button class="btn-primary" on:click={closeBillSuccessModal}> Got it! </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .edit-goal-page {
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

  .loading-state,
  .error-state {
    text-align: center;
    padding: var(--space-8);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--error);
  }

  .error-state p {
    margin: 0 0 var(--space-4) 0;
  }

  /* Status Banner */
  .status-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
  }

  .status-banner.status-active {
    background: var(--success-bg);
    border: 1px solid var(--success-border);
  }

  .status-banner.status-paused {
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
  }

  .status-banner.status-completed {
    background: var(--accent-muted);
    border: 1px solid var(--accent-border);
  }

  .status-banner.status-abandoned {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
  }

  .status-label {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
  }

  .status-active .status-label {
    color: var(--success);
  }

  .status-paused .status-label {
    color: var(--warning);
  }

  .status-completed .status-label {
    color: var(--accent);
  }

  .status-abandoned .status-label {
    color: var(--text-tertiary);
  }

  .status-progress {
    font-size: 0.875rem;
    color: var(--text-secondary);
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

  .form-field input:disabled,
  .form-field select:disabled,
  .form-field textarea:disabled {
    background: var(--bg-elevated);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }

  .form-field textarea {
    resize: vertical;
    min-height: 80px;
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

  .field-hint {
    display: block;
    margin-top: var(--space-1);
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  /* Schedule Section */
  .schedule-section {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    border: 1px dashed var(--accent-border);
  }

  .schedule-section h2 {
    color: var(--accent);
  }

  .active-schedule {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--success-border);
  }

  .schedule-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .schedule-summary {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .schedule-amount {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .schedule-status {
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .schedule-status.active {
    background: var(--success-bg);
    color: var(--success);
  }

  .schedule-name {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .schedule-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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

  .checkbox-field span {
    color: var(--text-primary);
    font-weight: 500;
  }

  .checkbox-hint {
    flex-basis: 100%;
    margin-left: 26px;
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 400 !important;
  }

  .open-ended-checkbox {
    margin-top: var(--space-2);
    font-size: 0.875rem;
  }

  .open-ended-checkbox span {
    color: var(--text-secondary);
  }

  /* Schedule Option Box (shared styling for both options) */
  .schedule-option-box {
    background: var(--bg-surface);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    transition: all 0.2s;
  }

  .schedule-option-box:hover {
    border-color: var(--accent);
  }

  .schedule-option-box.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .option-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    margin-bottom: var(--space-3);
  }

  .option-header input[type='radio'] {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .option-title {
    font-weight: 600;
    color: var(--text-primary);
  }

  .option-subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-left: var(--space-1);
  }

  .payment-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-3);
    transition: opacity 0.2s;
  }

  .payment-options.muted {
    opacity: 0.4;
    pointer-events: none;
  }

  .payment-option {
    background: var(--bg-base);
    border: 2px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .payment-option input[type='radio'] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .payment-option:hover:not(.disabled) {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .payment-option.selected {
    border-color: var(--accent);
    background: var(--accent-muted);
    box-shadow: 0 0 0 1px var(--accent);
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

  /* OR Divider */
  .or-divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-4) 0;
  }

  .or-divider::before,
  .or-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-default);
  }

  .or-divider span {
    color: var(--text-tertiary);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Custom Amount Form (inside schedule-option-box) */
  .custom-amount-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: opacity 0.2s;
  }

  .custom-amount-form.muted {
    opacity: 0.4;
    pointer-events: none;
  }

  .custom-amount-form .form-field {
    margin-bottom: 0;
  }

  .custom-amount-form .input-with-prefix {
    background: var(--bg-base);
  }

  .custom-amount-result {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--success-bg);
    border: 1px solid var(--success-border);
    border-radius: var(--radius-sm);
  }

  .custom-amount-result.warning {
    background: var(--warning-bg);
    border-color: var(--warning-border);
  }

  .result-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .result-icon.success {
    color: var(--success);
  }

  .result-icon.warning {
    color: var(--warning);
  }

  .result-text {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .result-warning {
    color: var(--warning);
    font-weight: 500;
  }

  /* Schedule Action Buttons */
  .schedule-actions {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    margin-top: var(--space-2);
  }

  .schedule-actions .btn-primary {
    flex: 1;
  }

  .schedule-actions .btn-text {
    flex-shrink: 0;
  }

  .no-schedule {
    text-align: center;
    padding: var(--space-4);
  }

  .no-schedule-text {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-secondary);
  }

  .schedule-hint {
    margin: var(--space-2) 0 0 0;
    font-size: 0.875rem;
    color: var(--text-tertiary);
    font-style: italic;
  }

  /* Closed Notice */
  .closed-notice {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: var(--section-gap);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--section-gap);
    border-top: 1px solid var(--border-default);
  }

  .btn-primary,
  .btn-secondary,
  .btn-accent,
  .btn-success,
  .btn-danger,
  .btn-danger-outline,
  .btn-text {
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

  .btn-accent {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-accent:hover {
    background: var(--accent-hover);
  }

  .btn-success {
    background: var(--success);
    color: var(--text-inverse);
  }

  .btn-success:hover:not(:disabled) {
    background: var(--success-hover);
  }

  .btn-success:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-danger {
    background: var(--error);
    color: var(--text-inverse);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--error-hover);
  }

  .btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-danger-outline {
    background: transparent;
    color: var(--error);
    border-color: var(--error-border);
    padding: var(--space-2) var(--space-4);
  }

  .btn-danger-outline:hover {
    background: var(--error-muted);
  }

  .btn-text {
    background: transparent;
    color: var(--text-secondary);
    border: none;
  }

  .btn-text:hover {
    color: var(--text-primary);
  }

  @media (max-width: 600px) {
    .form-row {
      grid-template-columns: 1fr;
    }

    .status-banner {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
    }
  }

  /* Modal Styles */
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
  }

  .modal-content {
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
    padding: var(--section-gap);
    max-width: var(--modal-width-sm);
    width: 90%;
    text-align: center;
  }

  .modal-content h2 {
    margin: var(--space-3) 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .modal-content p {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-secondary);
    text-align: left;
  }

  .modal-info {
    color: var(--accent) !important;
    font-weight: 500;
  }

  .modal-warning {
    color: var(--warning) !important;
    font-size: 0.875rem;
  }

  .success-icon {
    color: var(--success);
  }

  .success-details {
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    margin: var(--space-4) 0;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) 0;
  }

  .detail-label {
    color: var(--text-secondary);
  }

  .detail-value {
    color: var(--text-primary);
    font-weight: 500;
  }

  .success-note {
    font-size: 0.875rem;
    color: var(--text-tertiary) !important;
    background: var(--accent-muted);
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--accent);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--section-gap);
  }

  .modal-actions.center {
    justify-content: center;
  }
</style>
