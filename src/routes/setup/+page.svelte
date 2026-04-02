<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import SetupPage from '../../components/Setup/SetupPage.svelte';
  import { loadPaymentSourcesIfNeeded } from '../../stores/payment-sources';
  import { loadBillsIfNeeded } from '../../stores/bills';
  import { loadIncomesIfNeeded } from '../../stores/incomes';

  // Get URL params for deep linking (e.g., ?tab=bills&edit=<id>)
  $: tab = $page.url.searchParams.get('tab');
  $: editId = $page.url.searchParams.get('edit');

  onMount(async () => {
    await Promise.all([loadPaymentSourcesIfNeeded(), loadBillsIfNeeded(), loadIncomesIfNeeded()]);
  });
</script>

<SetupPage initialTab={tab} initialEditId={editId} />
