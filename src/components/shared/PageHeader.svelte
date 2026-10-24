<script lang="ts">
  /**
   * PageHeader - The title row every page shares
   *
   * @prop title - Page title (matches the navigation label)
   * @prop subtitle - Optional one-line summary under the title
   *
   * Slots:
   * - actions: Buttons aligned to the right of the title
   * - subtitle: Rich subtitle content (overrides the prop)
   */
  export let title: string;
  export let subtitle = '';
</script>

<header class="page-header">
  <div class="page-heading">
    <h1>{title}</h1>
    {#if subtitle || $$slots.subtitle}
      <p class="page-subtitle"><slot name="subtitle">{subtitle}</slot></p>
    {/if}
  </div>
  {#if $$slots.actions}
    <div class="page-actions"><slot name="actions" /></div>
  {/if}
</header>

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-5);
  }

  .page-heading {
    min-width: 0;
  }

  h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .page-subtitle {
    margin: var(--space-1) 0 0;
    font-size: var(--font-size-md);
    color: var(--text-secondary);
  }

  .page-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>
