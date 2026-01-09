<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import {
    detailedMonth,
    detailedMonthData,
    detailedMonthLoading,
    detailedMonthError,
  } from '../../stores/detailed-month';
  import CategorySection from './CategorySection.svelte';
  import SummarySidebar from './SummarySidebar.svelte';
  import SectionStatsHeader from './SectionStatsHeader.svelte';
  import MonthNotCreated from '../MonthNotCreated.svelte';
  import { success, error as showError } from '../../stores/toast';
  import { widthMode, compactMode, hidePaidItems, goToMonth, columnMode } from '../../stores/ui';
  import { paymentSources, loadPaymentSources } from '../../stores/payment-sources';
  import { monthsStore, monthExists, monthIsReadOnly } from '../../stores/months';

  export let month: string;

  // Scroll position preservation
  let savedScrollY: number | null = null;
  let restoreScrollAfterLoad = false;
  let isRefreshing = false; // Track if we're doing a soft refresh vs initial load

  function _formatCurrency(cents: number): string {
    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(dollars);
  }

  function formatMonthDisplay(monthStr: string): string {
    const [year, monthNum] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  onMount(() => {
    // Sync URL month param to the global store
    goToMonth(month);
    detailedMonth.loadMonth(month);
    monthsStore.loadMonth(month);
    loadPaymentSources();
  });

  onDestroy(() => {
    detailedMonth.clear();
  });

  // Reload when month changes
  $: if (month) {
    detailedMonth.loadMonth(month);
    monthsStore.loadMonth(month);
  }

  // Helper: check if a category section is complete (all closed or empty)
  // Use is_closed because that indicates the user has marked the item as done
  function isSectionComplete(section: { items: { is_closed: boolean }[] }): boolean {
    return section.items.length === 0 || section.items.every((item) => item.is_closed);
  }

  // Helper: count closed items in a section
  function countClosedItems(section: { items: { is_closed: boolean }[] }): number {
    return section.items.filter((item) => item.is_closed).length;
  }

  // Sort sections: incomplete first, complete/empty last
  function sortSections<T extends { items: { is_closed: boolean }[] }>(sections: T[]): T[] {
    return [...sections].sort((a, b) => {
      const aComplete = isSectionComplete(a);
      const bComplete = isSectionComplete(b);
      if (aComplete === bComplete) return 0;
      return aComplete ? 1 : -1;
    });
  }

  // Sorted sections (complete/empty at bottom)
  $: sortedBillSections = $detailedMonthData ? sortSections($detailedMonthData.billSections) : [];
  $: sortedIncomeSections = $detailedMonthData
    ? sortSections($detailedMonthData.incomeSections)
    : [];

  // Calculate total items for empty state checks
  $: totalBills = sortedBillSections.reduce((sum, section) => sum + section.items.length, 0);
  $: totalIncomes = sortedIncomeSections.reduce((sum, section) => sum + section.items.length, 0);

  // Separate active vs completed sections (always sorted: active first, completed last)
  $: activeBillSections = sortedBillSections.filter((s) => !isSectionComplete(s));
  $: completedBillSections = sortedBillSections.filter((s) => isSectionComplete(s));
  $: activeIncomeSections = sortedIncomeSections.filter((s) => !isSectionComplete(s));
  $: completedIncomeSections = sortedIncomeSections.filter((s) => isSectionComplete(s));

  // Calculate hidden counts for each active section (when toggle is on, this shows "X hidden" in header)
  // Map from section category id to hidden count
  $: billHiddenCounts = new Map(
    activeBillSections.map((s) => [s.category.id, $hidePaidItems ? countClosedItems(s) : 0])
  );
  $: incomeHiddenCounts = new Map(
    activeIncomeSections.map((s) => [s.category.id, $hidePaidItems ? countClosedItems(s) : 0])
  );

  // When toggle ON: filter closed items from active sections
  // When toggle OFF: show all items
  // Type assertion needed to maintain proper types after filter
  type BillSection = (typeof sortedBillSections)[number];
  type IncomeSection = (typeof sortedIncomeSections)[number];

  $: displayActiveBillSections = (
    $hidePaidItems
      ? activeBillSections.map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.is_closed),
        }))
      : activeBillSections
  ) as BillSection[];

  $: displayActiveIncomeSections = (
    $hidePaidItems
      ? activeIncomeSections.map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.is_closed),
        }))
      : activeIncomeSections
  ) as IncomeSection[];

  // Refresh all data with scroll position preservation - exported for external use
  export function refreshData() {
    // Save current scroll position before refresh
    savedScrollY = window.scrollY;
    restoreScrollAfterLoad = true;
    isRefreshing = true;

    detailedMonth.refresh();
    monthsStore.loadMonth(month);
  }

  /* eslint-disable svelte/infinite-reactive-loop -- scroll restoration intentionally clears flags after execution */
  // Restore scroll position after data loads
  $: if ($detailedMonthData && restoreScrollAfterLoad && savedScrollY !== null) {
    restoreScrollPosition();
  }

  // Clear isRefreshing when loading completes
  $: if (!$detailedMonthLoading && isRefreshing) {
    isRefreshing = false;
  }

  async function restoreScrollPosition() {
    // Wait for Svelte DOM updates
    await tick();

    // Wait for browser to complete layout and paint (double RAF ensures all children painted)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (savedScrollY !== null) {
          window.scrollTo(0, savedScrollY);
          savedScrollY = null;
          restoreScrollAfterLoad = false;
        }
      });
    });
  }
  /* eslint-enable svelte/infinite-reactive-loop */

  // Create month data
  let creating = false;
  async function handleCreateMonth() {
    creating = true;
    try {
      const created = await monthsStore.createMonth(month);
      if (created) {
        success(`Month ${month} created`);
        // Reload detailed view
        detailedMonth.loadMonth(month);
      }
    } catch {
      showError('Failed to create month');
    } finally {
      creating = false;
    }
  }

  // Handle reopened event - scroll to the item's new location and highlight it
  async function handleReopened(event: CustomEvent<{ id: string; type: 'bill' | 'income' }>) {
    const { id, type } = event.detail;

    // Wait for Svelte to update the DOM after the store update
    await tick();

    // Wait for browser layout/paint with double RAF
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Find the element by data attribute
        const selector = type === 'bill' ? `[data-bill-id="${id}"]` : `[data-income-id="${id}"]`;
        const element = document.querySelector(selector);

        if (element) {
          // Scroll the element into view (centered)
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight class for animation
          element.classList.add('just-reopened');

          // Remove the class after animation completes
          element.addEventListener(
            'animationend',
            () => {
              element.classList.remove('just-reopened');
            },
            { once: true }
          );

          // Fallback timeout in case animationend doesn't fire
          setTimeout(() => {
            element.classList.remove('just-reopened');
          }, 2000);
        }
      });
    });
  }

  // Handle closed event - scroll to the item's new location and highlight it
  async function handleClosed(event: CustomEvent<{ id: string; type: 'bill' | 'income' }>) {
    const { id, type } = event.detail;

    // Wait for Svelte to update the DOM after the store update
    await tick();

    // Wait for browser layout/paint with double RAF
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Find the element by data attribute
        const selector = type === 'bill' ? `[data-bill-id="${id}"]` : `[data-income-id="${id}"]`;
        const element = document.querySelector(selector);

        if (element) {
          // Scroll the element into view (centered)
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight class for animation
          element.classList.add('just-reopened');

          // Remove the class after animation completes
          element.addEventListener(
            'animationend',
            () => {
              element.classList.remove('just-reopened');
            },
            { once: true }
          );

          // Fallback timeout in case animationend doesn't fire
          setTimeout(() => {
            element.classList.remove('just-reopened');
          }, 2000);
        }
      });
    });
  }
