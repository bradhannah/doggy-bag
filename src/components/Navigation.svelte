<script lang="ts">
  import { page } from '$app/stores';
  import { currentMonth, sidebarCollapsed, navCollapsed, narrowWindow } from '../stores/ui';
  import {
    isTauri,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    getZoomPercentage,
    ZOOM_CONFIG,
  } from '../stores/settings';

  $: currentPath = $page.url.pathname;

  // Check if we're on the details page (any month)
  $: isDetailsActive = currentPath.startsWith('/month/');
  // Check if we're on the settings page
  $: isSettingsActive = currentPath.startsWith('/settings');
  // Check if we're on the savings page
  $: isSavingsActive = currentPath.startsWith('/savings');
  // Check if we're on the insurance page
  $: isInsuranceActive = currentPath.startsWith('/insurance');
  // Check if we're on the projections page
  $: isProjectionsActive = currentPath.startsWith('/projections');
  // Check if we're on the todos page
  $: isTodosActive = currentPath.startsWith('/todos');
  // Check if we're on the notes page
  $: isNotesActive = currentPath.startsWith('/notes');
  // Check if we're on the calendar page
  $: isCalendarActive = currentPath.startsWith('/calendar');

  $: isManageActive = currentPath.startsWith('/setup');

  // Check if in Tauri environment (for zoom controls)
  const inTauri = isTauri();

  // Current zoom percentage display
  $: zoomPercentage = getZoomPercentage($zoomLevel);
  $: canZoomIn = $zoomLevel < ZOOM_CONFIG.max;
  $: canZoomOut = $zoomLevel > ZOOM_CONFIG.min;
</script>

