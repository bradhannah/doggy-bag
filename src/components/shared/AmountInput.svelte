<script lang="ts">
  /**
   * AmountInput - Dollar amount field with an attached "$" prefix
   *
   * @prop value - The amount as typed (dollars, e.g. "89.00")
   * @prop size - 'md' (default control height) or 'sm' (compact rows)
   * @prop invalid - Shows the error border
   */
  export let value = '';
  export let id: string | undefined = undefined;
  export let placeholder = '0.00';
  export let disabled = false;
  export let invalid = false;
  export let size: 'md' | 'sm' = 'md';
  export let ariaLabel: string | undefined = undefined;
  export let inputEl: HTMLInputElement | null = null;
</script>

<span class="amount-input" class:sm={size === 'sm'} class:invalid class:disabled>
  <span class="prefix" aria-hidden="true">$</span>
  <input
    {id}
    type="text"
    inputmode="decimal"
    bind:value
    bind:this={inputEl}
    {placeholder}
    {disabled}
    aria-label={ariaLabel}
    aria-invalid={invalid || undefined}
    on:input
    on:keydown
    on:blur
  />
</span>

<style>
  .amount-input {
    display: flex;
    box-sizing: border-box;
    height: var(--control-height);
    min-width: 0;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    background: var(--bg-base);
    overflow: hidden;
  }

  .amount-input.sm {
    height: var(--control-height-sm);
    border-radius: var(--radius-sm);
  }

  .amount-input:focus-within {
    border-color: var(--accent);
  }

  .amount-input.invalid {
    border-color: var(--error);
  }

  .amount-input.disabled {
    opacity: 0.6;
  }

  .prefix {
    display: flex;
    align-items: center;
    padding: 0 var(--space-3);
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-default);
    color: var(--text-secondary);
  }

  .sm .prefix {
    padding: 0 var(--space-2);
  }

  /* Fill the bordered box rather than the global control height */
  input {
    flex: 1;
    min-width: 0;
    height: 100% !important;
    padding: 0 var(--space-3);
    border: none;
    background: transparent;
    color: var(--text-primary);
  }

  input:focus,
  input:focus-visible {
    outline: none;
  }
</style>
