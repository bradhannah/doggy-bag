<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Navigation from '../components/Navigation.svelte';
  import ToastContainer from '../components/shared/ToastContainer.svelte';
  import { isTauri, loadZoom, zoomIn, zoomOut, resetZoom } from '../stores/settings';
  import { sidebarCollapsed } from '../stores/ui';
  import { setApiPort } from '../lib/api/client';
  import { createLogger } from '../lib/logger';

  const log = createLogger('Layout');

  let backendReady = false;
  let backendError: string | null = null;
  let unlistenReady: (() => void) | null = null;
  let unlistenError: (() => void) | null = null;

  // Handle keyboard shortcuts for zoom (Ctrl+/-/0)
  function handleKeydown(event: KeyboardEvent) {
    // Only handle zoom shortcuts in Tauri
    if (!isTauri()) return;

    const isMod = event.ctrlKey || event.metaKey;
    if (!isMod) return;

    // Zoom in: Ctrl/Cmd + = or Ctrl/Cmd + +
    if (event.key === '=' || event.key === '+') {
      event.preventDefault();
      zoomIn();
    }
    // Zoom out: Ctrl/Cmd + -
    else if (event.key === '-') {
      event.preventDefault();
      zoomOut();
    }
    // Reset zoom: Ctrl/Cmd + 0
    else if (event.key === '0') {
      event.preventDefault();
      resetZoom();
    }
  }

  onMount(async () => {
    // Load zoom setting on startup (applies zoom in Tauri)
    await loadZoom();

    // Add keyboard listener for zoom shortcuts
    window.addEventListener('keydown', handleKeydown);

    // In browser dev mode, backend is always ready (separate process)
    if (!isTauri()) {
      backendReady = true;
      return;
    }

    try {
      const { listen } = await import('@tauri-apps/api/event');
      const { invoke } = await import('@tauri-apps/api/core');

      // Listen for sidecar ready event (payload contains port number)
      unlistenReady = await listen<number>('sidecar-ready', (event) => {
        const port = event.payload;
        log.info(`Sidecar is ready on port: ${port}`);
        setApiPort(port);
        backendReady = true;
      });

      // Listen for sidecar error event
      unlistenError = await listen('sidecar-error', (event) => {
        log.error('Sidecar error:', event.payload);
        backendError = event.payload as string;
      });

      // Check if we missed the sidecar-ready event (race condition)
      // Poll for the port - sidecar may have started before listener was ready
      const checkPort = async () => {
        for (let i = 0; i < 30; i++) {
          if (backendReady) return; // Already got the event

          try {
            const port = await invoke<number | null>('get_sidecar_port');
            if (port) {
              log.info(`Got port from Tauri command: ${port}`);
              setApiPort(port);
              backendReady = true;
              return;
            }
          } catch {
            // Command not available yet, keep polling
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Timeout - show error
        if (!backendReady) {
          backendError = 'Backend failed to start (timeout)';
        }
      };

      // Start polling in background
      checkPort();
    } catch (e) {
      log.error('Failed to set up Tauri listeners:', e);
      // Fallback: assume backend is ready
      backendReady = true;
    }
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    unlistenReady?.();
    unlistenError?.();
  });
</script>

{#if !backendReady && isTauri()}
  <div class="loading-overlay">
    <div class="loading-content">
      {#if backendError}
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
            <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
        </div>
        <h2>Failed to Start Backend</h2>
        <p>{backendError}</p>
        <p class="hint">Please restart the app or check the logs.</p>
      {:else}
        <div class="spinner"></div>
        <h2>Starting BudgetForFun...</h2>
        <p>Connecting to backend</p>
      {/if}
    </div>
  </div>
{:else}
  <div class="app-layout" class:sidebar-collapsed={$sidebarCollapsed}>
    <Navigation />
    <main class="main-content">
      <slot />
    </main>
  </div>
{/if}

<ToastContainer />

<style>
  :global(:root) {
    /* Typography */
    font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    font-weight: 400;

    /* Colors */
    color: #e4e4e7;
    background-color: #0f0f1a;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;

    /* ========================================
       DESIGN TOKENS - Responsive Layout System
       ======================================== */

    /* Spacing Scale */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-6: 24px;
    --space-8: 32px;

    /* Layout Widths - Sidebars */
    --sidebar-width: 220px;
    --summary-sidebar-width: 260px;
    --tab-sidebar-width: 200px;

    /* Layout Widths - Overlays */
    --drawer-width: 400px;
    --modal-width: 500px;
    --modal-width-sm: 400px;

    /* Content Max Widths */
    --content-max-sm: 800px; /* Dashboard, Settings */
    --content-max-md: 1200px; /* Manage Months */
    --content-max-lg: 1800px; /* Details View */
    --content-max-setup: 900px; /* Entity Configuration */

    /* Content Min Widths */
    --main-content-min: 600px; /* Minimum width for main content column in Details View */

    /* Panel Widths - Bills/Income sections */
    --panel-width-medium: 550px; /* Fixed width in Medium mode */
    --panel-width-min-wide: 600px; /* Minimum width in Wide mode */

    /* Content Padding */
    --content-padding: 24px;
    --content-padding-mobile: 16px;

    /* Component Sizes */
    --button-height: 44px;
    --button-height-sm: 32px;
    --input-height: 44px;
    --icon-button-size: 36px;

    /* Border Radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;

    /* Section Gaps */
    --section-gap: 24px;
    --card-gap: 16px;
    --form-field-gap: 16px;

    /* Sidebar Collapsed Width */
    --sidebar-collapsed-width: 60px;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #0f0f1a;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .loading-content {
    text-align: center;
    max-width: 400px;
    padding: 32px;
  }

  .loading-content h2 {
    color: #e4e4e7;
    font-size: 1.25rem;
    margin: 24px 0 8px;
  }

  .loading-content p {
    color: #888;
    margin: 0;
  }

  .loading-content .hint {
    margin-top: 16px;
    font-size: 0.875rem;
  }

  .error-icon {
    color: #ff6b6b;
  }

  .spinner {
    width: 48px;
    height: 48px;
    margin: 0 auto;
    border: 3px solid #333355;
    border-top-color: #24c8db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .app-layout {
    display: flex;
    min-height: 100vh;
  }

  .main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    padding: 0;
    min-height: 100vh;
    transition: margin-left 0.2s ease;
  }

  .sidebar-collapsed .main-content {
    margin-left: var(--sidebar-collapsed-width);
  }

  @media (max-width: 768px) {
    .main-content {
      margin-left: 0;
    }
  }
</style>
