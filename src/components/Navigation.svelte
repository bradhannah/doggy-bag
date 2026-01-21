<script lang="ts">
  import { page } from '$app/stores';
  import { currentMonth, sidebarCollapsed } from '../stores/ui';
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
  // Check if we're on the goals page
  $: isGoalsActive = currentPath.startsWith('/goals');

  // Check if in Tauri environment (for zoom controls)
  const inTauri = isTauri();

  // Current zoom percentage display
  $: zoomPercentage = getZoomPercentage($zoomLevel);
  $: canZoomIn = $zoomLevel < ZOOM_CONFIG.max;
  $: canZoomOut = $zoomLevel > ZOOM_CONFIG.min;
</script>

<nav class="sidebar" class:collapsed={$sidebarCollapsed}>
  <div class="sidebar-header">
    <div class="header-row">
      <h2 class="app-title">Doggy Bag</h2>
      <button
        class="collapse-toggle"
        on:click={() => sidebarCollapsed.toggle()}
        title={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          {#if $sidebarCollapsed}
            <!-- Chevron right (expand) -->
            <path
              d="M9 18L15 12L9 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {:else}
            <!-- Chevron left (collapse) -->
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/if}
        </svg>
      </button>
    </div>
  </div>

  <!-- Main navigation -->
  <ul class="nav-list">
    <li>
      <a href="/" class="nav-item" class:active={currentPath === '/'} title="Dashboard">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2" />
        </svg>
        <span>Dashboard</span>
      </a>
    </li>
  </ul>

  <div class="nav-separator"></div>

  <ul class="nav-list">
    <li>
      <a
        href="/month/{$currentMonth}"
        class="nav-item"
        class:active={isDetailsActive}
        title="Budget"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
          <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" />
          <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M9 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <span>Budget</span>
      </a>
    </li>
    <li>
      <a href="/savings" class="nav-item" class:active={isSavingsActive} title="Savings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <text
            x="12"
            y="16"
            text-anchor="middle"
            fill="currentColor"
            font-size="16"
            font-weight="bold"
            font-family="system-ui, sans-serif">$</text
          >
        </svg>
        <span>Savings</span>
      </a>
    </li>
    <li>
      <a href="/goals" class="nav-item" class:active={isGoalsActive} title="Goals">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
        <span>Goals</span>
      </a>
    </li>
    <li>
      <a href="/insurance" class="nav-item" class:active={isInsuranceActive} title="Insurance">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 6v6c0 5.5 3.5 10.6 8 12 4.5-1.4 8-6.5 8-12V6l-8-4z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Insurance</span>
      </a>
    </li>
    <li>
      <a
        href="/projections"
        class="nav-item"
        class:active={isProjectionsActive}
        title="Projections"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M4 19H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path
            d="M7 15L11 11L14 14L19 9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="7" cy="15" r="1" fill="currentColor" />
          <circle cx="11" cy="11" r="1" fill="currentColor" />
          <circle cx="14" cy="14" r="1" fill="currentColor" />
          <circle cx="19" cy="9" r="1" fill="currentColor" />
        </svg>
        <span>Projections</span>
      </a>
    </li>
  </ul>

  <!-- Separator and secondary nav items -->
  <div class="nav-separator"></div>

  <ul class="nav-list bottom-nav">
    <li>
      <a href="/setup" class="nav-item" class:active={currentPath === '/setup'} title="Manage">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke="currentColor"
            stroke-width="2"
          />
        </svg>
        <span>Manage</span>
      </a>
    </li>
  </ul>

  <!-- Footer with Zoom and Settings -->
  <div class="sidebar-footer">
    <!-- Zoom Control (Tauri only) -->
    {#if inTauri}
      <div class="zoom-control">
        <button
          class="zoom-button"
          on:click={() => zoomOut()}
          disabled={!canZoomOut}
          title="Zoom out (Ctrl+-)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
        <button class="zoom-percentage" on:click={() => resetZoom()} title="Reset to 100% (Ctrl+0)">
          {zoomPercentage}
        </button>
        <button
          class="zoom-button"
          on:click={() => zoomIn()}
          disabled={!canZoomIn}
          title="Zoom in (Ctrl++)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="footer-separator"></div>
    {/if}

    <!-- Settings link in footer -->
    <a
      href="/settings"
      class="settings-footer-link"
      class:active={isSettingsActive}
      title="Settings"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>Settings</span>
    </a>
  </div>
</nav>

<style>
  .sidebar {
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-default);
    padding: var(--section-gap) 0;
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    transition: width 0.2s ease;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 0 var(--space-4) var(--space-4);
    border-bottom: 1px solid var(--border-default);
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .app-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--accent);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    transition: opacity 0.2s ease;
  }

  .nav-list {
    list-style: none;
    padding: var(--space-3);
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .nav-separator {
    margin: 0 var(--space-3);
    border-top: 1px solid var(--border-default);
  }

  .bottom-nav {
    padding-top: var(--space-3);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .nav-item:hover {
    background: var(--accent-muted);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .nav-item svg {
    flex-shrink: 0;
  }

  /* Footer with zoom and settings */
  .sidebar-footer {
    margin-top: auto;
    padding: var(--space-3);
    border-top: 1px solid var(--border-default);
  }

  /* Zoom control */
  .zoom-control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  .zoom-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .zoom-button:hover:not(:disabled) {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .zoom-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .zoom-percentage {
    min-width: 50px;
    padding: var(--space-1) var(--space-2);
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .zoom-percentage:hover {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .footer-separator {
    border-top: 1px solid var(--border-default);
    margin: 0 0 var(--space-2) 0;
  }

  /* Settings link in footer */
  .settings-footer-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.2s;
    margin-top: var(--space-1);
  }

  .settings-footer-link:hover {
    background: var(--accent-muted);
    color: var(--text-secondary);
  }

  .settings-footer-link.active {
    background: var(--accent-muted);
    color: var(--accent);
  }

  .settings-footer-link svg {
    flex-shrink: 0;
  }

  /* Collapse toggle button */
  .collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .collapse-toggle:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  /* ========================================
     COLLAPSED SIDEBAR STYLES
     ======================================== */

  .sidebar.collapsed {
    width: var(--sidebar-collapsed-width);
  }

  /* Header adjustments when collapsed */
  .sidebar.collapsed .sidebar-header {
    padding: 0 var(--space-2) var(--space-4);
  }

  .sidebar.collapsed .header-row {
    justify-content: center;
  }

  .sidebar.collapsed .app-title {
    display: none;
  }

  /* Nav list adjustments when collapsed */
  .sidebar.collapsed .nav-list {
    padding: var(--space-3) var(--space-2);
  }

  .sidebar.collapsed .nav-item {
    justify-content: center;
    padding: var(--space-3);
  }

  .sidebar.collapsed .nav-item span {
    display: none;
  }

  .sidebar.collapsed .nav-separator {
    margin: 0 var(--space-2);
  }

  /* Footer adjustments when collapsed */
  .sidebar.collapsed .sidebar-footer {
    padding: var(--space-3) var(--space-2);
  }

  .sidebar.collapsed .zoom-control {
    flex-direction: column;
  }

  .sidebar.collapsed .zoom-percentage {
    min-width: auto;
    font-size: 0.65rem;
  }

  .sidebar.collapsed .settings-footer-link {
    justify-content: center;
    padding: var(--space-2);
  }

  .sidebar.collapsed .settings-footer-link span {
    display: none;
  }
</style>
