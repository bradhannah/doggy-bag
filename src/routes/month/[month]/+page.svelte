<script lang="ts">
  import { page } from '$app/stores';
  import DetailedMonthView from '../../../components/DetailedView/DetailedMonthView.svelte';
  
  $: month = $page.params.month;
</script>

<svelte:head>
  <title>Budget - {month}</title>
</svelte:head>

{#if month}
  <DetailedMonthView {month} />
{:else}
  <div class="error-page">
    <h1>Invalid Month</h1>
    <p>Please provide a valid month in YYYY-MM format.</p>
    <a href="/">Back to Dashboard</a>
  </div>
{/if}

<style>
  .error-page {
    text-align: center;
    padding: 60px 20px;
  }
  
  .error-page h1 {
    color: #f87171;
    margin-bottom: 12px;
  }
  
  .error-page p {
    color: #888;
    margin-bottom: 24px;
  }
  
  .error-page a {
    color: #24c8db;
    text-decoration: none;
  }
  
  .error-page a:hover {
    text-decoration: underline;
  }
</style>
