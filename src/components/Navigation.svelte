<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { undoStore, canUndo, undoLoading } from '../stores/undo';
  import { addToast } from '../stores/toast';
  import { apiClient } from '../lib/api/client';
  import { currentMonth, goToCurrentMonth, getCurrentMonth } from '../stores/ui';
  import { 
    isTauri, 
    zoomLevel, 
    zoomIn, 
    zoomOut, 
    resetZoom, 
    getZoomPercentage,
    ZOOM_CONFIG 
  } from '../stores/settings';
  
  $: currentPath = $page.url.pathname;
  
  // Check if we're on the details page (any month)
  $: isDetailsActive = currentPath.startsWith('/month/');
  // Check if we're on the manage page
  $: isManageActive = currentPath.startsWith('/manage');
  // Check if we're on the settings page
  $: isSettingsActive = currentPath.startsWith('/settings');
  
  // Check if in Tauri environment (for zoom controls)
  $: inTauri = isTauri();
  
  // Current zoom percentage display
  $: zoomPercentage = getZoomPercentage($zoomLevel);
  $: canZoomIn = $zoomLevel < ZOOM_CONFIG.max;
  $: canZoomOut = $zoomLevel > ZOOM_CONFIG.min;
  
  let backupLoading = false;
  let fileInput: HTMLInputElement | null = null;
  
  // Navigate to today's month
  function handleTodayClick() {
    goToCurrentMonth();
    const todayMonth = getCurrentMonth();
    goto(`/month/${todayMonth}`);
  }
  
  // Load undo state on mount
  onMount(() => {
    undoStore.load();
  });
  
  // Handle undo action
  async function handleUndo() {
    const result = await undoStore.undo();
    if (result.success && result.entry) {
      addToast(`Undid ${result.entry.entity_type} change`, 'success');
      // Trigger page refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('undo-complete'));
    } else {
      addToast('Nothing to undo', 'error');
    }
  }
  
  // Handle keyboard shortcut (Ctrl+Z / Cmd+Z)
  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      if ($canUndo) {
        handleUndo();
      }
    }
  }
  
  // Export backup
  async function handleExport() {
    backupLoading = true;
    try {
      const data = await apiClient.get('/api/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgetforfun-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Backup exported successfully', 'success');
    } catch (error) {
      addToast('Failed to export backup', 'error');
    } finally {
      backupLoading = false;
    }
  }
  
  // Import backup - trigger file picker
  function handleImportClick() {
    fileInput?.click();
  }
  
  // Handle file selection for import
  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    backupLoading = true;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate first
      const validation = await apiClient.post('/api/backup/validate', data);
      if (!validation.isValid) {
        addToast(`Invalid backup: ${validation.errors.join(', ')}`, 'error');
        return;
      }
      
      // Confirm import
      const confirmed = confirm(
        `Import backup from ${data.export_date}?\n\n` +
        `This will overwrite:\n` +
        `- ${validation.summary.bills} bills\n` +
        `- ${validation.summary.incomes} incomes\n` +
        `- ${validation.summary.payment_sources} payment sources\n` +
        `- ${validation.summary.categories} categories\n\n` +
        `This action cannot be undone.`
      );
      
      if (!confirmed) return;
      
      // Import the backup
      await apiClient.post('/api/backup', data);
      addToast('Backup imported successfully', 'success');
      // Refresh the page to load new data
      window.location.reload();
    } catch (error) {
      addToast('Failed to import backup: Invalid file format', 'error');
    } finally {
      backupLoading = false;
      // Reset file input
      input.value = '';
    }
  }
  
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<nav class="sidebar">
  <div class="sidebar-header">
    <div class="header-row">
      <h2>BudgetForFun</h2>
    </div>
    <div class="header-actions">
      <button 
        class="today-button"
        on:click={handleTodayClick}
        title="Go to current month"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 10H21" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="16" r="2" fill="currentColor"/>
        </svg>
        <span>Today</span>
      </button>
    </div>
  </div>
  
  <!-- Main navigation -->
  <ul class="nav-list">
    <li>
      <a 
        href="/" 
        class="nav-item"
        class:active={currentPath === '/'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>Dashboard</span>
      </a>
    </li>
    <li>
      <a 
        href="/month/{$currentMonth}" 
        class="nav-item"
        class:active={isDetailsActive}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M9 16H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Details</span>
      </a>
    </li>
  </ul>
  
  <!-- Separator and secondary nav items -->
  <div class="nav-separator"></div>
  
  <ul class="nav-list bottom-nav">
    <li>
      <a 
        href="/manage" 
        class="nav-item"
        class:active={isManageActive}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M16 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M3 10H21" stroke="currentColor" stroke-width="2"/>
          <path d="M8 14H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M14 14H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M8 18H10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Manage Months</span>
      </a>
    </li>
    <li>
      <a 
        href="/setup" 
        class="nav-item"
        class:active={currentPath === '/setup'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>Budget Config</span>
      </a>
    </li>
  </ul>
  
  <!-- Hidden file input for import -->
  <input
    type="file"
    accept=".json"
    bind:this={fileInput}
    on:change={handleFileSelect}
    style="display: none;"
  />
  
  <!-- Footer with Zoom, Undo and Backup buttons -->
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
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
          class="zoom-button"
          on:click={() => zoomIn()}
          disabled={!canZoomIn}
          title="Zoom in (Ctrl++)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="footer-separator"></div>
    {/if}
    
    <button 
      class="undo-button"
      on:click={handleUndo}
      disabled={!$canUndo || $undoLoading}
      title="Undo last change (Ctrl+Z)"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 10H16C18.7614 10 21 12.2386 21 15C21 17.7614 18.7614 20 16 20H11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 6L3 10L7 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Undo</span>
      {#if $undoLoading}
        <span class="loading-indicator">...</span>
      {/if}
    </button>
    
    <!-- Backup buttons -->
    <div class="backup-buttons">
      <button
        class="backup-button"
        on:click={handleExport}
        disabled={backupLoading}
        title="Export all data to a backup file"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Export</span>
      </button>
      <button
        class="backup-button"
        on:click={handleImportClick}
        disabled={backupLoading}
        title="Import data from a backup file"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Import</span>
      </button>
    </div>
    {#if backupLoading}
      <div class="backup-loading">Processing...</div>
    {/if}
    
    <!-- Settings link in footer -->
    <div class="footer-separator"></div>
    <a 
      href="/settings" 
      class="settings-footer-link"
      class:active={isSettingsActive}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Settings</span>
    </a>
  </div>
</nav>

<style>
  .sidebar {
    width: 220px;
    height: 100vh;
    background: #1a1a2e;
    border-right: 1px solid #333355;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
  }
  
  .sidebar-header {
    padding: 0 16px 16px;
    border-bottom: 1px solid #333355;
  }
  
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .sidebar-header h2 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #24c8db;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
  }
  
  .today-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(36, 200, 219, 0.1);
    border: 1px solid rgba(36, 200, 219, 0.3);
    border-radius: 6px;
    color: #24c8db;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    width: 100%;
    justify-content: center;
  }
  
  .today-button:hover {
    background: rgba(36, 200, 219, 0.2);
    border-color: #24c8db;
  }
  
  .today-button svg {
    flex-shrink: 0;
  }
  
  .nav-list {
    list-style: none;
    padding: 12px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .nav-separator {
    margin: 0 12px;
    border-top: 1px solid #333355;
  }
  
  .bottom-nav {
    padding-top: 12px;
  }
  
  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    color: #888;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .nav-item:hover {
    background: rgba(36, 200, 219, 0.1);
    color: #e4e4e7;
  }
  
  .nav-item.active {
    background: #24c8db;
    color: #000;
  }
  
  .nav-item svg {
    flex-shrink: 0;
  }
  
  /* Footer with zoom, undo and backup */
  .sidebar-footer {
    margin-top: auto;
    padding: 12px;
    border-top: 1px solid #333355;
  }
  
  /* Zoom control */
  .zoom-control {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-bottom: 8px;
  }
  
  .zoom-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid #333355;
    border-radius: 6px;
    background: transparent;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .zoom-button:hover:not(:disabled) {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #e4e4e7;
  }
  
  .zoom-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .zoom-percentage {
    min-width: 50px;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #888;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }
  
  .zoom-percentage:hover {
    background: rgba(36, 200, 219, 0.1);
    color: #24c8db;
  }
  
  .footer-separator {
    border-top: 1px solid #333355;
    margin: 0 0 8px 0;
  }
  
  .undo-button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #333355;
    border-radius: 8px;
    background: transparent;
    color: #888;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .undo-button:hover:not(:disabled) {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #e4e4e7;
  }
  
  .undo-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .undo-button svg {
    flex-shrink: 0;
  }
  
  .loading-indicator {
    margin-left: auto;
    color: #24c8db;
  }
  
  /* Backup buttons */
  .backup-buttons {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  
  .backup-button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #333355;
    border-radius: 6px;
    background: transparent;
    color: #888;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .backup-button:hover:not(:disabled) {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #e4e4e7;
  }
  
  .backup-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .backup-button svg {
    flex-shrink: 0;
  }
  
  .backup-loading {
    text-align: center;
    color: #24c8db;
    font-size: 0.75rem;
    margin-top: 8px;
  }
  
  /* Settings link in footer */
  .settings-footer-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    color: #666;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all 0.2s;
    margin-top: 4px;
  }
  
  .settings-footer-link:hover {
    background: rgba(36, 200, 219, 0.1);
    color: #888;
  }
  
  .settings-footer-link.active {
    background: rgba(36, 200, 219, 0.15);
    color: #24c8db;
  }
  
  .settings-footer-link svg {
    flex-shrink: 0;
  }
</style>
