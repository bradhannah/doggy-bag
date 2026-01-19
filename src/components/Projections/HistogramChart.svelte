<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProjectionResponse } from '../../types/projections';

  type ProjectionDay = ProjectionResponse['days'][number];

  export let data: ProjectionResponse;
  export let height = 400;
  export let selectedDate: string | null = null;

  const dispatch = createEventDispatcher<{ select: { day: ProjectionDay } }>();

  // Compute extents
  const balanceValues = data.days
    .map((d) => d.balance)
    .filter((value): value is number => value !== null);
  const maxBalance = Math.max(...balanceValues, ...data.days.map((d) => d.income), 0);
  const minBalance = Math.min(0, ...balanceValues, ...data.days.map((d) => -d.expense));
  const range = maxBalance - minBalance || 1;

  // Layout
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  let width = 800; // Bind to container width

  $: chartWidth = width - padding.left - padding.right;
  $: chartHeight = height - padding.top - padding.bottom;

  const todayStr = new Date().toISOString().split('T')[0];
  const isCurrentMonth = data.start_date.slice(0, 7) === todayStr.slice(0, 7);
  const isPastMonth = data.start_date.slice(0, 7) < todayStr.slice(0, 7);
  const lastDay = new Date(
    Number(data.end_date.slice(0, 4)),
    Number(data.end_date.slice(5, 7)),
    0
  ).getDate();

  const calendarSlots = 31;

  function getDayOfMonth(dateStr: string) {
    return Number(dateStr.slice(8, 10));
  }

  const todaySlot = Number(todayStr.slice(8, 10)) - 1;
  const monthStartWeekday = new Date(`${data.start_date}T00:00:00`).getDay();

  function isPastDay(dateStr: string) {
    if (isPastMonth) return true;
    if (!isCurrentMonth) return false;
    return dateStr < todayStr;
  }

  function xScale(slotIndex: number) {
    return (slotIndex / (calendarSlots - 1)) * chartWidth;
  }

  function yScale(value: number) {
    return chartHeight - ((value - minBalance) / range) * chartHeight;
  }

  $: zeroY = yScale(0);
  $: barWidth = Math.max(6, (chartWidth / calendarSlots) * 0.8);

  // Line path generator (future only)
  type ProjectionDayWithBalance = ProjectionDay & { has_balance: boolean; balance: number | null };

  const hasBalanceDay = (day: ProjectionDay): day is ProjectionDayWithBalance =>
    (day as ProjectionDayWithBalance).has_balance === true && day.balance !== null;

  function getProjectedDays() {
    return (data.days as ProjectionDay[]).filter(hasBalanceDay);
  }

  function getLinePath() {
    const projectedDays = getProjectedDays();
    if (projectedDays.length === 0) return '';

    return (
      'M ' +
      projectedDays
        .map((d) => {
          const slotIndex = getDayOfMonth(d.date) - 1;
          return `${xScale(slotIndex)},${yScale(d.balance ?? 0)}`;
        })
        .join(' L ')
    );
  }

  $: linePath = getLinePath();

  // Tooltip state
  let hoveredIndex: number | null = null;
  let mouseX = 0;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipPlacement: 'above' | 'below' = 'above';
  const tooltipClampPadding = 90;

  function handleMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    mouseX = e.clientX - rect.left - padding.left;
    const currentMouseY = e.clientY - rect.top - padding.top;

    // Find closest day index
    const slotWidth = chartWidth / (calendarSlots - 1);
    const slotIndex = Math.round(mouseX / slotWidth);
    const dayIndex = data.days.findIndex((day) => getDayOfMonth(day.date) - 1 === slotIndex);

    if (dayIndex >= 0 && slotIndex >= 0 && slotIndex < calendarSlots) {
      hoveredIndex = dayIndex;
      const balanceValue = data.days[dayIndex].balance ?? 0;
      const targetY = yScale(balanceValue);
      const verticalGap = 16;
      tooltipPlacement = targetY < chartHeight * 0.3 ? 'below' : 'above';
      tooltipX = padding.left + xScale(slotIndex);
      const minX = padding.left + tooltipClampPadding;
      const maxX = padding.left + chartWidth - tooltipClampPadding;
      tooltipX = Math.min(maxX, Math.max(minX, tooltipX));
      tooltipY =
        padding.top + targetY + (tooltipPlacement === 'below' ? verticalGap : -verticalGap);
    } else {
      hoveredIndex = null;
    }
  }

  function handleChartClick() {
    if (hoveredIndex === null) return;
    dispatch('select', { day: data.days[hoveredIndex] });
  }

  function formatCurrency(cents: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<div
  class="chart-container"
  bind:clientWidth={width}
  role="button"
  tabindex="0"
  aria-label="Monthly Projection Histogram"
  on:mousemove={handleMouseMove}
  on:mouseleave={() => (hoveredIndex = null)}
  on:click={handleChartClick}
>
  <svg {width} {height} role="img" aria-hidden="true">
    <g transform="translate({padding.left}, {padding.top})">
      {#if isPastMonth || isCurrentMonth}
        {@const pastSlots = isPastMonth ? calendarSlots : todaySlot}
        {#if pastSlots > 0}
          <rect x="0" y="0" width={xScale(pastSlots)} height={chartHeight} class="past-region" />
        {/if}
      {/if}

      <!-- Grid lines -->
      <line
        x1="0"
        y1={zeroY}
        x2={chartWidth}
        y2={zeroY}
        stroke="var(--border-subtle)"
        stroke-width="1"
      />

      <!-- Day splits -->
      {#each Array(calendarSlots) as _, slotIndex (slotIndex)}
        {@const dayNumber = slotIndex + 1}
        {@const weekday = (monthStartWeekday + dayNumber - 1) % 7}
        {#if dayNumber <= lastDay}
          <line
            x1={xScale(slotIndex)}
            y1="0"
            x2={xScale(slotIndex)}
            y2={chartHeight}
            stroke={weekday === 1 ? 'var(--border-hover)' : 'var(--border-subtle)'}
            stroke-width={weekday === 1 ? 2 : 1}
            opacity={weekday === 1 ? 0.8 : 0.45}
          />
        {/if}
      {/each}

      <!-- Bars -->
      {#each data.days as day (day.date)}
        {@const slotIndex = getDayOfMonth(day.date) - 1}
        {@const muted = isPastDay(day.date)}
        {#if day.income > 0}
          <rect
            x={xScale(slotIndex) - barWidth / 2}
            y={yScale(day.income)}
            width={barWidth}
            height={zeroY - yScale(day.income)}
            fill="var(--success)"
            opacity={muted ? 0.35 : 0.7}
          />
        {/if}
        {#if day.expense > 0}
          <rect
            x={xScale(slotIndex) - barWidth / 2}
            y={zeroY}
            width={barWidth}
            height={yScale(-day.expense) - zeroY}
            fill="var(--error)"
            opacity={muted ? 0.35 : 0.7}
          />
        {/if}
      {/each}

      <!-- Balance Line -->
      {#if linePath}
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          stroke-width="4"
          stroke-linejoin="round"
        />
      {/if}

      <!-- Deficit Highlight -->
      {#each data.days as day (day.date)}
        {@const slotIndex = getDayOfMonth(day.date) - 1}
        {#if day.is_deficit && !isPastDay(day.date)}
          <circle cx={xScale(slotIndex)} cy={yScale(day.balance ?? 0)} r="3" fill="var(--error)" />
        {/if}
      {/each}

      <!-- Axis Labels -->
      <g class="axis">
        <!-- Y Axis -->
        <text x="-10" y={yScale(maxBalance)} text-anchor="end" dy="4"
          >{formatCurrency(maxBalance)}</text
        >
        <text x="-10" y={zeroY} text-anchor="end" dy="4">$0</text>
        <text x="-10" y={yScale(minBalance)} text-anchor="end" dy="4"
          >{formatCurrency(minBalance)}</text
        >

        <!-- X Axis -->
        {#each Array(calendarSlots) as _, slotIndex (slotIndex)}
          {@const dayNumber = slotIndex + 1}
          {#if dayNumber <= lastDay && (dayNumber === 1 || (dayNumber - 1) % 7 === 0)}
            <text x={xScale(slotIndex)} y={chartHeight + 15} text-anchor="middle" font-size="10">
              {dayNumber}
            </text>
          {/if}
        {/each}
      </g>

      <!-- Hover Indicator -->
      {#if hoveredIndex !== null}
        {@const hoverSlot = getDayOfMonth(data.days[hoveredIndex].date) - 1}
        <line
          x1={xScale(hoverSlot)}
          y1="0"
          x2={xScale(hoverSlot)}
          y2={chartHeight}
          stroke="var(--text-secondary)"
          stroke-dasharray="4"
          opacity="0.5"
        />
      {/if}

      {#if selectedDate}
        {@const selectedSlot = getDayOfMonth(selectedDate) - 1}
        <line
          x1={xScale(selectedSlot)}
          y1="0"
          x2={xScale(selectedSlot)}
          y2={chartHeight}
          class="selected-marker"
        />
      {/if}
    </g>
  </svg>

  <!-- Tooltip (HTML overlay) -->
  {#if hoveredIndex !== null}
    {@const day = data.days[hoveredIndex]}
    <div
      class="tooltip"
      class:tooltip-below={tooltipPlacement === 'below'}
      style="left: {tooltipX}px; top: {tooltipY}px;"
    >
      <div class="tooltip-header">{formatDate(day.date)}</div>
      {#if hasBalanceDay(day as ProjectionDay)}
        <div class="tooltip-balance">Balance: {formatCurrency(day.balance ?? 0)}</div>
      {/if}
      {#if day.income > 0}
        <div class="tooltip-row income">Income: +{formatCurrency(day.income)}</div>
      {/if}
      {#if day.expense > 0}
        <div class="tooltip-row expense">Expense: -{formatCurrency(day.expense)}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    box-shadow: var(--shadow-light);
    cursor: pointer;
  }

  text {
    fill: var(--text-secondary);
    font-size: 0.6875rem;
  }

  .past-region {
    fill: var(--bg-hover);
    opacity: 0.5;
  }

  .tooltip {
    position: absolute;
    transform: translateX(-50%);
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    box-shadow: var(--shadow-medium);
    pointer-events: none;
    z-index: 2;
    min-width: var(--panel-width-sm);
    max-width: var(--panel-width-md);
  }

  .tooltip-below {
    transform: translate(-50%, 0%);
  }

  .tooltip-header {
    font-weight: 600;
    margin-bottom: var(--space-1);
    color: var(--text-primary);
  }

  .tooltip-balance {
    font-weight: 600;
    color: var(--accent);
  }

  .tooltip-row.income {
    color: var(--success);
  }
  .tooltip-row.expense {
    color: var(--error);
  }

  .selected-marker {
    stroke: var(--accent);
    stroke-width: 2;
    opacity: 0.8;
  }
</style>
