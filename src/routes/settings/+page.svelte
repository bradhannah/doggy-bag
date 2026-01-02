<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { addToast } from '../../stores/toast';
  import { apiClient } from '../../lib/api/client';
  import {
    loadSettings,
    settings,
    dataDirectory,
    loading,
    error,
    isDevelopment,
    openFolderPicker,
    validateDirectory,
    migrateData,
    saveDataDirectorySetting,
    type DirectoryValidation,
    type MigrationResult,
    type MigrationMode
  } from '../../stores/settings';
  
  // Modal states
  let showMigrationDialog = false;
  let showProgressDialog = false;
  let showSuccessDialog = false;
  let showErrorDialog = false;
  
  // Migration state
  let pendingNewPath: string = '';
  let selectedMode: MigrationMode = 'copy';
  let validation: DirectoryValidation | null = null;
  let migrationResult: MigrationResult | null = null;
  let migrationProgress = 0;
  let migrationStatus = '';
  let errorMessage = '';
  
  // Backup state
  let backupLoading = false;
  let fileInput: HTMLInputElement | null = null;
  
  onMount(() => {
    loadSettings().catch(err => {
      console.error('Failed to load settings:', err);
    });
  });
  
  // Handle Browse button click
  async function handleBrowse() {
    if ($isDevelopment) {
      addToast('Cannot change data directory in development mode', 'error');
      return;
    }
    
    const selected = await openFolderPicker();
    if (!selected) return;
    
    // Validate the selected directory
    try {
      validation = await validateDirectory(selected);
      pendingNewPath = selected;
      
      if (!validation.isValid) {
        errorMessage = validation.error || 'Directory is not valid';
        showErrorDialog = true;
        return;
      }
      
      // If it's the same directory, do nothing
      if (selected === $dataDirectory?.path) {
        addToast('This is already your current data directory', 'info');
        return;
      }
      
      // Show migration dialog
      showMigrationDialog = true;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Failed to validate directory';
      showErrorDialog = true;
    }
  }
  
  // Handle migration confirmation
  async function handleMigrate() {
    showMigrationDialog = false;
    showProgressDialog = true;
    migrationProgress = 0;
    migrationStatus = 'Starting migration...';
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (migrationProgress < 90) {
          migrationProgress += 10;
          migrationStatus = `Copying files... ${migrationProgress}%`;
        }
      }, 200);
      
      const result = await migrateData(
        $dataDirectory?.path || '',
        pendingNewPath,
        selectedMode
      );
      
      clearInterval(progressInterval);
      migrationProgress = 100;
      migrationResult = result;
      
      if (result.success) {
        // Save the new path to Tauri Store
        await saveDataDirectorySetting(pendingNewPath);
        showProgressDialog = false;
        showSuccessDialog = true;
      } else {
        showProgressDialog = false;
        errorMessage = result.error || 'Migration failed';
        showErrorDialog = true;
      }
    } catch (err) {
      showProgressDialog = false;
      errorMessage = err instanceof Error ? err.message : 'Migration failed';
      showErrorDialog = true;
    }
  }
  
  // Close all modals
  function closeModals() {
    showMigrationDialog = false;
    showProgressDialog = false;
    showSuccessDialog = false;
    showErrorDialog = false;
    pendingNewPath = '';
    selectedMode = 'copy';
    validation = null;
    migrationResult = null;
  }
  
  // Handle success dialog done - requires app restart
  function handleDone() {
    closeModals();
    addToast('Please restart the app to use the new data directory', 'success');
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
    } catch (err) {
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
      const validationResult = await apiClient.post('/api/backup/validate', data) as { isValid: boolean; errors: string[]; summary: Record<string, number> };
      if (!validationResult.isValid) {
        addToast(`Invalid backup: ${validationResult.errors.join(', ')}`, 'error');
        return;
      }
      
      // Confirm import
      const confirmed = confirm(
        `Import backup from ${data.export_date}?\n\n` +
        `This will overwrite:\n` +
        `- ${validationResult.summary.bills} bills\n` +
        `- ${validationResult.summary.incomes} incomes\n` +
        `- ${validationResult.summary.payment_sources} payment sources\n` +
        `- ${validationResult.summary.categories} categories\n\n` +
        `This action cannot be undone.`
      );
      
      if (!confirmed) return;
      
      // Import the backup
      await apiClient.post('/api/backup', data);
      addToast('Backup imported successfully', 'success');
      // Refresh the page to load new data
      window.location.reload();
    } catch (err) {
      addToast('Failed to import backup: Invalid file format', 'error');
    } finally {
      backupLoading = false;
      // Reset file input
      input.value = '';
    }
  }
  
  // Go back to previous page
  function goBack() {
    goto('/');
  }
