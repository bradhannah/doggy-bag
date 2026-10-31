<script lang="ts">
  import { onDestroy } from 'svelte';
  import { apiClient } from '$lib/api/client';
  import { currentMonth, formatMonthDisplay } from '../../stores/ui';
  import { success, error as showError } from '../../stores/toast';
  import { formatCurrency, dollarsToCents } from '$lib/utils/format';
  import type {
    SavingsAccountSummary,
    SavingsMonthSummary,
    SavingsPlanResult,
  } from '$lib/types/budget-workflow';
  import PageHeader from '../../components/shared/PageHeader.svelte';
  import MonthPickerHeader from '../../components/MonthPickerHeader.svelte';
  import MonthNotCreated from '../../components/MonthNotCreated.svelte';
  import ConfirmDialog from '../../components/shared/ConfirmDialog.svelte';
  import SavingsPlanModal from '../../components/Savings/SavingsPlanModal.svelte';

  let data: SavingsMonthSummary | null = null;
  let loading = true;
  let creating = false;
  let error = '';
  let requestId = 0;
  let loadedMonth = '';
  let edits: Record<string, { start: string; end: string }> = {};
  let pendingSaves = 0;
  let showPlan = false;
  let planAccount = '';
  let pushing = false;
  let showPushConfirmation = false;
  let pushDestinationMonth = '';
  let pendingPush: { month: string; finalBalances: Record<string, number> } | null = null;

  onDestroy(() => {
    requestId++;
  });
  $: if ($currentMonth) load($currentMonth);
  $: groups = [
    {
      name: 'Savings Accounts',
      total: 'Total Savings',
      accounts: data?.accounts.filter((account) => !account.is_investment) ?? [],
    },
    {
      name: 'Investment Accounts',
      total: 'Total Investments',
      accounts: data?.accounts.filter((account) => account.is_investment) ?? [],
    },
  ];

  async function load(month = $currentMonth) {
    const id = ++requestId;
    loading = true;
    error = '';
    if (month !== loadedMonth) {
      showPlan = false;
      showPushConfirmation = false;
    }
    try {
      const result = (await apiClient.get(`/api/months/${month}/savings`)) as SavingsMonthSummary;
      if (id !== requestId) return;
      data = result;
      loadedMonth = month;
      edits = Object.fromEntries(
        result.accounts.map((account) => [
          account.id,
          {
            start: ((account.start ?? 0) / 100).toFixed(2),
            end: account.end == null ? '' : (account.end / 100).toFixed(2),
          },
        ])
      );
    } catch (e) {
      if (id === requestId) error = e instanceof Error ? e.message : 'Could not load savings';
    } finally {
      if (id === requestId) loading = false;
    }
  }

  function start(account: SavingsAccountSummary): number {
    return dollarsToCents(edits[account.id]?.start || '0');
  }
  function estimate(account: SavingsAccountSummary): number {
    return start(account) + account.planned;
  }
  function final(account: SavingsAccountSummary): number {
    const value = edits[account.id]?.end?.trim() ?? '';
    return value === '' ? estimate(account) : dollarsToCents(value);
  }
  function percent(change: number, opening: number): string {
    if (opening === 0) return change === 0 ? '0%' : 'N/A';
    const value = (change / Math.abs(opening)) * 100;
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }
  function totals(accounts: SavingsAccountSummary[]) {
    return accounts.reduce(
      (sum, account) => ({
        start: sum.start + start(account),
        planned: sum.planned + account.planned,
        recorded: sum.recorded + account.recorded,
        estimate: sum.estimate + estimate(account),
        end: sum.end + final(account),
      }),
      { start: 0, planned: 0, recorded: 0, estimate: 0, end: 0 }
    );
  }

  async function saveBalance(account: SavingsAccountSummary, field: 'start' | 'end') {
    if (!data?.exists || data.is_read_only || loading || loadedMonth !== $currentMonth) return;
    const month = loadedMonth;
    const id = requestId;
    const raw = edits[account.id][field].trim();
    const cleaned = raw.replace(/[$,\s]/g, '');
    if (cleaned && !/^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(cleaned)) {
      showError('Enter a valid amount with up to two decimal places.');
      edits[account.id][field] =
        field === 'end' && account.end == null ? '' : ((account[field] ?? 0) / 100).toFixed(2);
      edits = { ...edits };
      return;
    }
    const amount = field === 'end' && !cleaned ? null : dollarsToCents(cleaned);
    pendingSaves++;
    try {
      await apiClient.putPath(`/api/months/${month}/savings-balances`, {
        [field]: { [account.id]: amount },
      });
      if (id !== requestId || !data) return;
      data = {
        ...data,
        accounts: data.accounts.map((item) =>
          item.id === account.id ? { ...item, [field]: amount ?? undefined } : item
        ),
      };
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Balance was not saved');
      if (id === requestId) {
        edits[account.id][field] =
          field === 'end' && account.end == null ? '' : ((account[field] ?? 0) / 100).toFixed(2);
        edits = { ...edits };
      }
    } finally {
      pendingSaves--;
    }
  }

  async function createMonth() {
    if (creating) return;
    const month = $currentMonth;
    creating = true;
    try {
      await apiClient.post(`/api/months/${month}/generate`, {});
      success(`Budget created for ${formatMonthDisplay(month)}`);
      if ($currentMonth === month) await load(month);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not create the budget');
    } finally {
      creating = false;
    }
  }

  function openPlan(accountId = '') {
    planAccount = accountId;
    showPlan = true;
  }
  function planSaved(result: SavingsPlanResult) {
    showPlan = false;
    if (!result.recurring) success('Savings transfer added to this budget');
    else if (result.added)
      success(`Recurring plan saved and added to ${formatMonthDisplay(result.month)}’s budget`);
    else success('Recurring savings plan saved. New budgets will include it.');
    void load();
  }

  async function pushFinalBalances(overwrite = false) {
    if (!data || pushing) return;
    if (!overwrite)
      pendingPush = {
        month: loadedMonth,
        finalBalances: Object.fromEntries(
          data.accounts.map((account) => [account.id, final(account)])
        ),
      };
    const payload = pendingPush;
    if (!payload) return;
    pushing = true;
    try {
      const result = (await apiClient.post(`/api/months/${payload.month}/push-savings-balances`, {
        finalBalances: payload.finalBalances,
        overwrite,
      })) as { destinationMonth: string; requiresConfirmation: boolean };
      if (payload.month !== $currentMonth) return;
      pushDestinationMonth = result.destinationMonth;
      showPushConfirmation = result.requiresConfirmation;
      if (!result.requiresConfirmation) {
        pendingPush = null;
        success(`Final balances pushed to ${formatMonthDisplay(result.destinationMonth)}`);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Could not copy balances');
    } finally {
      pushing = false;
    }
  }
</script>

<svelte:head><title>Savings — {$currentMonth}</title></svelte:head>
<MonthPickerHeader showRefresh={true} onRefresh={() => load()} />

<div class="savings-page">
  <PageHeader
    title="Savings"
    subtitle="Plan transfers in Budget, track recorded contributions here, and enter observed account balances."
  >
    <button
      slot="actions"
      class="btn btn-primary"
      on:click={() => openPlan()}
      disabled={loading || !data?.accounts.some((account) => account.is_active)}
      >Plan a transfer</button
    >
  </PageHeader>
  {#if loading}
    <p role="status">Loading savings…</p>
  {:else if error}
    <p class="error" role="alert">{error}</p>
    <button class="btn btn-secondary" on:click={() => load()}>Retry</button>
  {:else if data}
    {#if !data.exists}
      <MonthNotCreated
        monthDisplay={formatMonthDisplay(data.month)}
        {creating}
        hint="Create this budget to include recurring savings plans and track this month’s balances."
        on:create={createMonth}
      />
    {:else if data.accounts.length === 0}
      <p>
        No savings or investment accounts yet. <a href="/setup?tab=payment-sources"
          >Add an account in Manage</a
        >.
      </p>
    {:else}
      <div class="actions">
        <a href="/month/{$currentMonth}">Open this month’s Budget</a>
        <button
          class="btn btn-secondary"
          on:click={() => pushFinalBalances()}
          disabled={pushing || pendingSaves > 0}
        >
          {pushing ? 'Pushing…' : 'Push Final to Next Month'}
        </button>
      </div>
      {#if data.is_read_only}<p class="notice">
          This month is locked. Unlock it in Manage to edit balances or budget entries.
        </p>{/if}
      {#each groups as group (group.name)}
        {#if group.accounts.length}
          {@const sum = edits && totals(group.accounts)}
          <section class="account-section" class:single-account={group.accounts.length === 1}>
            <h3>{group.name}</h3>
            <div class="table-scroll">
              <table>
                <thead
                  ><tr
                    ><th scope="col">Account</th><th scope="col">Start</th><th scope="col"
                      >Planned</th
                    ><th scope="col">Recorded</th><th scope="col">Est. EOM</th><th scope="col"
                      >Final</th
                    ><th scope="col">Change</th></tr
                  ></thead
                >
                <tbody>
                  {#each group.accounts as account (account.id)}
                    {@const opening = edits && start(account)}
                    {@const closing = edits && final(account)}
                    <tr class="account-row">
                      <th scope="row"
                        ><span class="account-name">{account.name}</span
                        >{#if !account.is_active}<small>Archived account</small>{/if}
                        {#if account.is_active}<button
                            class="text-button"
                            on:click={() => openPlan(account.id)}>Plan transfer</button
                          >{/if}
                      </th>
                      <td data-label="Start"
                        ><input
                          type="text"
                          inputmode="decimal"
                          aria-label={`${account.name} starting balance`}
                          bind:value={edits[account.id].start}
                          on:blur={() => saveBalance(account, 'start')}
                          disabled={data.is_read_only || pendingSaves > 0}
                        /></td
                      >
                      <td data-label="Planned">{formatCurrency(account.planned)}</td>
                      <td data-label="Recorded">{formatCurrency(account.recorded)}</td>
                      <td data-label="Est. EOM">{formatCurrency(edits && estimate(account))}</td>
                      <td data-label="Final"
                        ><input
                          type="text"
                          inputmode="decimal"
                          aria-label={`${account.name} final balance`}
                          bind:value={edits[account.id].end}
                          placeholder={((edits && estimate(account)) / 100).toFixed(2)}
                          on:blur={() => saveBalance(account, 'end')}
                          disabled={data.is_read_only || pendingSaves > 0}
                        /></td
                      >
                      <td
                        data-label="Change"
                        class:positive={closing > opening}
                        class:negative={closing < opening}
                        >{formatCurrency(closing - opening)}<small
                          >{percent(closing - opening, opening)}</small
                        ></td
                      >
                    </tr>
                    {#if account.entries.length}
                      <tr
                        ><td colspan="7" class="entry-details"
                          ><details>
                            <summary
                              >{account.entries.length} budget {account.entries.length === 1
                                ? 'entry'
                                : 'entries'} for {account.name}</summary
                            >
                            <ul>
                              {#each account.entries as entry (entry.id)}<li>
                                  <span>{entry.name}</span><span
                                    >Planned {formatCurrency(entry.planned)} · recorded {formatCurrency(
                                      entry.recorded
                                    )}</span
                                  >
                                </li>{/each}
                            </ul>
                          </details></td
                        ></tr
                      >
                    {/if}
                  {/each}
                </tbody>
                <tfoot
                  ><tr
                    ><th scope="row">{group.total}</th><td data-label="Start"
                      >{formatCurrency(sum.start)}</td
                    ><td data-label="Planned">{formatCurrency(sum.planned)}</td><td
                      data-label="Recorded">{formatCurrency(sum.recorded)}</td
                    ><td data-label="Est. EOM">{formatCurrency(sum.estimate)}</td><td
                      data-label="Final">{formatCurrency(sum.end)}</td
                    ><td data-label="Change">{formatCurrency(sum.end - sum.start)}</td></tr
                  ></tfoot
                >
              </table>
            </div>
          </section>
        {/if}
      {/each}
      {#if groups.every((group) => group.accounts.length > 0)}
        {@const sum = edits && totals(data.accounts)}
        <p class="grand-total">
          Total savings &amp; investments: <strong>{formatCurrency(sum.end)}</strong> · planned {formatCurrency(
            sum.planned
          )} · recorded {formatCurrency(sum.recorded)}
        </p>
      {/if}
      <p class="hint">
        Planned and recorded amounts come from Budget contributions and withdrawals. Edit or record
        a transfer there. Recording transfers does not update your bank balances.
      </p>
      <p class="hint">
        Balances save when you leave a field. Leave Final blank to use the estimate; enter 0 for an
        empty account. Change includes contributions, withdrawals, interest, and investment
        movement.
      </p>
    {/if}
  {/if}
</div>

{#if showPlan && data}
  {#key $currentMonth}<SavingsPlanModal
      summary={data}
      initialAccount={planAccount}
      onClose={() => (showPlan = false)}
      onSaved={planSaved}
    />{/key}
{/if}
<ConfirmDialog
  open={showPushConfirmation}
  title="Overwrite next month's starting balances?"
  message={`Some starting balances for ${pushDestinationMonth ? formatMonthDisplay(pushDestinationMonth) : 'next month'} already contain values. Continuing will replace them with ${formatMonthDisplay(pendingPush?.month ?? $currentMonth)}'s final balances or estimates.`}
  confirmText={pushing ? 'Overwriting…' : 'Overwrite and Continue'}
  confirmStyle="danger"
  on:confirm={() => !pushing && pushFinalBalances(true)}
  on:cancel={() => {
    showPushConfirmation = false;
    pendingPush = null;
  }}
/>

<style>
  .savings-page {
    max-width: var(--content-max-md);
    margin: 0 auto;
    padding: var(--space-4) var(--content-padding);
  }
  h3 {
    margin: 0;
  }
  .actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .account-section {
    margin-block: var(--space-5);
    padding: var(--space-4);
    border: thin solid var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--bg-elevated);
  }
  h3 {
    font-size: 1rem;
    margin-bottom: var(--space-3);
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    min-width: var(--content-max-sm);
    border-collapse: collapse;
    table-layout: fixed;
  }
  th,
  td {
    padding: var(--space-3) var(--space-2);
    text-align: right;
    vertical-align: top;
  }
  /* Plain values share the inputs' centreline: their first line is one control tall */
  .account-row > td {
    line-height: var(--control-height);
  }
  /* Names may wrap, so pad the first line to the control height instead */
  .account-name {
    display: block;
    padding-block: calc((var(--control-height) - 1.5em) / 2);
    line-height: 1.5;
    font-weight: 600;
  }
  th:first-child {
    width: var(--tab-sidebar-width);
    text-align: left;
    overflow-wrap: anywhere;
  }
  thead {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }
  thead th,
  tfoot td,
  tfoot th {
    border-bottom: thin solid var(--border-default);
  }
  tfoot {
    font-weight: 600;
    border-top: thin solid var(--border-default);
  }
  input {
    width: 100%;
    min-width: 0;
    text-align: right;
    padding: var(--space-2);
    border: thin solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-base);
    color: var(--text-primary);
  }
  input:focus {
    outline: thin solid var(--accent);
  }
  small {
    display: block;
    color: var(--text-secondary);
    font-weight: 400;
    font-size: var(--font-size-xs);
    line-height: 1.4;
  }
  .positive {
    color: var(--success);
  }
  .negative,
  .error {
    color: var(--error);
  }
  .entry-details {
    text-align: left;
    padding-top: 0;
    color: var(--text-secondary);
  }
  summary {
    cursor: pointer;
  }
  ul {
    padding-left: var(--space-5);
  }
  li {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-block: var(--space-1);
  }
  .notice {
    padding: var(--space-4);
    border: thin solid var(--accent-border);
    border-radius: var(--radius-md);
    background: var(--accent-muted);
  }
  .hint {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  .grand-total {
    padding: var(--space-4);
    background: var(--bg-surface);
    border-radius: var(--radius-md);
  }
  a,
  .text-button {
    color: var(--accent);
  }
  button {
    cursor: pointer;
  }
  .text-button {
    display: block;
    padding: var(--space-1) 0;
    border: none;
    background: transparent;
    font-weight: 400;
  }
  button:disabled,
  input:disabled {
    opacity: 0.6;
    cursor: default;
  }
  @media (max-width: 70rem) {
    table {
      min-width: 0;
    }
    table,
    tbody,
    tfoot {
      display: block;
    }
    thead {
      position: absolute;
      width: var(--space-1);
      height: var(--space-1);
      overflow: hidden;
      clip-path: inset(50%);
    }
    .account-row,
    tfoot tr {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    th:first-child {
      grid-column: 1 / -1;
      width: auto;
    }
    td {
      text-align: left;
    }
    td[data-label]::before {
      content: attr(data-label);
      display: block;
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 400;
      margin-bottom: var(--space-1);
    }
    .entry-details {
      display: block;
    }
    tfoot td,
    tfoot th {
      border-bottom: none;
    }
    .single-account tfoot {
      display: none;
    }
  }
</style>
