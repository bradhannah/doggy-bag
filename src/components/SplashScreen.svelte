<script lang="ts">
  export let status: string = 'Starting up...';
  export let version: string = '';
  export let visible: boolean = true;
  export let fadeOut: boolean = false;
</script>

{#if visible}
  <div class="splash-overlay" class:fade-out={fadeOut}>
    <div class="splash-content">
      <!-- Logo -->
      <img src="/splash-logo.png" alt="Doggy Bag" class="splash-logo" />

      <!-- App Name -->
      <h1 class="app-name">Doggy Bag</h1>

      <!-- Tagline -->
      <p class="tagline">"How much do you have left in your doggy bag this month?"</p>

      <!-- Loading Indicator -->
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <!-- Status Message -->
      <p class="status">{status}</p>

      <!-- Footer -->
      <div class="splash-footer">
        <span>Version {version || '...'}</span>
        <span class="separator">|</span>
        <span>© 2026 Brad Hannah</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .splash-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-base);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 1;
    transition: opacity 0.5s ease-out;
  }

  .splash-overlay.fade-out {
    opacity: 0;
    pointer-events: none;
  }

  .splash-content {
    text-align: center;
    max-width: 500px;
    padding: var(--space-8);
  }

  .splash-logo {
    width: 160px;
    height: 160px;
    border-radius: var(--radius-xl);
    margin-bottom: var(--space-6);
  }

  .app-name {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--space-4) 0;
  }

  .tagline {
    font-size: 1.125rem;
    font-style: italic;
    color: var(--text-secondary);
    margin: 0 0 var(--space-8) 0;
    line-height: 1.6;
  }

  /* Pulsing dots animation */
  .loading-dots {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .loading-dots span {
    width: 10px;
    height: 10px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .status {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 var(--space-8) 0;
  }

  .splash-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-3);
    font-size: 0.75rem;
    color: var(--text-tertiary);
    padding-top: var(--space-6);
    border-top: 1px solid var(--border-default);
  }

  .separator {
    opacity: 0.5;
  }
</style>