</script>

<div class="detailed-view" class:compact={$compactMode}>
  <div
    class="content-wrapper"
    class:medium={$widthMode === 'medium'}
    class:wide={$widthMode === 'wide'}
  >
    {#if $monthIsReadOnly && $monthExists}
      <div class="read-only-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2" />
          <path
            d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <span>This month is locked. Unlock it from Manage Months to make changes.</span>
      </div>
    {/if}

    {#if $detailedMonthLoading && !isRefreshing && !$detailedMonthData}
      <div class="loading-state">
        <p>Loading detailed view...</p>
      </div>
    {:else if !$monthExists}
      <MonthNotCreated
        monthDisplay={formatMonthDisplay(month)}
        {creating}
        on:create={handleCreateMonth}
      />
    {:else if $detailedMonthError}
      <div class="error-state">
        <p>{$detailedMonthError}</p>
        <button on:click={() => detailedMonth.loadMonth(month)}>Retry</button>
      </div>
    {:else if $detailedMonthData}
      <div class="detailed-layout">
        <!-- Left: Summary Sidebar -->
        <SummarySidebar
          paymentSources={$paymentSources}
          bankBalances={$detailedMonthData.bankBalances}
          tallies={$detailedMonthData.tallies}
          leftoverBreakdown={$detailedMonthData.leftoverBreakdown}
          payoffSummaries={$detailedMonthData.payoffSummaries ?? []}
          {month}
          readOnly={$monthIsReadOnly}
          on:refresh={refreshData}
        />

        <!-- Right: Main Content -->
        <div class="main-content">
          <div class="sections-container" class:single-column={$columnMode === '1-col'}>
            <!-- Bills Section -->
            <section class="section bills-section">
              <div class="section-header">
                <h2>Bills</h2>
              </div>

              {#if totalBills > 0}
                <SectionStatsHeader
                  sections={sortedBillSections}
                  tally={$detailedMonthData.tallies.totalExpenses}
                  type="bills"
                />
              {/if}

              {#if totalBills === 0}
                <p class="empty-text">No bill categories. Add categories in Setup.</p>
              {:else}
                <!-- Active (incomplete) categories -->
                {#each displayActiveBillSections as section (section.category.id)}
                  <CategorySection
                    {section}
                    type="bills"
                    {month}
                    compactMode={$compactMode}
                    readOnly={$monthIsReadOnly}
                    hiddenCount={billHiddenCounts.get(section.category.id) ?? 0}
                    collapsed={false}
                    on:refresh={refreshData}
                    on:reopened={handleReopened}
                    on:closed={handleClosed}
                  />
                {/each}

                <!-- Divider + Completed categories -->
                {#if completedBillSections.length > 0}
                  <div class="completed-divider">
                    <span>Completed</span>
                  </div>

                  {#each completedBillSections as section (section.category.id)}
                    <CategorySection
                      {section}
                      type="bills"
                      {month}
                      compactMode={$compactMode}
                      readOnly={$monthIsReadOnly}
                      hiddenCount={0}
                      collapsed={$hidePaidItems}
                      on:refresh={refreshData}
                      on:reopened={handleReopened}
                      on:closed={handleClosed}
                    />
                  {/each}
                {/if}
              {/if}
            </section>

            <!-- Income Section -->
            <section class="section income-section">
              <div class="section-header">
                <h2>Income</h2>
              </div>

              {#if totalIncomes > 0}
                <SectionStatsHeader
                  sections={sortedIncomeSections}
                  tally={$detailedMonthData.tallies.totalIncome}
                  type="income"
                />
              {/if}

              {#if totalIncomes === 0}
                <p class="empty-text">No income categories. Add categories in Setup.</p>
              {:else}
                <!-- Active (incomplete) categories -->
                {#each displayActiveIncomeSections as section (section.category.id)}
                  <CategorySection
                    {section}
                    type="income"
                    {month}
                    compactMode={$compactMode}
                    readOnly={$monthIsReadOnly}
                    hiddenCount={incomeHiddenCounts.get(section.category.id) ?? 0}
                    collapsed={false}
                    on:refresh={refreshData}
                    on:reopened={handleReopened}
                    on:closed={handleClosed}
                  />
                {/each}

                <!-- Divider + Completed categories -->
                {#if completedIncomeSections.length > 0}
                  <div class="completed-divider">
                    <span>Completed</span>
                  </div>

                  {#each completedIncomeSections as section (section.category.id)}
                    <CategorySection
                      {section}
                      type="income"
                      {month}
                      compactMode={$compactMode}
                      readOnly={$monthIsReadOnly}
                      hiddenCount={0}
                      collapsed={$hidePaidItems}
                      on:refresh={refreshData}
                      on:reopened={handleReopened}
                      on:closed={handleClosed}
                    />
                  {/each}
                {/if}
              {/if}
            </section>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .detailed-view {
    padding: var(--content-padding);
  }

  .content-wrapper {
    /* Container query context for responsive internal layout */
    container-type: inline-size;
    container-name: content;
    /* Explicit width based on content: summary sidebar + gap + 2 panels + gap between panels */
    width: calc(
      var(--summary-sidebar-width) + var(--space-6) + (2 * var(--panel-width-medium)) +
        var(--space-6)
    );
    max-width: 100%;
    /* Center with auto margins */
    margin-left: auto;
    margin-right: auto;
    transition:
      width 0.3s ease,
      margin 0.3s ease;
  }

  .content-wrapper.medium {
    /* Same calculation for medium mode */
    width: calc(
      var(--summary-sidebar-width) + var(--space-6) + (2 * var(--panel-width-medium)) +
        var(--space-6)
    );
  }

  .content-wrapper.wide {
    /* Wide mode uses flexible width */
    width: 100%;
    max-width: 100%;
    margin-left: 0;
    margin-right: 0;
  }

  /* Main layout with sidebar */
  .detailed-layout {
    display: grid;
    grid-template-columns: var(--summary-sidebar-width) auto;
    gap: var(--space-6);
    align-items: start;
  }

  .main-content {
    min-width: 0; /* Prevent grid blowout */
  }

  /* Medium mode: two columns side by side */
  .sections-container {
    display: grid;
    grid-template-columns: var(--panel-width-medium) var(--panel-width-medium);
    gap: var(--space-6);
  }

  /* Single column mode: stack vertically (Bills on top, Income below) */
  /* Uses 2/3 of the total 2-column width, centered */
  .sections-container.single-column {
    grid-template-columns: var(--panel-width-single-medium);
    justify-content: center;
  }

  .sections-container.single-column .section {
    width: var(--panel-width-single-medium);
    min-width: 0;
    max-width: var(--panel-width-single-medium);
  }

  /* Wide mode: flexible grid with two columns */
  .content-wrapper.wide .sections-container {
    grid-template-columns: minmax(var(--panel-width-min-wide), 1fr) minmax(
        var(--panel-width-min-wide),
        1fr
      );
  }

  /* Wide mode + Single column: use wider single column width, centered */
  .content-wrapper.wide .sections-container.single-column {
    grid-template-columns: var(--panel-width-single-wide);
    justify-content: center;
  }

  .content-wrapper.wide .sections-container.single-column .section {
    width: var(--panel-width-single-wide);
    min-width: 0;
    max-width: var(--panel-width-single-wide);
  }

  .section {
    background: var(--bg-surface);
    border-radius: var(--radius-xl);
    border: 1px solid var(--border-default);
    padding: var(--space-6);
    /* Medium mode: fixed width panels */
    width: var(--panel-width-medium);
    min-width: var(--panel-width-medium);
    max-width: var(--panel-width-medium);
    overflow-x: hidden; /* Prevent horizontal scrollbar */
  }

  /* Wide mode: flexible panels */
  .content-wrapper.wide .section {
    width: auto;
    min-width: var(--panel-width-min-wide);
    max-width: none;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--section-gap);
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--error);
  }

  .error-state button {
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-4);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-inverse);
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .error-state button:hover {
    opacity: 0.9;
  }

  .empty-text {
    color: var(--text-tertiary);
    text-align: center;
    padding: 40px 20px;
  }

  /* Completed categories divider */
  .completed-divider {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin: var(--space-4) 0 var(--space-3) 0;
    color: var(--text-tertiary);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .completed-divider::before,
  .completed-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-default);
  }

  /* Compact mode for divider */
  .detailed-view.compact .completed-divider {
    margin: var(--space-2) 0;
    font-size: 0.6rem;
  }

  /* Read-only banner styles */
  .read-only-banner {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--warning-bg);
    border: 1px solid var(--warning-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--section-gap);
    color: var(--warning);
  }

  .read-only-banner svg {
    flex-shrink: 0;
  }

  .read-only-banner span {
    font-size: 0.875rem;
  }

  /* Responsive: stack summary sidebar on smaller screens
     Breakpoint = nav sidebar (220) + summary sidebar (260) + gap (24) + main content min (600) = 1104px
     Rounded to 1100px for cleaner value */
  @media (max-width: 1100px) {
    .detailed-layout {
      grid-template-columns: 1fr;
    }
  }

  /* Container query: 2-column layout when content-wrapper is wide enough
     Note: CSS container queries don't support var() or calc() in conditions.
     Medium mode breakpoint = 2 * var(--panel-width-medium) + var(--space-6) = 2*660 + 24 = 1344px
     Wide mode breakpoint = 2 * var(--panel-width-min-wide) + var(--space-6) = 2*720 + 24 = 1464px */
  @container content (min-width: 1344px) {
    /* Medium mode: two fixed columns */
    .sections-container {
      grid-template-columns: var(--panel-width-medium) var(--panel-width-medium);
    }
  }

  @container content (min-width: 1464px) {
    /* Wide mode: two flexible columns */
    .content-wrapper.wide .sections-container {
      grid-template-columns: minmax(var(--panel-width-min-wide), 1fr) minmax(
          var(--panel-width-min-wide),
          1fr
        );
    }
  }

  /* Compact mode styles */
  .detailed-view.compact {
    padding: var(--space-3);
  }

  .detailed-view.compact .detailed-layout {
    gap: var(--space-4);
  }

  .detailed-view.compact .sections-container {
    gap: var(--space-4);
  }

  .detailed-view.compact .section {
    padding: var(--space-3);
    border-radius: var(--radius-lg);
  }

  .detailed-view.compact .section-header {
    margin-bottom: var(--space-3);
    gap: var(--space-2);
  }

  .detailed-view.compact .section-header h2 {
    font-size: 1rem;
  }

  .detailed-view.compact .empty-text {
    padding: var(--section-gap) var(--space-3);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .detailed-view {
      padding: 0 var(--content-padding-mobile) var(--content-padding-mobile)
        var(--content-padding-mobile);
    }
  }

  /* Reopened item highlight animation */
  :global(.bill-row-container.just-reopened),
  :global(.income-row-container.just-reopened) {
    animation: reopened-highlight 1.5s ease-out;
  }

  @keyframes reopened-highlight {
    0% {
      background: var(--accent-muted);
      box-shadow: 0 0 0 2px var(--accent-border);
      border-radius: 8px;
    }
    100% {
      background: transparent;
      box-shadow: none;
    }
  }
</style>
