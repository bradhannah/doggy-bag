<script lang="ts">
  /**
   * ClaimsSummary - Where the insurance money stands: what's ready to submit,
   * what's approved but not received, and what has arrived this year.
   */
  import { claimsSummary } from '../../stores/insurance-claims';
  import { formatCurrency } from '$lib/utils/format';

  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;
</script>

{#if $claimsSummary}
  <div class="summary-cards">
    <div class="summary-card accent" class:empty={$claimsSummary.to_submit_count === 0}>
      <div class="summary-label">To submit</div>
      <div class="summary-value">{formatCurrency($claimsSummary.to_submit_amount)}</div>
      <div class="summary-note">
        {$claimsSummary.to_submit_count === 0
          ? 'Nothing waiting on you'
          : `${plural($claimsSummary.to_submit_count, 'plan', 'plans')} waiting on you`}
      </div>
    </div>
    <div class="summary-card warning" class:empty={$claimsSummary.awaiting_payment_count === 0}>
      <div class="summary-label">Awaiting payment</div>
      <div class="summary-value">{formatCurrency($claimsSummary.awaiting_payment_amount)}</div>
      <div class="summary-note">
        {$claimsSummary.awaiting_payment_count === 0
          ? 'No approvals outstanding'
          : `${plural($claimsSummary.awaiting_payment_count, 'approval', 'approvals')} not received`}
        {#if $claimsSummary.waiting_count > 0}
          · {plural($claimsSummary.waiting_count, 'decision', 'decisions')} pending
        {/if}
      </div>
      {#if $claimsSummary.needs_amount_count > 0}
        <div class="summary-note attention">
          {plural($claimsSummary.needs_amount_count, 'plan is', 'plans are')} missing an amount
        </div>
      {/if}
    </div>
    <div class="summary-card">
      <div class="summary-label">Received in {$claimsSummary.received_year}</div>
      <div class="summary-value success">
        {formatCurrency($claimsSummary.received_this_year_amount)}
      </div>
      <div class="summary-note">
        across {plural($claimsSummary.received_this_year_claims, 'claim', 'claims')} ·
        <a href="/setup?tab=insurance-plans">Plans</a> ·
        <a href="/setup?tab=family">Family</a>
      </div>
    </div>
  </div>
{/if}

<style>
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--card-gap);
    margin-bottom: var(--section-gap);
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }

  .summary-card.accent:not(.empty) {
    background: var(--accent-muted);
    border-color: var(--accent-border);
  }

  .summary-card.warning:not(.empty) {
    background: var(--warning-muted);
    border-color: var(--warning-border);
  }

  .summary-label {
    font-size: var(--font-size-2xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-secondary);
  }

  .summary-card.accent:not(.empty) .summary-label {
    color: var(--accent);
  }

  .summary-card.warning:not(.empty) .summary-label {
    color: var(--warning);
  }

  .summary-value {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
  }

  .summary-value.success {
    color: var(--success);
  }

  .summary-note {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .summary-note.attention {
    color: var(--error);
    font-weight: 500;
  }

  .summary-note a {
    color: var(--accent);
    text-decoration: none;
  }

  .summary-note a:hover {
    text-decoration: underline;
  }
</style>