<nav class="sidebar" class:collapsed={$navCollapsed} aria-label="Main">
  <div class="sidebar-header">
    <span class="app-title">Doggy Bag</span>
    {#if !$narrowWindow}
      <button
        class="icon-btn collapse-toggle"
        on:click={() => sidebarCollapsed.toggle()}
        aria-label={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d={$sidebarCollapsed ? 'M9 18L15 12L9 6' : 'M15 18L9 12L15 6'}
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    {/if}
  </div>

  <div class="nav-scroll">
    <ul class="nav-list">
      <li>
        <a href="/" class="nav-item" class:active={currentPath === '/'} title="Dashboard">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="1"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <span>Dashboard</span>
        </a>
      </li>
    </ul>

    <p class="group-label">Money</p>
    <ul class="nav-list">
      <li>
        <a
          href="/month/{$currentMonth}"
          class="nav-item"
          class:active={isDetailsActive}
          title="Budget"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" />
            <path
              d="M9 12h6M9 16h4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>Budget</span>
        </a>
      </li>
      <li>
        <a href="/savings" class="nav-item" class:active={isSavingsActive} title="Savings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 7H5a2 2 0 0 1 0-4h13v4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <path
              d="M3 5v14a2 2 0 0 0 2 2h15V7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
          </svg>
          <span>Savings</span>
        </a>
      </li>
      <li>
        <a
          href="/projections"
          class="nav-item"
          class:active={isProjectionsActive}
          title="Projections"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 17l6-6 4 4 8-8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M15 7h6v6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Projections</span>
        </a>
      </li>
      <li>
        <a href="/calendar" class="nav-item" class:active={isCalendarActive} title="Calendar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M3 10h18M8 3v4M16 3v4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>Calendar</span>
        </a>
      </li>
    </ul>

    <p class="group-label">Organize</p>
    <ul class="nav-list">
      <li>
        <a href="/todos" class="nav-item" class:active={isTodosActive} title="Todos">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M8 12l3 3 5-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Todos</span>
        </a>
      </li>
      <li>
        <a href="/notes" class="nav-item" class:active={isNotesActive} title="Notes">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
            <path d="M14 3v6h6" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          </svg>
          <span>Notes</span>
        </a>
      </li>
      <li>
        <a href="/insurance" class="nav-item" class:active={isInsuranceActive} title="Insurance">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 21s8-4 8-10V5l-8-3-8 3v6c0 6 8 10 8 10z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </svg>
          <span>Insurance</span>
        </a>
      </li>
    </ul>

    <!-- Manage and Settings stay at the bottom when there is room -->
    <ul class="nav-list bottom-nav">
      <li>
        <a href="/setup" class="nav-item" class:active={isManageActive} title="Manage">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          <span>Manage</span>
        </a>
      </li>
      <li>
        <a href="/settings" class="nav-item" class:active={isSettingsActive} title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Settings</span>
        </a>
      </li>
    </ul>

    <!-- Zoom Control (Tauri only) -->
    {#if inTauri}
      <div class="zoom-control">
        <span class="zoom-label">Zoom</span>
        <div class="zoom-buttons">
          <button
            class="icon-btn bordered"
            on:click={() => zoomOut()}
            disabled={!canZoomOut}
            aria-label="Zoom out"
            title="Zoom out (Ctrl+-)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
          <button
            class="zoom-percentage"
            on:click={() => resetZoom()}
            title="Reset to 100% (Ctrl+0)"
          >
            {zoomPercentage}
          </button>
          <button
            class="icon-btn bordered"
            on:click={() => zoomIn()}
            disabled={!canZoomIn}
            aria-label="Zoom in"
            title="Zoom in (Ctrl++)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5V19M5 12H19"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    {/if}
  </div>
</nav>

<style>
  /* The whole column scrolls when the window is short, so every link stays reachable */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: var(--sidebar-width);
    height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    transition: width 0.2s ease;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    height: var(--header-height);
    padding: 0 var(--space-3) 0 var(--space-5);
    box-sizing: border-box;
    border-bottom: 1px solid var(--border-default);
    flex-shrink: 0;
  }

  .app-title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--accent);
    white-space: nowrap;
    overflow: hidden;
  }

  .nav-scroll {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--space-3) var(--space-2);
    overflow-x: hidden;
    overflow-y: auto;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: calc(var(--space-1) / 2);
  }

  .group-label {
    margin: var(--space-4) 0 var(--space-1);
    padding: 0 var(--space-3);
    font-size: var(--font-size-2xs);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .bottom-nav {
    margin-top: auto;
    padding-top: var(--space-3);
    border-top: 1px solid var(--border-default);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    height: var(--control-height);
    padding: 0 var(--space-3);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: var(--font-size-md);
    font-weight: 500;
    white-space: nowrap;
    transition:
      background-color 0.15s,
      color 0.15s;
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--accent-muted);
    color: var(--accent);
    font-weight: 600;
  }

  .nav-item svg {
    flex-shrink: 0;
  }

  .zoom-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--control-height);
    margin-top: var(--space-2);
    padding: 0 var(--space-1) 0 var(--space-3);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .zoom-buttons {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .zoom-percentage {
    min-width: calc(var(--space-8) + var(--space-1));
    height: var(--control-height-sm);
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    font-size: var(--font-size-xs);
    cursor: pointer;
  }

  .zoom-percentage:hover {
    background: var(--bg-hover);
  }

  /* ========================================
     COLLAPSED (icon rail)
     ======================================== */

  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .sidebar.collapsed .sidebar-header {
    justify-content: center;
    padding: 0;
  }

  .sidebar.collapsed .app-title,
  .sidebar.collapsed .nav-item span,
  .sidebar.collapsed .zoom-label {
    display: none;
  }

  /* Group labels become plain dividers in the icon rail */
  .sidebar.collapsed .group-label {
    margin: var(--space-3) var(--space-2);
    padding: 0;
    font-size: 0;
    line-height: 0;
    border-top: 1px solid var(--border-default);
  }

  .sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 0;
  }

  .sidebar.collapsed .zoom-control {
    height: auto;
    justify-content: center;
    padding: 0;
  }

  .sidebar.collapsed .zoom-buttons {
    flex-direction: column;
  }
</style>
