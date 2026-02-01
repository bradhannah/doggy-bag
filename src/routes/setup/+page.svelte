<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import SetupPage from '../../components/Setup/SetupPage.svelte';
  import { loadPaymentSources } from '../../stores/payment-sources';
  import { loadBills } from '../../stores/bills';
  import { loadIncomes } from '../../stores/incomes';

  // Get URL params for deep linking (e.g., ?tab=bills&edit=<id>)
  $: tab = $page.url.searchParams.get('tab');
  $: editId = $page.url.searchParams.get('edit');

  onMount(async () => {
    await Promise.all([loadPaymentSources(), loadBills(), loadIncomes()]);
  });
</script>

<SetupPage initialTab={tab} initialEditId={editId} />
