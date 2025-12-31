<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { undoStore, canUndo, undoLoading } from '../stores/undo';
  import { addToast } from '../stores/toast';
  import { apiClient } from '../lib/api/client';
  
  $: currentPath = $page.url.pathname;
  
  let backupLoading = false;
  let fileInput: HTMLInputElement | null = null;
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'dashboard' },
    { path: '/setup', label: 'Setup', icon: 'settings' }
  ];
  
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
    <h2>BudgetForFun</h2>
  </div>
  
  <ul class="nav-list">
    {#each navItems as item}
      <li>
        <a 
          href={item.path} 
          class="nav-item"
          class:active={currentPath === item.path}
        >
          {#if item.icon === 'dashboard'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/>
            </svg>
          {:else if item.icon === 'settings'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/>
            </svg>
          {/if}
          <span>{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>
  
  <!-- Hidden file input for import -->
  <input
    type="file"
    accept=".json"
    bind:this={fileInput}
    on:change={handleFileSelect}
    style="display: none;"
  />
  
  <!-- Undo Button -->
  <div class="sidebar-footer">
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
    padding: 0 20px 20px;
    border-bottom: 1px solid #333355;
  }
  
  .sidebar-header h2 {
    font-size: 1.125rem;
    font-weight: 700;
    color: #24c8db;
    margin: 0;
  }
  
  .nav-list {
    list-style: none;
    padding: 12px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  
  /* Undo button */
  .sidebar-footer {
    margin-top: auto;
    padding: 12px;
    border-top: 1px solid #333355;
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
</style>