</script>

<div class="settings-page">
  <header class="settings-header">
    <button class="back-button" on:click={goBack}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Back
    </button>
    <h1>Settings</h1>
  </header>
  
  {#if $loading}
    <div class="loading">Loading settings...</div>
  {:else if $error}
    <div class="error-message">{$error}</div>
  {:else}
    <div class="settings-content">
      <!-- Data Storage Section -->
      <section class="settings-section">
        <h2>Data Storage</h2>
        
        <div class="setting-item">
          <label>Data Directory</label>
          <div class="directory-input">
            <input 
              type="text" 
              value={$dataDirectory?.path || ''} 
              readonly 
              class="directory-path"
            />
            <button 
              class="browse-button" 
              on:click={handleBrowse}
              disabled={$isDevelopment}
              title={$isDevelopment ? 'Cannot change in development mode' : 'Choose data directory'}
            >
              Browse
            </button>
          </div>
          {#if $isDevelopment}
            <p class="setting-hint warning">
              Development mode: Data directory cannot be changed. Using ./data
            </p>
          {:else}
            <p class="setting-hint">
              Tip: Place in iCloud Drive, Google Drive, or Dropbox for auto-sync
            </p>
          {/if}
        </div>
      </section>
      
      <!-- Backup & Restore Section -->
      <section class="settings-section">
        <h2>Backup & Restore</h2>
        
        <div class="button-row">
          <button 
            class="action-button" 
            on:click={handleExport}
            disabled={backupLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Export Backup
          </button>
          <button 
            class="action-button" 
            on:click={handleImportClick}
            disabled={backupLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M17 8L12 3L7 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Import Backup
          </button>
        </div>
        
        <!-- Hidden file input for import -->
        <input
          type="file"
          accept=".json"
          bind:this={fileInput}
          on:change={handleFileSelect}
          style="display: none;"
        />
        
        {#if backupLoading}
          <p class="setting-hint">Processing...</p>
        {/if}
      </section>
      
      <!-- Appearance Section (Future) -->
      <section class="settings-section disabled">
        <h2>Appearance</h2>
        <div class="setting-item">
          <label>Theme</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="theme" value="dark" checked disabled />
              Dark
            </label>
            <label class="radio-label">
              <input type="radio" name="theme" value="light" disabled />
              Light
            </label>
            <label class="radio-label">
              <input type="radio" name="theme" value="system" disabled />
              System
            </label>
          </div>
          <p class="setting-hint">(Coming soon)</p>
        </div>
      </section>
      
      <!-- About Section -->
      <section class="settings-section">
        <h2>About</h2>
        <div class="about-info">
          <div class="about-row">
            <span class="about-label">Version:</span>
            <span class="about-value">{$settings?.version || '0.1.0'}</span>
          </div>
          <div class="about-row">
            <span class="about-label">Data Format:</span>
            <span class="about-value">1.0</span>
          </div>
          <div class="about-row">
            <span class="about-label">Mode:</span>
            <span class="about-value">{$isDevelopment ? 'Development' : 'Production'}</span>
          </div>
        </div>
      </section>
    </div>
  {/if}
</div>

<!-- Migration Dialog Modal -->
{#if showMigrationDialog}
  <div class="modal-overlay" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0">
    <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>Move Data to New Location?</h3>
        <button class="modal-close" on:click={closeModals}>&times;</button>
      </div>
      <div class="modal-body">
        <p>You're changing your data directory from:</p>
        <div class="path-change">
          <div class="path-item">
            <span class="path-label">FROM:</span>
            <span class="path-value">{$dataDirectory?.path || '(current)'}</span>
          </div>
          <div class="path-item">
            <span class="path-label">TO:</span>
            <span class="path-value">{pendingNewPath}</span>
          </div>
        </div>
        
        <p class="modal-section-title">What would you like to do with your existing data?</p>
        
        <div class="radio-options">
          <label class="radio-option">
            <input type="radio" bind:group={selectedMode} value="copy" />
            <div class="radio-content">
              <span class="radio-title">Copy existing data to new location</span>
              <span class="radio-desc">Your data will be copied. Original stays intact.</span>
            </div>
          </label>
          
          <label class="radio-option">
            <input type="radio" bind:group={selectedMode} value="fresh" />
            <div class="radio-content">
              <span class="radio-title">Start fresh (empty)</span>
              <span class="radio-desc">New location will have empty data. Original stays intact.</span>
            </div>
          </label>
          
          <label class="radio-option" class:disabled={!validation?.hasExistingData}>
            <input 
              type="radio" 
              bind:group={selectedMode} 
              value="use_existing" 
              disabled={!validation?.hasExistingData}
            />
            <div class="radio-content">
              <span class="radio-title">Use existing data at new location</span>
              <span class="radio-desc">
                {#if validation?.hasExistingData}
                  Found existing data: {validation.existingFiles.length} files
                {:else}
                  Only available if data already exists at the new path.
                {/if}
              </span>
            </div>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" on:click={closeModals}>Cancel</button>
        <button class="btn-primary" on:click={handleMigrate}>Continue</button>
      </div>
    </div>
  </div>
{/if}

<!-- Progress Modal -->
{#if showProgressDialog}
  <div class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal modal-small">
      <div class="modal-header">
        <h3>Copying Data...</h3>
      </div>
      <div class="modal-body center">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {migrationProgress}%"></div>
        </div>
        <p class="progress-status">{migrationStatus}</p>
      </div>
    </div>
  </div>
{/if}

<!-- Success Modal -->
{#if showSuccessDialog}
  <div class="modal-overlay" on:click={handleDone} on:keydown={(e) => e.key === 'Escape' && handleDone()} role="button" tabindex="0">
    <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-modal="true">
      <div class="modal-header success">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18457 2.99721 7.13633 4.39828 5.49707C5.79935 3.85782 7.69279 2.71538 9.79619 2.24015C11.8996 1.76491 14.1003 1.98234 16.07 2.86" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3>Data Moved Successfully</h3>
        <button class="modal-close" on:click={handleDone}>&times;</button>
      </div>
      <div class="modal-body">
        <p>Your data has been copied to:</p>
        <div class="path-highlight">{pendingNewPath}</div>
        
        {#if migrationResult}
          <div class="migration-summary">
            <p><strong>Copied:</strong></p>
            <ul>
              <li>{migrationResult.entityFilesCopied} entity files (bills, incomes, categories...)</li>
              <li>{migrationResult.monthFilesCopied} month files</li>
            </ul>
          </div>
        {/if}
        
        <p class="note">
          Your original data is still at:<br/>
          <code>{$dataDirectory?.path}</code><br/>
          You can delete it manually once you've verified everything works.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" on:click={handleDone}>Done</button>
      </div>
    </div>
  </div>
{/if}

<!-- Error Modal -->
{#if showErrorDialog}
  <div class="modal-overlay" on:click={closeModals} on:keydown={(e) => e.key === 'Escape' && closeModals()} role="button" tabindex="0">
    <div class="modal" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-modal="true">
      <div class="modal-header error">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <h3>Cannot Use This Directory</h3>
        <button class="modal-close" on:click={closeModals}>&times;</button>
      </div>
      <div class="modal-body">
        <p>The selected directory cannot be used:</p>
        <div class="path-highlight error">{pendingNewPath}</div>
        <p class="error-reason"><strong>Reason:</strong> {errorMessage}</p>
        
        <p>Please choose a directory where you have write permissions, such as:</p>
        <ul class="suggestion-list">
          <li>~/Documents/BudgetForFun</li>
          <li>~/iCloud Drive/BudgetForFun</li>
          <li>~/Dropbox/BudgetForFun</li>
        </ul>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" on:click={closeModals}>OK</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 32px;
  }
  
  .settings-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #e4e4e7;
    margin: 0;
  }
  
  .back-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid #333355;
    border-radius: 8px;
    color: #888;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .back-button:hover {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
    color: #e4e4e7;
  }
  
  .loading, .error-message {
    text-align: center;
    padding: 48px;
    color: #888;
  }
  
  .error-message {
    color: #ff6b6b;
  }
  
  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  
  .settings-section {
    background: #1a1a2e;
    border: 1px solid #333355;
    border-radius: 12px;
    padding: 24px;
  }
  
  .settings-section.disabled {
    opacity: 0.6;
  }
  
  .settings-section h2 {
    font-size: 1rem;
    font-weight: 600;
    color: #24c8db;
    margin: 0 0 16px 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .setting-item {
    margin-bottom: 16px;
  }
  
  .setting-item:last-child {
    margin-bottom: 0;
  }
  
  .setting-item label {
    display: block;
    font-size: 0.875rem;
    color: #e4e4e7;
    margin-bottom: 8px;
  }
  
  .directory-input {
    display: flex;
    gap: 8px;
  }
  
  .directory-path {
    flex: 1;
    padding: 12px 16px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 8px;
    color: #e4e4e7;
    font-family: monospace;
    font-size: 0.875rem;
  }
  
  .browse-button {
    padding: 12px 24px;
    background: #24c8db;
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .browse-button:hover:not(:disabled) {
    background: #1ba8b8;
  }
  
  .browse-button:disabled {
    background: #333355;
    color: #666;
    cursor: not-allowed;
  }
  
  .setting-hint {
    font-size: 0.75rem;
    color: #888;
    margin-top: 8px;
  }
  
  .setting-hint.warning {
    color: #f0ad4e;
  }
  
  .button-row {
    display: flex;
    gap: 12px;
  }
  
  .action-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: transparent;
    border: 1px solid #333355;
    border-radius: 8px;
    color: #e4e4e7;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .action-button:hover:not(:disabled) {
    background: rgba(36, 200, 219, 0.1);
    border-color: #24c8db;
  }
  
  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .radio-group {
    display: flex;
    gap: 24px;
  }
  
  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #888;
    font-size: 0.875rem;
    cursor: pointer;
  }
  
  .radio-label input {
    accent-color: #24c8db;
  }
  
  .about-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .about-row {
    display: flex;
    gap: 16px;
  }
  
  .about-label {
    color: #888;
    font-size: 0.875rem;
    min-width: 100px;
  }
  
  .about-value {
    color: #e4e4e7;
    font-size: 0.875rem;
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal {
    background: #1a1a2e;
    border: 1px solid #333355;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-small {
    max-width: 350px;
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 20px 24px;
    border-bottom: 1px solid #333355;
  }
  
  .modal-header h3 {
    flex: 1;
    margin: 0;
    font-size: 1.125rem;
    color: #e4e4e7;
  }
  
  .modal-header.success {
    color: #4ade80;
  }
  
  .modal-header.success h3 {
    color: #4ade80;
  }
  
  .modal-header.error {
    color: #ff6b6b;
  }
  
  .modal-header.error h3 {
    color: #ff6b6b;
  }
  
  .modal-close {
    background: none;
    border: none;
    color: #888;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  
  .modal-close:hover {
    color: #e4e4e7;
  }
  
  .modal-body {
    padding: 24px;
  }
  
  .modal-body.center {
    text-align: center;
  }
  
  .modal-body p {
    margin: 0 0 16px 0;
    color: #e4e4e7;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #333355;
  }
  
  .btn-primary {
    padding: 10px 24px;
    background: #24c8db;
    border: none;
    border-radius: 8px;
    color: #000;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary:hover {
    background: #1ba8b8;
  }
  
  .btn-secondary {
    padding: 10px 24px;
    background: transparent;
    border: 1px solid #333355;
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    border-color: #24c8db;
    color: #e4e4e7;
  }
  
  .path-change {
    background: #0f0f1a;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .path-item {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }
  
  .path-item:last-child {
    margin-bottom: 0;
  }
  
  .path-label {
    color: #888;
    font-size: 0.75rem;
    min-width: 50px;
  }
  
  .path-value {
    color: #e4e4e7;
    font-family: monospace;
    font-size: 0.875rem;
    word-break: break-all;
  }
  
  .modal-section-title {
    font-weight: 600;
    margin-top: 24px !important;
  }
  
  .radio-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .radio-option:hover:not(.disabled) {
    border-color: #24c8db;
  }
  
  .radio-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .radio-option input {
    margin-top: 2px;
    accent-color: #24c8db;
  }
  
  .radio-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .radio-title {
    color: #e4e4e7;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .radio-desc {
    color: #888;
    font-size: 0.75rem;
  }
  
  .progress-bar {
    height: 8px;
    background: #333355;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  
  .progress-fill {
    height: 100%;
    background: #24c8db;
    transition: width 0.3s ease;
  }
  
  .progress-status {
    color: #888;
    font-size: 0.875rem;
  }
  
  .path-highlight {
    background: #0f0f1a;
    border: 1px solid #333355;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: monospace;
    color: #24c8db;
    margin-bottom: 16px;
    word-break: break-all;
  }
  
  .path-highlight.error {
    color: #ff6b6b;
    border-color: #ff6b6b;
  }
  
  .migration-summary {
    background: #0f0f1a;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .migration-summary p {
    margin-bottom: 8px !important;
  }
  
  .migration-summary ul {
    margin: 0;
    padding-left: 20px;
    color: #888;
  }
  
  .migration-summary li {
    margin-bottom: 4px;
  }
  
  .note {
    font-size: 0.75rem;
    color: #888;
  }
  
  .note code {
    display: inline-block;
    background: #0f0f1a;
    padding: 4px 8px;
    border-radius: 4px;
    margin-top: 4px;
    color: #e4e4e7;
    font-size: 0.75rem;
  }
  
  .error-reason {
    color: #ff6b6b !important;
  }
  
  .suggestion-list {
    margin: 8px 0 0 0;
    padding-left: 20px;
    color: #888;
  }
  
  .suggestion-list li {
    margin-bottom: 4px;
    font-family: monospace;
    font-size: 0.875rem;
  }
</style>
