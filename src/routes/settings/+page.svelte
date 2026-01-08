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
    isTauri,
    openFolderPicker,
    validateDirectory,
    migrateData,
    saveDataDirectorySetting,
    relaunchApp,
    getDebugModeSetting,
    toggleDebugMode,
    type DirectoryValidation,
    type MigrationResult,
    type MigrationMode,
  } from '../../stores/settings';
  import { themeMode } from '../../stores/theme';
  import type { ThemeMode } from '$lib/theme';

  // Store Tauri check result (reactive won't help since isTauri() doesn't depend on reactive values)
  const inTauri = isTauri();

  // Modal states
  let showMigrationDialog = false;
  let showProgressDialog = false;
  let showSuccessDialog = false;
  let showErrorDialog = false;
  let showRestartDialog = false;

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

  // Debug mode state
  let debugModeEnabled = false;
  let debugModeLoading = false;
  let debugModeChanged = false; // Track if user changed the setting (restart needed)

  // Version backup state
  interface VersionBackup {
    filename: string;
    fromVersion: string;
    toVersion: string;
    timestamp: string;
    size: number;
  }
  let versionBackups: VersionBackup[] = [];
  let versionBackupsLoading = false;
  let showRestoreConfirmDialog = false;
  let pendingRestoreBackup: VersionBackup | null = null;
  let restoreInProgress = false;

  onMount(async () => {
    loadSettings().catch((err) => {
      console.error('Failed to load settings:', err);
    });

    // Load debug mode setting (the saved preference, not current devtools state)
    if (isTauri()) {
      debugModeEnabled = await getDebugModeSetting();
    }

    // Check version and create backup if needed, then load backups list
    checkVersionAndLoadBackups();
  });

  // Check version on startup and load backups
  async function checkVersionAndLoadBackups() {
    try {
      // Check if version changed (creates backup automatically if needed)
      await apiClient.post('/api/version/check', {});
      // Load the list of version backups
      await loadVersionBackups();
    } catch (err) {
      console.error('Failed to check version:', err);
    }
  }

  // Load version backups list
  async function loadVersionBackups() {
    versionBackupsLoading = true;
    try {
      const response = (await apiClient.get('/api/version/backups')) as VersionBackup[];
      versionBackups = response;
    } catch (err) {
      console.error('Failed to load version backups:', err);
      versionBackups = [];
    } finally {
      versionBackupsLoading = false;
    }
  }

  // Initiate restore (show confirmation)
  function initiateRestore(backup: VersionBackup) {
    pendingRestoreBackup = backup;
    showRestoreConfirmDialog = true;
  }

  // Cancel restore
  function cancelRestore() {
    pendingRestoreBackup = null;
    showRestoreConfirmDialog = false;
  }

  // Confirm and execute restore
  async function confirmRestore() {
    if (!pendingRestoreBackup) return;

    restoreInProgress = true;
    try {
      await apiClient.post(`/api/version/backups/restore/${pendingRestoreBackup.filename}`, {});
      addToast('Backup restored successfully. Reloading...', 'success');
      showRestoreConfirmDialog = false;
      pendingRestoreBackup = null;
      // Reload to reflect restored data
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      addToast('Failed to restore backup', 'error');
      console.error('Failed to restore backup:', err);
    } finally {
      restoreInProgress = false;
    }
  }

  // Format file size
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Format date
  function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // Handle Browse button click
  async function handleBrowse() {
    const tauriEnv = isTauri();
    console.log('[Settings Page] handleBrowse called');
    console.log('[Settings Page] isTauri:', tauriEnv);
    console.log('[Settings Page] isDevelopment (from API):', $isDevelopment);

    // Only allow changing data directory in Tauri (not browser)
    if (!tauriEnv) {
      addToast('Data directory can only be changed in the desktop app', 'error');
      return;
    }

    console.log('[Settings Page] Calling openFolderPicker...');
    const selected = await openFolderPicker();
    console.log('[Settings Page] openFolderPicker returned:', selected);

    if (!selected) {
      console.log('[Settings Page] No folder selected (cancelled or error)');
      return;
    }

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
        if (migrationProgress < 50) {
          migrationProgress += 10;
          migrationStatus = `Copying files... ${migrationProgress}%`;
        }
      }, 200);

      const result = await migrateData($dataDirectory?.path || '', pendingNewPath, selectedMode);

      clearInterval(progressInterval);
      migrationResult = result;

      if (result.success) {
        migrationProgress = 80;
        migrationStatus = 'Saving settings...';

        // Save the new path to Tauri Store
        await saveDataDirectorySetting(pendingNewPath);

        migrationProgress = 100;
        migrationStatus = 'Done!';

        showProgressDialog = false;
        showRestartDialog = true;
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

  // Handle restart button click
  async function handleRestart() {
    try {
      await relaunchApp();
    } catch (err) {
      console.error('Failed to relaunch:', err);
      addToast('Please restart the app manually', 'info');
    }
  }

  // Close all modals
  function closeModals() {
    showMigrationDialog = false;
    showProgressDialog = false;
    showSuccessDialog = false;
    showErrorDialog = false;
    showRestartDialog = false;
    pendingNewPath = '';
    selectedMode = 'copy';
    validation = null;
    migrationResult = null;
  }

  // Handle success dialog done
  function handleDone() {
    closeModals();
    addToast('Data directory updated successfully', 'success');
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
      a.download = `doggybag-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Backup exported successfully', 'success');
    } catch {
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
      const validationResult = (await apiClient.post('/api/backup/validate', data)) as {
        isValid: boolean;
        errors: string[];
        summary: Record<string, number>;
      };
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
    } catch {
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

  // Toggle debug mode (devtools)
  async function handleToggleDebugMode() {
    debugModeLoading = true;
    try {
      debugModeEnabled = await toggleDebugMode();
      debugModeChanged = true; // Mark that restart is needed
      addToast(
        debugModeEnabled
          ? 'Debug mode enabled - restart app to take effect'
          : 'Debug mode disabled - restart app to take effect',
        'info'
      );
    } catch {
      addToast('Failed to toggle debug mode', 'error');
    } finally {
      debugModeLoading = false;
    }
  }
</script>

<div class="settings-page">
  <header class="settings-header">
    <button class="back-button" on:click={goBack}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M19 12H5M12 19L5 12L12 5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
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
          <span class="setting-label">Data Directory</span>
          <div class="directory-input">
            <input type="text" value={$dataDirectory?.path || ''} readonly class="directory-path" />
            <button
              class="browse-button"
              on:click={handleBrowse}
              disabled={!inTauri}
              title={!inTauri ? 'Only available in desktop app' : 'Choose data directory'}
            >
              Browse
            </button>
          </div>
          {#if !inTauri}
            <p class="setting-hint warning">
              Browser mode: Data directory can only be changed in the desktop app.
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
          <button class="action-button" on:click={handleExport} disabled={backupLoading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M7 10L12 15L17 10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12 15V3"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Export Backup
          </button>
          <button class="action-button" on:click={handleImportClick} disabled={backupLoading}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M17 8L12 3L7 8"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12 3V15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
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

      <!-- Version Backups Section -->
      <section class="settings-section">
        <h2>Version Backups</h2>
        <p class="setting-description">
          Automatic backups are created when the app is updated to a new version.
        </p>

        {#if versionBackupsLoading}
          <p class="setting-hint">Loading backups...</p>
        {:else if versionBackups.length === 0}
          <p class="setting-hint">No version backups available.</p>
        {:else}
          <div class="backup-list">
            {#each versionBackups as backup}
              <div class="backup-item">
                <div class="backup-info">
                  <div class="backup-version">
                    <span class="version-tag">{backup.fromVersion}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12H19M19 12L12 5M19 12L12 19"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span class="version-tag">{backup.toVersion}</span>
                  </div>
                  <div class="backup-meta">
                    <span>{formatDate(backup.timestamp)}</span>
                    <span class="separator">|</span>
                    <span>{formatBytes(backup.size)}</span>
                  </div>
                </div>
                <button
                  class="restore-button"
                  on:click={() => initiateRestore(backup)}
                  title="Restore this backup"
                >
                  Restore
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <!-- Appearance Section -->
      <section class="settings-section">
        <h2>Appearance</h2>
        <div class="setting-item">
          <span class="setting-label">Zoom</span>
          <p class="setting-description">
            Adjust the zoom level using the controls in the sidebar footer, or use keyboard
            shortcuts:
          </p>
          <div class="keyboard-shortcuts">
            <div class="shortcut-row">
              <span class="shortcut-key">Ctrl/Cmd + +</span>
              <span class="shortcut-desc">Zoom in</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-key">Ctrl/Cmd + -</span>
              <span class="shortcut-desc">Zoom out</span>
            </div>
            <div class="shortcut-row">
              <span class="shortcut-key">Ctrl/Cmd + 0</span>
              <span class="shortcut-desc">Reset to 100%</span>
            </div>
          </div>
          {#if !inTauri}
            <p class="setting-hint warning">
              Note: Native zoom only works in the desktop app. Use your browser's zoom controls in
              browser mode.
            </p>
          {/if}
        </div>

        <div class="setting-item">
          <span class="setting-label">Theme</span>
          <div class="radio-group">
            <label class="radio-label">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={$themeMode === 'dark'}
                on:change={() => themeMode.set('dark')}
              />
              Dark
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={$themeMode === 'light'}
                on:change={() => themeMode.set('light')}
              />
              Light
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="theme"
                value="system"
                checked={$themeMode === 'system'}
                on:change={() => themeMode.set('system')}
              />
              System
            </label>
          </div>
          <p class="setting-hint">System follows your OS preference</p>
        </div>
      </section>

      <!-- Developer Section -->
      <section class="settings-section">
        <h2>Developer</h2>

        <div class="setting-item">
          <div class="toggle-row">
            <div class="toggle-info">
              <span class="setting-label">Debug Mode</span>
              <p class="setting-description">
                Enables the "Inspect Element" option in the right-click context menu. Useful for
                troubleshooting issues and inspecting the app's HTML/CSS.
              </p>
            </div>
            <button
              class="toggle-switch"
              class:active={debugModeEnabled}
              on:click={handleToggleDebugMode}
              disabled={!inTauri || debugModeLoading}
              title={!inTauri
                ? 'Only available in desktop app'
                : debugModeEnabled
                  ? 'Disable debug mode'
                  : 'Enable debug mode'}
            >
              <span class="toggle-slider"></span>
            </button>
          </div>
          {#if debugModeChanged}
            <div class="restart-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Restart the app for changes to take effect</span>
              <button class="restart-button" on:click={handleRestart}> Restart Now </button>
            </div>
          {:else if !inTauri}
            <p class="setting-hint warning">
              In browser mode, use your browser's built-in developer tools (F12 or Cmd+Option+I).
            </p>
          {/if}
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
  <div
    class="modal-overlay"
    on:click={closeModals}
    on:keydown={(e) => e.key === 'Escape' && closeModals()}
    role="presentation"
  >
    <div
      class="modal"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
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
              <span class="radio-desc"
                >New location will have empty data. Original stays intact.</span
              >
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
  <div
    class="modal-overlay"
    on:click={handleDone}
    on:keydown={(e) => e.key === 'Escape' && handleDone()}
    role="presentation"
  >
    <div
      class="modal"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header success">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18457 2.99721 7.13633 4.39828 5.49707C5.79935 3.85782 7.69279 2.71538 9.79619 2.24015C11.8996 1.76491 14.1003 1.98234 16.07 2.86"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M22 4L12 14.01L9 11.01"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
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
              <li>
                {migrationResult.entityFilesCopied} entity files (bills, incomes, categories...)
              </li>
              <li>{migrationResult.monthFilesCopied} month files</li>
            </ul>
          </div>
        {/if}

        <p class="note">
          Your original data is still at:<br />
          <code>{$dataDirectory?.path}</code><br />
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
  <div
    class="modal-overlay"
    on:click={closeModals}
    on:keydown={(e) => e.key === 'Escape' && closeModals()}
    role="presentation"
  >
    <div
      class="modal"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header error">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
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
          <li>~/Documents/DoggyBag</li>
          <li>~/iCloud Drive/DoggyBag</li>
          <li>~/Dropbox/DoggyBag</li>
        </ul>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" on:click={closeModals}>OK</button>
      </div>
    </div>
  </div>
{/if}

<!-- Restart Required Modal -->
{#if showRestartDialog}
  <div class="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-header success">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18457 2.99721 7.13633 4.39828 5.49707C5.79935 3.85782 7.69279 2.71538 9.79619 2.24015C11.8996 1.76491 14.1003 1.98234 16.07 2.86"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M22 4L12 14.01L9 11.01"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h3>Restart Required</h3>
      </div>
      <div class="modal-body">
        <p>Your data has been migrated to:</p>
        <div class="path-highlight">{pendingNewPath}</div>

        {#if migrationResult}
          <div class="migration-summary">
            <p><strong>Copied:</strong></p>
            <ul>
              <li>{migrationResult.entityFilesCopied} entity files</li>
              <li>{migrationResult.monthFilesCopied} month files</li>
            </ul>
          </div>
        {/if}

        <p>The app needs to restart to use the new data location.</p>
      </div>
      <div class="modal-footer">
        <button class="btn-primary" on:click={handleRestart}>Restart Now</button>
      </div>
    </div>
  </div>
{/if}

<!-- Restore Confirmation Modal -->
{#if showRestoreConfirmDialog && pendingRestoreBackup}
  <div
    class="modal-overlay"
    on:click={cancelRestore}
    on:keydown={(e) => e.key === 'Escape' && cancelRestore()}
    role="presentation"
  >
    <div
      class="modal"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header warning">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h3>Restore Backup?</h3>
        <button class="modal-close" on:click={cancelRestore}>&times;</button>
      </div>
      <div class="modal-body">
        <p>You are about to restore a backup from:</p>
        <div class="backup-restore-info">
          <div class="restore-detail">
            <span class="restore-label">Version:</span>
            <span class="restore-value">{pendingRestoreBackup.fromVersion}</span>
          </div>
          <div class="restore-detail">
            <span class="restore-label">Date:</span>
            <span class="restore-value">{formatDate(pendingRestoreBackup.timestamp)}</span>
          </div>
          <div class="restore-detail">
            <span class="restore-label">Size:</span>
            <span class="restore-value">{formatBytes(pendingRestoreBackup.size)}</span>
          </div>
        </div>
        <p class="warning-text">
          <strong>Warning:</strong> This will overwrite your current data with the backup. This action
          cannot be undone.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" on:click={cancelRestore} disabled={restoreInProgress}>
          Cancel
        </button>
        <button class="btn-danger" on:click={confirmRestore} disabled={restoreInProgress}>
          {#if restoreInProgress}
            Restoring...
          {:else}
            Restore Backup
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .settings-page {
    max-width: var(--content-max-sm);
    margin: 0 auto;
    padding: var(--content-padding);
  }

  @media (max-width: 768px) {
    .settings-page {
      padding: var(--content-padding-mobile);
    }
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  .settings-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--button-height);
    padding: 0 var(--space-4);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-button:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .loading,
  .error-message {
    text-align: center;
    padding: 48px;
    color: var(--text-secondary);
  }

  .error-message {
    color: var(--error);
  }

  .settings-content {
    display: flex;
    flex-direction: column;
    gap: var(--section-gap);
  }

  .settings-section {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
  }

  .settings-section h2 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--accent);
    margin: 0 0 var(--space-4) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .setting-item {
    margin-bottom: var(--space-4);
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-item label,
  .setting-label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-primary);
    margin-bottom: var(--space-2);
  }

  .directory-input {
    display: flex;
    gap: var(--space-2);
  }

  .directory-path {
    flex: 1;
    height: var(--input-height);
    padding: 0 var(--space-4);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-family: monospace;
    font-size: 0.875rem;
  }

  .browse-button {
    height: var(--button-height);
    padding: 0 var(--space-6);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-inverse);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .browse-button:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .browse-button:disabled {
    background: var(--border-default);
    color: var(--text-disabled);
    cursor: not-allowed;
  }

  .setting-hint {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: var(--space-2);
  }

  .setting-hint.warning {
    color: var(--warning);
  }

  .button-row {
    display: flex;
    gap: var(--space-3);
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: var(--button-height);
    padding: 0 var(--space-4);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-button:hover:not(:disabled) {
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .radio-group {
    display: flex;
    gap: var(--space-6);
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .radio-label input {
    accent-color: var(--accent);
  }

  .about-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .about-row {
    display: flex;
    gap: var(--space-4);
  }

  .about-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
    min-width: 100px;
  }

  .about-value {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--overlay-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-xl);
    width: 90%;
    max-width: var(--modal-width);
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-small {
    max-width: 350px;
  }

  .modal-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--border-default);
  }

  .modal-header h3 {
    flex: 1;
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-primary);
  }

  .modal-header.success {
    color: var(--success);
  }

  .modal-header.success h3 {
    color: var(--success);
  }

  .modal-header.error {
    color: var(--error);
  }

  .modal-header.error h3 {
    color: var(--error);
  }

  .modal-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: var(--space-6);
  }

  .modal-body.center {
    text-align: center;
  }

  .modal-body p {
    margin: 0 0 var(--space-4) 0;
    color: var(--text-primary);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--border-default);
  }

  .btn-primary {
    height: var(--button-height);
    padding: 0 var(--space-6);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-inverse);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    height: var(--button-height);
    padding: 0 var(--space-6);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    border-color: var(--accent);
    color: var(--text-primary);
  }

  .path-change {
    background: var(--bg-base);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .path-item {
    display: flex;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .path-item:last-child {
    margin-bottom: 0;
  }

  .path-label {
    color: var(--text-secondary);
    font-size: 0.75rem;
    min-width: 50px;
  }

  .path-value {
    color: var(--text-primary);
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
    gap: var(--space-3);
  }

  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s;
  }

  .radio-option:hover:not(.disabled) {
    border-color: var(--accent);
  }

  .radio-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .radio-option input {
    margin-top: 2px;
    accent-color: var(--accent);
  }

  .radio-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .radio-title {
    color: var(--text-primary);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .radio-desc {
    color: var(--text-secondary);
    font-size: 0.75rem;
  }

  .progress-bar {
    height: var(--space-2);
    background: var(--border-default);
    border-radius: var(--space-1);
    overflow: hidden;
    margin-bottom: var(--space-4);
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.3s ease;
  }

  .progress-status {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .path-highlight {
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
    font-family: monospace;
    color: var(--accent);
    margin-bottom: var(--space-4);
    word-break: break-all;
  }

  .path-highlight.error {
    color: var(--error);
    border-color: var(--error);
  }

  .migration-summary {
    background: var(--bg-base);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .migration-summary p {
    margin-bottom: var(--space-2) !important;
  }

  .migration-summary ul {
    margin: 0;
    padding-left: 20px;
    color: var(--text-secondary);
  }

  .migration-summary li {
    margin-bottom: 4px;
  }

  .note {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .note code {
    display: inline-block;
    background: var(--bg-base);
    padding: 4px 8px;
    border-radius: 4px;
    margin-top: 4px;
    color: var(--text-primary);
    font-size: 0.75rem;
  }

  .error-reason {
    color: var(--error) !important;
  }

  .suggestion-list {
    margin: 8px 0 0 0;
    padding-left: 20px;
    color: var(--text-secondary);
  }

  .suggestion-list li {
    margin-bottom: 4px;
    font-family: monospace;
    font-size: 0.875rem;
  }

  /* Font Size Options */
  .setting-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0 0 var(--space-3) 0;
  }

  /* Keyboard shortcuts display */
  .keyboard-shortcuts {
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3) var(--space-4);
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-1) 0;
  }

  .shortcut-row:not(:last-child) {
    border-bottom: 1px solid var(--border-default);
  }

  .shortcut-key {
    font-family: monospace;
    font-size: 0.75rem;
    color: var(--accent);
    background: var(--accent-muted);
    padding: 4px 8px;
    border-radius: 4px;
    min-width: 100px;
    text-align: center;
  }

  .shortcut-desc {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  /* Toggle Switch Styles */
  .toggle-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-6);
  }

  .toggle-info {
    flex: 1;
  }

  .toggle-info .setting-label {
    margin-bottom: var(--space-1);
  }

  .toggle-info .setting-description {
    margin-bottom: 0;
  }

  .toggle-switch {
    flex-shrink: 0;
    width: 48px;
    height: 26px;
    background: var(--border-default);
    border: none;
    border-radius: 13px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
    padding: 0;
  }

  .toggle-switch:hover:not(:disabled) {
    background: var(--border-hover);
  }

  .toggle-switch.active {
    background: var(--accent);
  }

  .toggle-switch:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-slider {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    background: var(--text-primary);
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-switch.active .toggle-slider {
    transform: translateX(22px);
  }

  /* Restart Notice */
  .restart-notice {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--accent-muted);
    border: 1px solid var(--border-focus);
    border-radius: var(--radius-md);
    color: var(--accent);
    font-size: 0.875rem;
  }

  .restart-notice svg {
    flex-shrink: 0;
  }

  .restart-notice span {
    flex: 1;
  }

  .restart-button {
    height: var(--button-height-sm);
    padding: 0 var(--space-4);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-inverse);
    font-weight: 600;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .restart-button:hover {
    background: var(--accent-hover);
  }

  /* Version Backups List */
  .backup-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .backup-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-base);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
  }

  .backup-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .backup-version {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-secondary);
  }

  .version-tag {
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--accent);
    background: var(--accent-muted);
    padding: 2px 8px;
    border-radius: 4px;
  }

  .backup-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .backup-meta .separator {
    color: var(--text-tertiary);
  }

  .restore-button {
    height: var(--button-height-sm);
    padding: 0 var(--space-4);
    background: transparent;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .restore-button:hover {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--text-primary);
  }

  /* Restore Confirmation Modal */
  .modal-header.warning {
    color: var(--warning);
  }

  .modal-header.warning h3 {
    color: var(--warning);
  }

  .backup-restore-info {
    background: var(--bg-base);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .restore-detail {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-2);
  }

  .restore-detail:last-child {
    margin-bottom: 0;
  }

  .restore-label {
    color: var(--text-secondary);
    font-size: 0.875rem;
    min-width: 60px;
  }

  .restore-value {
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .warning-text {
    color: var(--warning) !important;
    font-size: 0.875rem;
  }

  .btn-danger {
    height: var(--button-height);
    padding: 0 var(--space-6);
    background: var(--error);
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-inverse);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--error-dark);
  }

  .btn-danger:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
