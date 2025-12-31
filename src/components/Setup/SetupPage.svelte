<script lang="ts">
  import { onMount } from 'svelte';
  
  // Stores
  import { paymentSourcesStore, loadPaymentSources, deletePaymentSource } from '../../stores/payment-sources';
  import { billsStore, loadBills, deleteBill, activeBillsWithContribution, totalFixedCosts, calculateMonthlyContribution as calculateBillContribution } from '../../stores/bills';
  import { incomesStore, loadIncomes, deleteIncome, activeIncomesWithContribution, totalMonthlyIncome, calculateMonthlyContribution as calculateIncomeContribution } from '../../stores/incomes';
  import { categoriesStore, loadCategories, deleteCategory } from '../../stores/categories';
  
  // Components
  import Drawer from './Drawer.svelte';
  import PaymentSourceForm from './PaymentSourceForm.svelte';
  import PaymentSourceView from './PaymentSourceView.svelte';
  import BillForm from './BillForm.svelte';
  import BillView from './BillView.svelte';
  import IncomeForm from './IncomeForm.svelte';
  import IncomeView from './IncomeView.svelte';
  import CategoryForm from './CategoryForm.svelte';
  import CategoryView from './CategoryView.svelte';
  import LoadDefaultsButton from '../shared/LoadDefaultsButton.svelte';
  
  // Types
  import type { PaymentSource } from '../../stores/payment-sources';
  import type { Bill } from '../../stores/bills';
  import type { Income } from '../../stores/incomes';
  import type { Category } from '../../stores/categories';

  // Tab state
  type TabId = 'payment-sources' | 'bills' | 'incomes' | 'categories';
  let activeTab: TabId = 'payment-sources';

  // Drawer state
  type DrawerMode = 'add' | 'edit' | 'view';
  let drawerOpen = false;
  let drawerMode: DrawerMode = 'add';
  let viewingPaymentSource: PaymentSource | null = null;
  let viewingBill: Bill | null = null;
  let viewingIncome: Income | null = null;
  let viewingCategory: Category | null = null;
  let editingPaymentSource: PaymentSource | null = null;
  let editingBill: Bill | null = null;
  let editingIncome: Income | null = null;
  let editingCategory: Category | null = null;

  // Delete confirmation state
  let deleteConfirmId: string | null = null;

  // Tab definitions
  const tabs: { id: TabId; label: string }[] = [
    { id: 'payment-sources', label: 'Payment Sources' },
    { id: 'bills', label: 'Bills' },
    { id: 'incomes', label: 'Incomes' },
    { id: 'categories', label: 'Categories' }
  ];

  // Load all data on mount
  onMount(async () => {
    await Promise.all([
      loadPaymentSources(),
      loadBills(),
      loadIncomes(),
      loadCategories()
    ]);
  });

  // Drawer title based on mode and active tab
  $: drawerTitle = (() => {
    switch (drawerMode) {
      case 'add': return `Add ${getTabSingular(activeTab)}`;
      case 'edit': return `Edit ${getTabSingular(activeTab)}`;
      case 'view': return getTabSingular(activeTab);
    }
  })();

  function getTabSingular(tab: TabId): string {
    switch (tab) {
      case 'payment-sources': return 'Payment Source';
      case 'bills': return 'Bill';
      case 'incomes': return 'Income';
      case 'categories': return 'Category';
    }
  }

  function openAddDrawer() {
    drawerMode = 'add';
    clearAllItems();
    drawerOpen = true;
  }

  function openViewDrawer(item: PaymentSource | Bill | Income | Category) {
    drawerMode = 'view';
    clearAllItems();
    
    // Set the appropriate viewing item based on active tab
    switch (activeTab) {
      case 'payment-sources':
        viewingPaymentSource = item as PaymentSource;
        break;
      case 'bills':
        viewingBill = item as Bill;
        break;
      case 'incomes':
        viewingIncome = item as Income;
        break;
      case 'categories':
        viewingCategory = item as Category;
        break;
    }
    
    drawerOpen = true;
  }

  function openEditDrawer(item: PaymentSource | Bill | Income | Category) {
    drawerMode = 'edit';
    clearAllItems();
    
    // Set the appropriate editing item based on active tab
    switch (activeTab) {
      case 'payment-sources':
        editingPaymentSource = item as PaymentSource;
        break;
      case 'bills':
        editingBill = item as Bill;
        break;
      case 'incomes':
        editingIncome = item as Income;
        break;
      case 'categories':
        editingCategory = item as Category;
        break;
    }
    
    drawerOpen = true;
  }

  function switchToEdit() {
    // Copy viewing item to editing item and switch mode
    if (viewingPaymentSource) editingPaymentSource = viewingPaymentSource;
    if (viewingBill) editingBill = viewingBill;
    if (viewingIncome) editingIncome = viewingIncome;
    if (viewingCategory) editingCategory = viewingCategory;
    
    // Clear viewing items
    viewingPaymentSource = null;
    viewingBill = null;
    viewingIncome = null;
    viewingCategory = null;
    
    drawerMode = 'edit';
  }

  function clearAllItems() {
    viewingPaymentSource = null;
    viewingBill = null;
    viewingIncome = null;
    viewingCategory = null;
    editingPaymentSource = null;
    editingBill = null;
    editingIncome = null;
    editingCategory = null;
  }

  function closeDrawer() {
    drawerOpen = false;
    clearAllItems();
  }

  function handleSave() {
    closeDrawer();
  }

  async function handleDelete(id: string) {
    try {
      switch (activeTab) {
        case 'payment-sources':
          await deletePaymentSource(id);
          break;
        case 'bills':
          await deleteBill(id);
          break;
        case 'incomes':
          await deleteIncome(id);
          break;
        case 'categories':
          await deleteCategory(id);
          break;
      }
      deleteConfirmId = null;
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }

  function formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  function getPaymentSourceName(id: string): string {
    const ps = $paymentSourcesStore.paymentSources.find(p => p.id === id);
    return ps?.name || 'Unknown';
  }
</script>

<div class="setup-page">
  <!-- Header -->
  <header class="setup-header">
    <a href="/" class="back-link">
      &larr; Dashboard
    </a>
    <h1>Entity Configuration</h1>
    <div class="header-spacer"></div>
    <LoadDefaultsButton />
  </header>

  <div class="setup-layout">
    <!-- Left Sidebar - Tabs -->
    <nav class="setup-sidebar">
      {#each tabs as tab}
        <button
          class="tab-button"
          class:active={activeTab === tab.id}
          on:click={() => { activeTab = tab.id; deleteConfirmId = null; }}
        >
          {tab.label}
        </button>
      {/each}
    </nav>

    <!-- Main Content Area -->
    <main class="setup-content">
      <!-- Content Header -->
      <div class="content-header">
        <h2>
          {tabs.find(t => t.id === activeTab)?.label}
          <span class="count">
            ({#if activeTab === 'payment-sources'}
              {$paymentSourcesStore.paymentSources.length}
            {:else if activeTab === 'bills'}
              {$billsStore.bills.length}
            {:else if activeTab === 'incomes'}
              {$incomesStore.incomes.length}
            {:else}
              {$categoriesStore.categories.length}
            {/if})
          </span>
        </h2>
        <button class="btn btn-primary" on:click={openAddDrawer}>
          + Add New
        </button>
      </div>

      <!-- Entity List -->
      <div class="entity-list">
        {#if activeTab === 'payment-sources'}
          {#if $paymentSourcesStore.paymentSources.length === 0}
            <div class="empty-state">
              <p>No payment sources yet.</p>
              <p class="hint">Add your first payment source to get started.</p>
            </div>
          {:else}
            {#each $paymentSourcesStore.paymentSources as ps}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="entity-card clickable" on:click={() => openViewDrawer(ps)}>
                <div class="card-header">
                  <span class="card-name">{ps.name}</span>
                  <span class="card-badge">
                    {#if ps.type === 'bank_account'}Bank Account{:else if ps.type === 'credit_card'}Credit Card{:else}Cash{/if}
                  </span>
                </div>
                <div class="card-amount" style="color: #24c8db;">
                  {formatAmount(ps.balance)}
                </div>
                <div class="card-actions" on:click|stopPropagation>
                  {#if deleteConfirmId === ps.id}
                    <span class="confirm-text">Delete?</span>
                    <button class="btn-small btn-danger" on:click={() => handleDelete(ps.id)}>Yes</button>
                    <button class="btn-small btn-secondary" on:click={() => deleteConfirmId = null}>No</button>
                  {:else}
                    <button class="btn-small btn-secondary" on:click={() => openEditDrawer(ps)}>Edit</button>
                    <button class="btn-small btn-danger" on:click={() => deleteConfirmId = ps.id}>Delete</button>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}

        {:else if activeTab === 'bills'}
          {#if $billsStore.bills.length === 0}
            <div class="empty-state">
              <p>No bills yet.</p>
              <p class="hint">Add your recurring bills like rent, utilities, subscriptions.</p>
            </div>
          {:else}
            {#each $activeBillsWithContribution as bill}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="entity-card clickable" on:click={() => openViewDrawer(bill)}>
                <div class="card-header">
                  <span class="card-name">{bill.name}</span>
                  <span class="card-badge">{bill.billing_period.replace('_', '-')}</span>
                </div>
                {#if bill.start_date && bill.billing_period !== 'monthly'}
                  <div class="card-meta">Starts: {bill.start_date}</div>
                {/if}
                <div class="card-meta">Paid from: {getPaymentSourceName(bill.payment_source_id)}</div>
                <div class="card-amount" style="color: #ff6b6b;">
                  {formatAmount(bill.monthlyContribution)}/mo
                </div>
                <div class="card-actions" on:click|stopPropagation>
                  {#if deleteConfirmId === bill.id}
                    <span class="confirm-text">Delete?</span>
                    <button class="btn-small btn-danger" on:click={() => handleDelete(bill.id)}>Yes</button>
                    <button class="btn-small btn-secondary" on:click={() => deleteConfirmId = null}>No</button>
                  {:else}
                    <button class="btn-small btn-secondary" on:click={() => openEditDrawer(bill)}>Edit</button>
                    <button class="btn-small btn-danger" on:click={() => deleteConfirmId = bill.id}>Delete</button>
                  {/if}
                </div>
              </div>
            {/each}
            <!-- Total Fixed Costs -->
            <div class="total-row">
              <span class="total-label">Total Fixed Costs</span>
              <span class="total-value" style="color: #ff6b6b;">{formatAmount($totalFixedCosts)}/mo</span>
            </div>
          {/if}

        {:else if activeTab === 'incomes'}
          {#if $incomesStore.incomes.length === 0}
            <div class="empty-state">
              <p>No incomes yet.</p>
              <p class="hint">Add your salary, freelance income, or other recurring income.</p>
            </div>
          {:else}
            {#each $activeIncomesWithContribution as income}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="entity-card clickable" on:click={() => openViewDrawer(income)}>
                <div class="card-header">
                  <span class="card-name">{income.name}</span>
                  <span class="card-badge">{income.billing_period.replace('_', '-')}</span>
                </div>
                {#if income.start_date && income.billing_period !== 'monthly'}
                  <div class="card-meta">Starts: {income.start_date}</div>
                {/if}
                <div class="card-meta">Deposited to: {getPaymentSourceName(income.payment_source_id)}</div>
                <div class="card-amount" style="color: #22c55e;">
                  {formatAmount(income.monthlyContribution)}/mo
                </div>
                <div class="card-actions" on:click|stopPropagation>
                  {#if deleteConfirmId === income.id}
                    <span class="confirm-text">Delete?</span>
                    <button class="btn-small btn-danger" on:click={() => handleDelete(income.id)}>Yes</button>
                    <button class="btn-small btn-secondary" on:click={() => deleteConfirmId = null}>No</button>
                  {:else}
                    <button class="btn-small btn-secondary" on:click={() => openEditDrawer(income)}>Edit</button>
                    <button class="btn-small btn-danger" on:click={() => deleteConfirmId = income.id}>Delete</button>
                  {/if}
                </div>
              </div>
            {/each}
            <!-- Total Monthly Income -->
            <div class="total-row">
              <span class="total-label">Total Monthly Income</span>
              <span class="total-value" style="color: #22c55e;">{formatAmount($totalMonthlyIncome)}/mo</span>
            </div>
          {/if}

        {:else if activeTab === 'categories'}
          {#if $categoriesStore.categories.length === 0}
            <div class="empty-state">
              <p>No categories yet.</p>
              <p class="hint">Add custom categories for your expenses.</p>
            </div>
          {:else}
            {#each $categoriesStore.categories as category}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="entity-card clickable" on:click={() => openViewDrawer(category)}>
                <div class="card-header">
                  <span class="card-name">{category.name}</span>
                  {#if category.is_predefined}
                    <span class="card-badge predefined">Predefined</span>
                  {:else}
                    <span class="card-badge">Custom</span>
                  {/if}
                </div>
                <div class="card-actions" on:click|stopPropagation>
                  {#if category.is_predefined}
                    <span class="card-meta">Cannot modify predefined categories</span>
                  {:else if deleteConfirmId === category.id}
                    <span class="confirm-text">Delete?</span>
                    <button class="btn-small btn-danger" on:click={() => handleDelete(category.id)}>Yes</button>
                    <button class="btn-small btn-secondary" on:click={() => deleteConfirmId = null}>No</button>
                  {:else}
                    <button class="btn-small btn-secondary" on:click={() => openEditDrawer(category)}>Edit</button>
                    <button class="btn-small btn-danger" on:click={() => deleteConfirmId = category.id}>Delete</button>
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        {/if}
      </div>
    </main>
  </div>

  <!-- Drawer -->
  <Drawer isOpen={drawerOpen} title={drawerTitle} onClose={closeDrawer}>
    {#if drawerMode === 'view'}
      {#if activeTab === 'payment-sources' && viewingPaymentSource}
        <PaymentSourceView item={viewingPaymentSource} onEdit={switchToEdit} onClose={closeDrawer} />
      {:else if activeTab === 'bills' && viewingBill}
        <BillView item={viewingBill} onEdit={switchToEdit} onClose={closeDrawer} />
      {:else if activeTab === 'incomes' && viewingIncome}
        <IncomeView item={viewingIncome} onEdit={switchToEdit} onClose={closeDrawer} />
      {:else if activeTab === 'categories' && viewingCategory}
        <CategoryView item={viewingCategory} onEdit={switchToEdit} onClose={closeDrawer} />
      {/if}
    {:else}
      {#if activeTab === 'payment-sources'}
        <PaymentSourceForm 
          editingItem={editingPaymentSource} 
          onSave={handleSave} 
          onCancel={closeDrawer} 
        />
      {:else if activeTab === 'bills'}
        <BillForm 
          editingItem={editingBill} 
          onSave={handleSave} 
          onCancel={closeDrawer} 
        />
      {:else if activeTab === 'incomes'}
        <IncomeForm 
          editingItem={editingIncome} 
          onSave={handleSave} 
          onCancel={closeDrawer} 
        />
      {:else if activeTab === 'categories'}
        <CategoryForm 
          editingItem={editingCategory} 
          onSave={handleSave} 
          onCancel={closeDrawer} 
        />
      {/if}
    {/if}
  </Drawer>
</div>

<style>
  .setup-page {
    min-height: 100vh;
    background: #1a1a2e;
    color: #e4e4e7;
  }

  /* Header */
  .setup-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 30px;
    background: #16213e;
    border-bottom: 1px solid #333355;
  }

  .back-link {
    color: #24c8db;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .setup-header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .header-spacer {
    flex: 1;
  }

  /* Layout */
  .setup-layout {
    display: flex;
    min-height: calc(100vh - 70px);
  }

  /* Sidebar */
  .setup-sidebar {
    width: 200px;
    background: #16213e;
    border-right: 1px solid #333355;
    padding: 20px 0;
    flex-shrink: 0;
  }

  .tab-button {
    width: 100%;
    padding: 14px 20px;
    border: none;
    background: none;
    color: #888;
    text-align: left;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-button:hover {
    background: rgba(36, 200, 219, 0.1);
    color: #e4e4e7;
  }

  .tab-button.active {
    background: #24c8db;
    color: #000;
  }

  /* Main Content */
  .setup-content {
    flex: 1;
    padding: 30px;
    overflow-y: auto;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .content-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }

  .count {
    color: #888;
    font-weight: normal;
  }

  /* Entity List */
  .entity-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .entity-card {
    background: #16213e;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #333355;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .entity-card.clickable {
    cursor: pointer;
  }

  .entity-card.clickable:hover {
    border-color: #24c8db;
    background: rgba(36, 200, 219, 0.05);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .card-name {
    font-weight: 600;
    font-size: 16px;
  }

  .card-badge {
    font-size: 12px;
    color: #24c8db;
    padding: 4px 10px;
    background: rgba(36, 200, 219, 0.1);
    border-radius: 4px;
  }

  .card-badge.predefined {
    color: #888;
    background: rgba(136, 136, 136, 0.1);
  }

  .card-meta {
    font-size: 13px;
    color: #888;
  }

  .card-amount {
    font-size: 20px;
    font-weight: bold;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 5px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #888;
  }

  .empty-state p {
    margin: 0 0 10px;
  }

  .empty-state .hint {
    font-size: 14px;
    color: #666;
  }

  /* Total Row */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #16213e;
    border-radius: 8px;
    border: 2px solid #333355;
    margin-top: 10px;
  }

  .total-label {
    font-weight: 600;
    font-size: 16px;
    color: #e4e4e7;
  }

  .total-value {
    font-size: 22px;
    font-weight: bold;
  }

  /* Buttons */
  .btn {
    padding: 12px 20px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .btn-primary {
    background: #24c8db;
    color: #000;
  }

  .btn-primary:hover {
    background: #1ab0c9;
  }

  .btn-small {
    padding: 6px 12px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .btn-secondary {
    background: #333355;
    color: #fff;
  }

  .btn-secondary:hover {
    background: #444466;
  }

  .btn-danger {
    background: #ff4444;
    color: #fff;
  }

  .btn-danger:hover {
    background: #cc3333;
  }

  .confirm-text {
    font-size: 13px;
    color: #ff4444;
    font-weight: 500;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .setup-layout {
      flex-direction: column;
    }

    .setup-sidebar {
      width: 100%;
      display: flex;
      overflow-x: auto;
      padding: 0;
      border-right: none;
      border-bottom: 1px solid #333355;
    }

    .tab-button {
      flex-shrink: 0;
      padding: 14px 16px;
    }

    .setup-content {
      padding: 20px;
    }

    .content-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 15px;
    }

    .content-header .btn {
      width: 100%;
    }
  }
</style>
