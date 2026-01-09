<script lang="ts">
  import type { IncomeCategoryGroup, IncomeWithContribution } from '../../stores/incomes';
  import NotesModal from '../shared/NotesModal.svelte';

  export let incomesByCategory: IncomeCategoryGroup[];
  export let totalMonthlyIncome: number;
  export let onView: (income: IncomeWithContribution) => void;
  export let onEdit: (income: IncomeWithContribution) => void;
  export let onDelete: (income: IncomeWithContribution) => void;
  export let getPaymentSourceName: (id: string) => string;

  // Notes modal state
  let notesModalOpen = false;
  let notesModalTitle = '';
  let notesModalContent = '';

  function showNotes(income: IncomeWithContribution) {
    notesModalTitle = `${income.name} - Notes`;
    notesModalContent = income.metadata?.notes || '';
    notesModalOpen = true;
  }

  function closeNotes() {
    notesModalOpen = false;
  }

  // Check if income has any metadata to display
  function hasMetadata(income: IncomeWithContribution): boolean {
    return !!(
      income.metadata?.bank_transaction_name ||
      income.metadata?.account_number ||
      income.metadata?.account_url ||
      income.metadata?.notes
    );
  }

  // Shorten URL for display
  function shortenUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url.substring(0, 20) + (url.length > 20 ? '...' : '');
    }
  }

  function formatAmount(income: IncomeWithContribution): string {
    const amount = income.amount / 100;
    const monthly = income.monthlyContribution / 100;

    if (income.billing_period === 'monthly') {
      return `$${amount.toFixed(2)}/mo`;
    } else {
      return `$${amount.toFixed(2)} ($${monthly.toFixed(2)}/mo)`;
    }
  }

  function formatPeriod(period: string): string {
    const map: Record<string, string> = {
      monthly: 'monthly',
      bi_weekly: 'bi-weekly',
      weekly: 'weekly',
      semi_annually: 'semi-annual',
    };
    return map[period] || period;
  }

  function formatCurrency(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  function getCategoryName(group: IncomeCategoryGroup): string {
    return group.category?.name || 'Uncategorized';
  }

  function getCategoryColor(group: IncomeCategoryGroup): string {
    return group.category?.color || '#888888';
  }

  // Generate a subtle background tint from the category color
  function hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(100, 100, 100, ${alpha})`; // fallback
  }

  // Total income count (used for display but currently commented out)
  $: _totalIncomes = incomesByCategory.reduce((sum, group) => sum + group.incomes.length, 0);
</script>

<div class="incomes-by-category">
  <div class="list-container">
    <!-- Column Header -->
    <div class="column-header">
      <span class="col-name">Name</span>
      <span class="col-period">Period</span>
      <span class="col-source">Deposit To</span>
      <span class="col-amount">Amount</span>
      <span class="col-actions">Actions</span>
    </div>

    <!-- Category Groups -->
    {#each incomesByCategory as group (group.category?.id || 'uncategorized')}
      {@const catColor = getCategoryColor(group)}
      {@const headerBg = hexToRgba(catColor, 0.08)}

      <!-- Category Header -->
      <div class="category-header" style="--cat-color: {catColor}; background: {headerBg};">
        <div class="category-title">
          <span class="category-color" style="background-color: {catColor};"></span>
          <span class="category-name">{getCategoryName(group)}</span>
          <span class="category-count">({group.incomes.length})</span>
        </div>
        <div class="category-subtotal-header">
          <span>{formatCurrency(group.subtotal)}/mo</span>
        </div>
      </div>

      <!-- Incomes in Category -->
      {#if group.incomes.length === 0}
        <div class="empty-category">No incomes in this category</div>
      {:else}
        {#each group.incomes as income (income.id)}
          <div
            class="income-row"
            class:has-metadata={hasMetadata(income)}
            on:click={() => onView(income)}
          >
            <div class="col-name">
              <span class="income-name">{income.name}</span>
              {#if hasMetadata(income)}
                <div class="metadata-row">
                  {#if income.metadata?.bank_transaction_name}
                    <span class="metadata-item" title="Bank transaction name">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      {income.metadata.bank_transaction_name}
                    </span>
                  {/if}
                  {#if income.metadata?.account_number}
                    <span class="metadata-item" title="Account number">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                        />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {income.metadata.account_number}
                    </span>
                  {/if}
                  {#if income.metadata?.account_url}
                    <a
                      href={income.metadata.account_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="metadata-link"
                      title={income.metadata.account_url}
                      on:click|stopPropagation
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      {shortenUrl(income.metadata.account_url)}
                    </a>
                  {/if}
                  {#if income.metadata?.notes}
                    <button
                      class="metadata-notes-btn"
                      title="View notes"
                      on:click|stopPropagation={() => showNotes(income)}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Notes
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
            <span class="col-period">{formatPeriod(income.billing_period)}</span>
            <span class="col-source">{getPaymentSourceName(income.payment_source_id)}</span>
            <span class="col-amount" class:zero={income.amount === 0}>
              {formatAmount(income)}
            </span>
            <span class="col-actions" on:click|stopPropagation>
              <button class="btn-icon" on:click={() => onEdit(income)} title="Edit">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button class="btn-icon btn-danger" on:click={() => onDelete(income)} title="Delete">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                </svg>
              </button>
            </span>
          </div>
        {/each}
      {/if}
    {/each}
  </div>

  <!-- Total Monthly Income -->
  <div class="total-row">
    <span class="total-label">TOTAL MONTHLY INCOME</span>
    <span class="total-value">{formatCurrency(totalMonthlyIncome)}/mo</span>
  </div>
</div>

<!-- Notes Modal -->
<NotesModal
  title={notesModalTitle}
  notes={notesModalContent}
  open={notesModalOpen}
  on:close={closeNotes}
/>

<style>
  .incomes-by-category {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Container with border and rounded edges */
  .list-container {
    background: var(--bg-surface);
    border-radius: 16px;
    border: 2px solid var(--border-default);
    overflow: hidden;
  }

  /* Column Header */
  .column-header {
    display: grid;
    grid-template-columns: 1fr 90px 130px 150px 80px;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-elevated);
    border-bottom: 2px solid var(--border-default);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
  }

  /* Category Header - styled to match DetailedMonthView */
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-radius: 8px;
    border-left: 4px solid var(--cat-color);
    margin: 8px 8px 8px 8px;
  }

  .category-header:first-of-type {
    margin-top: 8px;
  }

  .category-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .category-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .category-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .category-count {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .category-subtotal-header {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--success);
  }

  /* Empty Category */
  .empty-category {
    padding: 16px 16px 16px 44px;
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    font-style: italic;
  }

  /* Income Row */
  .income-row {
    display: grid;
    grid-template-columns: 1fr 90px 130px 150px 80px;
    gap: 12px;
    padding: 12px 16px;
    padding-left: 32px;
    align-items: center;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .income-row.has-metadata {
    align-items: start;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .income-row:hover {
    background: var(--success-muted);
  }

  .income-row .col-name {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .income-row .income-name {
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Metadata Row */
  .metadata-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .metadata-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.6875rem;
    color: var(--text-secondary);
    background: var(--bg-hover);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .metadata-item svg {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .metadata-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.6875rem;
    color: var(--accent);
    background: var(--accent-muted);
    padding: 2px 6px;
    border-radius: 4px;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .metadata-link:hover {
    background: var(--accent-muted);
    filter: brightness(1.2);
  }

  .metadata-link svg {
    flex-shrink: 0;
  }

  .metadata-notes-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.6875rem;
    color: var(--warning);
    background: var(--warning-muted);
    padding: 2px 6px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .metadata-notes-btn:hover {
    filter: brightness(1.2);
  }

  .metadata-notes-btn svg {
    flex-shrink: 0;
  }

  .income-row .col-period {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .income-row .col-source {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .income-row .col-amount {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--success);
    text-align: right;
  }

  .income-row .col-amount.zero {
    color: var(--text-tertiary);
    font-style: italic;
  }

  .income-row .col-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  /* Icon Buttons */
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: none;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-icon:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn-icon.btn-danger:hover {
    background: var(--error);
    color: var(--text-on-error, #fff);
  }

  /* Total Row */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--bg-elevated);
    border-top: 2px solid var(--border-default);
    margin-top: 16px;
    border-radius: 8px;
  }

  .total-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.5px;
  }

  .total-value {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--success);
  }

  /* Responsive - hide source column on narrow screens */
  @media (max-width: 768px) {
    .column-header,
    .income-row {
      grid-template-columns: 1fr 80px 130px 70px;
    }

    .col-source {
      display: none;
    }

    .column-header .col-source {
      display: none;
    }
  }

  @media (max-width: 600px) {
    .column-header,
    .income-row {
      grid-template-columns: 1fr 100px 70px;
    }

    .col-period {
      display: none;
    }

    .column-header .col-period {
      display: none;
    }
  }
</style>
