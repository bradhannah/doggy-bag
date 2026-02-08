<script lang="ts">
  /**
   * ClaimsSummary - Summary statistics for insurance claims
   * Shows pending count/amount, closed count/reimbursed, and quick links
   */
  import { claimsSummary } from '../../stores/insurance-claims';
  import { activePlans } from '../../stores/insurance-plans';
  import { activeCategories } from '../../stores/insurance-categories';
  import { formatCurrency } from '$lib/utils/format';
</script>

{#if $claimsSummary}
  <div class="summary-cards">
    <div class="summary-card">
      <div class="summary-label">Pending Claims</div>
      <div class="summary-value">{$claimsSummary.pending_count}</div>
      <div class="summary-amount warning">{formatCurrency($claimsSummary.pending_amount)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Closed Claims</div>
      <div class="summary-value">{$claimsSummary.closed_count}</div>
      <div class="summary-amount success">{formatCurrency($claimsSummary.reimbursed_amount)}</div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Active Plans</div>
      <div class="summary-value">{$activePlans.length}</div>
      <div class="summary-link">
        <a href="/setup">Manage in Setup</a>
      </div>
    </div>
    <div class="summary-card">
      <div class="summary-label">Categories</div>
      <div class="summary-value">{$activeCategories.length}</div>
      <div class="summary-link">
        <a href="/setup">Manage in Setup</a>
      </div>
    </div>
  </div>
{/if}

<style>
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--card-gap);
    margin-bottom: var(--section-gap);
  }

  .summary-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
  }

  .summary-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  .summary-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }

  .summary-amount {
    font-size: 0.875rem;
    font-weight: 500;
    margin-top: var(--space-1);
  }

  .summary-amount.warning {
    color: var(--warning);
  }

  .summary-amount.success {
    color: var(--success);
  }

  .summary-link {
    margin-top: var(--space-2);
  }

  .summary-link a {
    color: var(--accent);
    font-size: 0.75rem;
    text-decoration: none;
  }

  .summary-link a:hover {
    text-decoration: underline;
  }
</style>
