<script lang="ts">
  import MonthPickerHeader from '../components/MonthPickerHeader.svelte';
  import Dashboard from '../components/Dashboard/Dashboard.svelte';

  let dashboard: Dashboard;

  function handleRefresh() {
    dashboard?.refresh();
  }
</script>

<MonthPickerHeader showRefresh={true} onRefresh={handleRefresh} />
<Dashboard bind:this={dashboard} />
