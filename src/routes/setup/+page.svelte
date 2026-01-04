<script lang="ts">
  import { onMount } from 'svelte';
  import SetupPage from '../../components/Setup/SetupPage.svelte';
  import { loadPaymentSources } from '../../stores/payment-sources';
  import { loadBills } from '../../stores/bills';
  import { loadIncomes } from '../../stores/incomes';

  onMount(async () => {
    await Promise.all([loadPaymentSources(), loadBills(), loadIncomes()]);
  });
</script>

<SetupPage />
