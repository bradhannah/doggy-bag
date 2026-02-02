<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiClient } from '../../lib/api/client';

  // Stores
  import {
    paymentSourcesStore,
    loadPaymentSources,
    deletePaymentSource,
  } from '../../stores/payment-sources';
  import {
    billsStore,
    loadBills,
    deleteBill,
    totalFixedCosts,
    billsByCategory,
  } from '../../stores/bills';
  import {
    incomesStore,
    loadIncomes,
    deleteIncome,
    totalMonthlyIncome,
    incomesByCategory,
  } from '../../stores/incomes';
  import {
    categoriesStore,
    loadCategories,
    deleteCategory,
    billCategories,
    incomeCategories,
  } from '../../stores/categories';
  import {
    insurancePlansStore as _insurancePlansStore,
    loadInsurancePlans,
    deleteInsurancePlan,
    insurancePlans,
  } from '../../stores/insurance-plans';
  import {
    insuranceCategoriesStore as _insuranceCategoriesStore,
    loadInsuranceCategories,
    deleteInsuranceCategory,
    insuranceCategories,
  } from '../../stores/insurance-categories';
  import {
    familyMembers,
    loadFamilyMembers,
    deleteFamilyMember,
  } from '../../stores/family-members';

  import { success, error as showError, addToast } from '../../stores/toast';

  // Components
  import Drawer from '../shared/Drawer.svelte';
  import PaymentSourceForm from './PaymentSourceForm.svelte';
  import PaymentSourceView from './PaymentSourceView.svelte';
  import BillForm from './BillForm.svelte';
  import BillView from './BillView.svelte';
  import IncomeForm from './IncomeForm.svelte';
  import IncomeView from './IncomeView.svelte';
  import CategoryForm from './CategoryForm.svelte';
  import CategoryView from './CategoryView.svelte';
  import BillsListByCategory from './BillsListByCategory.svelte';
  import IncomesListByCategory from './IncomesListByCategory.svelte';
  import PaymentSourcesList from './PaymentSourcesList.svelte';
  import LoadDefaultsButton from '../shared/LoadDefaultsButton.svelte';
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';
  import CategoryOrderer from './CategoryOrderer.svelte';
  import InsurancePlanForm from './InsurancePlanForm.svelte';
  import InsurancePlanView from './InsurancePlanView.svelte';
  import InsurancePlansList from './InsurancePlansList.svelte';
  import InsuranceCategoryForm from './InsuranceCategoryForm.svelte';
  import InsuranceCategoryView from './InsuranceCategoryView.svelte';
  import InsuranceCategoriesList from './InsuranceCategoriesList.svelte';
  import FamilyMemberForm from './FamilyMemberForm.svelte';
  import FamilyMemberView from './FamilyMemberView.svelte';
  import FamilyMembersList from './FamilyMembersList.svelte';
  import TodosList from './TodosList.svelte';
  import TodoForm from './TodoForm.svelte';
  import TodoView from './TodoView.svelte';
  import TodoDeleteDialog from './TodoDeleteDialog.svelte';

  // Types
  import type { PaymentSource } from '../../stores/payment-sources';
  import type { Bill } from '../../stores/bills';
  import type { Income } from '../../stores/incomes';
  import type { Category } from '../../stores/categories';
  import type { InsurancePlan, InsuranceCategory, FamilyMember } from '../../types/insurance';
  import {
    todos,
    loadTodos,
    deleteTodo,
    type Todo,
    type DeleteTodoOption,
  } from '../../stores/todos';

  // ============ Months Tab Types ============
  interface MonthSummary {
    month: string;
    exists: boolean;
    is_read_only: boolean;
    created_at: string;
    updated_at: string;
    total_income: number;
    total_bills: number;
    total_expenses: number;
    leftover: number;
  }

  interface MonthsResponse {
    months: MonthSummary[];
    count: number;
  }

  // Tab state
  type TabId =
    | 'months'
    | 'payment-sources'
    | 'bills'
    | 'incomes'
    | 'categories'
    | 'insurance-plans'
    | 'insurance-categories'
    | 'family'
    | 'todos';

  // Props for deep linking (e.g., /setup?tab=bills&edit=<id>)
  export let initialTab: string | null = null;
  export let initialEditId: string | null = null;

  let activeTab: TabId = 'months';

  // ============ Months Tab State ============
  let months: MonthSummary[] = [];
  let monthsLoading = true;
  let monthsError = '';
  let monthConfirmTitle = '';
  let monthConfirmMessage = '';
  let monthConfirmAction: (() => Promise<void>) | null = null;
  let monthActionLoading = false;
  let showMonthConfirm = false;

  // Drawer state
  type DrawerMode = 'add' | 'edit' | 'view';
  let drawerOpen = false;
  let drawerMode: DrawerMode = 'add';
  let viewingPaymentSource: PaymentSource | null = null;
  let viewingBill: Bill | null = null;
  let viewingIncome: Income | null = null;
  let viewingCategory: Category | null = null;
  let viewingInsurancePlan: InsurancePlan | null = null;
  let viewingInsuranceCategory: InsuranceCategory | null = null;
  let viewingFamilyMember: FamilyMember | null = null;
  let editingPaymentSource: PaymentSource | null = null;
  let editingBill: Bill | null = null;
  let editingIncome: Income | null = null;
  let editingCategory: Category | null = null;
  let editingInsurancePlan: InsurancePlan | null = null;
  let editingInsuranceCategory: InsuranceCategory | null = null;
  let editingFamilyMember: FamilyMember | null = null;

  // Todos use Modal instead of Drawer (per spec)
  let showTodoModal = false;
  let todoModalMode: 'add' | 'edit' | 'view' = 'add';
  let selectedTodo: Todo | null = null;

  // Form refs for dirty tracking
  let billFormRef: BillForm | null = null;
  let incomeFormRef: IncomeForm | null = null;
  let paymentSourceFormRef: PaymentSourceForm | null = null;
  let categoryFormRef: CategoryForm | null = null;
  let insurancePlanFormRef: InsurancePlanForm | null = null;
  let insuranceCategoryFormRef: InsuranceCategoryForm | null = null;
  let familyMemberFormRef: FamilyMemberForm | null = null;

  // Check if the current form has unsaved changes
  // This function is passed to Drawer and called when attempting to close
  // It always reads the current form ref at call time, ensuring we get the latest isDirty
  function checkFormIsDirty(): boolean {
    if (drawerMode === 'view') return false;
    switch (activeTab) {
      case 'bills':
        return billFormRef?.isDirty?.() ?? false;
      case 'incomes':
        return incomeFormRef?.isDirty?.() ?? false;
      case 'payment-sources':
        return paymentSourceFormRef?.isDirty?.() ?? false;
      case 'categories':
        return categoryFormRef?.isDirty?.() ?? false;
      case 'insurance-plans':
        return insurancePlanFormRef?.isDirty?.() ?? false;
      case 'insurance-categories':
        return insuranceCategoryFormRef?.isDirty?.() ?? false;
      case 'family':
        return familyMemberFormRef?.isDirty?.() ?? false;
      default:
        return false;
    }
  }

  // Get current form's handleSubmit function for save from unsaved changes dialog
  async function handleSaveFromDialog(): Promise<void> {
    switch (activeTab) {
      case 'bills':
        await billFormRef?.handleSubmit();
        break;
      case 'incomes':
        await incomeFormRef?.handleSubmit();
        break;
      case 'payment-sources':
        await paymentSourceFormRef?.handleSubmit();
        break;
      case 'categories':
        await categoryFormRef?.handleSubmit();
        break;
      case 'insurance-plans':
        await insurancePlanFormRef?.handleSubmit();
        break;
      case 'insurance-categories':
        await insuranceCategoryFormRef?.handleSubmit();
        break;
      case 'family':
        await familyMemberFormRef?.handleSubmit();
        break;
    }
  }

  // Delete confirmation state
  let showDeleteConfirm = false;
  let itemToDelete: { id: string; name: string } | null = null;

  // Todo delete dialog state
  let showTodoDeleteDialog = false;
  let todoToDelete: Todo | null = null;

  // Tab definitions
  const tabs: { id: TabId; label: string }[] = [
    { id: 'months', label: 'Months' },
    { id: 'payment-sources', label: 'Payment Sources' },
    { id: 'bills', label: 'Bills' },
    { id: 'incomes', label: 'Incomes' },
    { id: 'categories', label: 'Categories' },
    { id: 'insurance-plans', label: 'Insurance Plans' },
    { id: 'insurance-categories', label: 'Insurance Categories' },
    { id: 'family', label: 'Family' },
    { id: 'todos', label: 'Todos' },
  ];

  // Load all data on mount
  onMount(async () => {
    await Promise.all([
      loadMonths(),
      loadPaymentSources(),
      loadBills(),
      loadIncomes(),
      loadCategories(),
      loadInsurancePlans(),
      loadInsuranceCategories(),
      loadFamilyMembers(),
      loadTodos(),
    ]);

    // Handle deep linking from URL params
    if (initialTab && isValidTab(initialTab)) {
      activeTab = initialTab;

      // If an edit ID was provided, find and open the item
      if (initialEditId) {
        await handleInitialEdit(initialTab, initialEditId);
      }
    }
  });

  // Check if tab is valid
  function isValidTab(tab: string): tab is TabId {
    const validTabs: TabId[] = [
      'months',
      'payment-sources',
      'bills',
      'incomes',
      'categories',
      'insurance-plans',
      'insurance-categories',
      'family',
      'todos',
    ];
    return validTabs.includes(tab as TabId);
  }

  // Handle initial edit from URL params
  async function handleInitialEdit(tab: string, editId: string) {
    switch (tab) {
      case 'bills': {
        const bill = $billsStore.bills.find((b) => b.id === editId);
        if (bill) {
          openEditDrawer(bill);
        }
        break;
      }
      case 'incomes': {
        const income = $incomesStore.incomes.find((i) => i.id === editId);
        if (income) {
          openEditDrawer(income);
        }
        break;
      }
      case 'payment-sources': {
        const ps = $paymentSourcesStore.paymentSources.find((p) => p.id === editId);
        if (ps) {
          openEditDrawer(ps);
        }
        break;
      }
      case 'categories': {
        const cat = $categoriesStore.categories.find((c) => c.id === editId);
        if (cat) {
          openEditDrawer(cat);
        }
        break;
      }
      // Add other tabs as needed
    }
  }

  // ============ Months Tab Functions ============
  async function loadMonths() {
    monthsLoading = true;
    monthsError = '';
    try {
      const data = (await apiClient.get('/api/months/manage')) as MonthsResponse;
      months = data.months;
    } catch (e) {
      monthsError = e instanceof Error ? e.message : 'Failed to load months';
      console.error('Failed to load months:', e);
    } finally {
      monthsLoading = false;
    }
  }

  function formatMonth(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  function formatMonthAmount(cents: number): string {
    const amount = Math.abs(cents / 100);
    const formatted =
      '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return cents < 0 ? '-' + formatted : formatted;
  }

  function getStatusBadge(month: MonthSummary): { text: string; class: string } {
    if (!month.exists) {
      return { text: 'Not Created', class: 'badge-muted' };
    }
    if (month.is_read_only) {
      return { text: 'Locked', class: 'badge-warning' };
    }
    return { text: 'Active', class: 'badge-success' };
  }

  async function handleCreateMonth(month: string) {
    monthConfirmTitle = 'Create Month';
    monthConfirmMessage = `Create ${formatMonth(month)}? This will copy your current bills, incomes, and variable expense templates into this month.`;
    monthConfirmAction = async () => {
      try {
        await apiClient.post(`/api/months/${month}/create`, {});
        addToast(`Created ${formatMonth(month)}`, 'success');
        await loadMonths();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to create month';
        addToast(msg, 'error');
      }
    };
    showMonthConfirm = true;
  }

  async function handleToggleLock(month: MonthSummary) {
    const action = month.is_read_only ? 'Unlock' : 'Lock';
    monthConfirmTitle = `${action} Month`;
    monthConfirmMessage = month.is_read_only
      ? `Unlock ${formatMonth(month.month)}? You will be able to make changes again.`
      : `Lock ${formatMonth(month.month)}? This will prevent any changes to this month's data.`;
    monthConfirmAction = async () => {
      try {
        await apiClient.post(`/api/months/${month.month}/lock`, {});
        addToast(
          `${formatMonth(month.month)} ${month.is_read_only ? 'unlocked' : 'locked'}`,
          'success'
        );
        await loadMonths();
      } catch (e) {
        const msg = e instanceof Error ? e.message : `Failed to ${action.toLowerCase()} month`;
        addToast(msg, 'error');
      }
    };
    showMonthConfirm = true;
  }

  async function handleDeleteMonth(month: MonthSummary) {
    if (month.is_read_only) {
      addToast('Cannot delete a locked month. Unlock it first.', 'error');
      return;
    }

    monthConfirmTitle = 'Delete Month';
    monthConfirmMessage = `Delete ${formatMonth(month.month)}? All bills, incomes, expenses, and payment records for this month will be permanently deleted. This cannot be undone.`;
    monthConfirmAction = async () => {
      try {
        await apiClient.deletePath(`/api/months/${month.month}`);
        addToast(`Deleted ${formatMonth(month.month)}`, 'success');
        await loadMonths();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to delete month';
        addToast(msg, 'error');
      }
    };
    showMonthConfirm = true;
  }

  async function handleMonthConfirm() {
    if (!monthConfirmAction) return;
    monthActionLoading = true;
    try {
      await monthConfirmAction();
    } finally {
      monthActionLoading = false;
      showMonthConfirm = false;
      monthConfirmAction = null;
    }
  }

  function handleMonthCancel() {
    showMonthConfirm = false;
    monthConfirmAction = null;
  }

  function navigateToMonth(month: string) {
    goto(`/month/${month}`);
  }

  // Drawer title based on mode and active tab
  $: drawerTitle = (() => {
    switch (drawerMode) {
      case 'add':
        return `Add ${getTabSingular(activeTab)}`;
      case 'edit':
        return `Edit ${getTabSingular(activeTab)}`;
      case 'view':
        return getTabSingular(activeTab);
    }
  })();

  function getTabSingular(tab: TabId): string {
    switch (tab) {
      case 'months':
        return 'Month';
      case 'payment-sources':
        return 'Payment Source';
      case 'bills':
        return 'Bill';
      case 'incomes':
        return 'Income';
      case 'categories':
        return 'Category';
      case 'insurance-plans':
        return 'Insurance Plan';
      case 'insurance-categories':
        return 'Insurance Category';
      case 'family':
        return 'Family Member';
      case 'todos':
        return 'Todo';
    }
  }

  function openAddDrawer() {
    drawerMode = 'add';
    clearAllItems();
    drawerOpen = true;
  }

  function openViewDrawer(
    item:
      | PaymentSource
      | Bill
      | Income
      | Category
      | InsurancePlan
      | InsuranceCategory
      | FamilyMember
  ) {
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
      case 'insurance-plans':
        viewingInsurancePlan = item as InsurancePlan;
        break;
      case 'insurance-categories':
        viewingInsuranceCategory = item as InsuranceCategory;
        break;
      case 'family':
        viewingFamilyMember = item as FamilyMember;
        break;
    }

    drawerOpen = true;
  }

  function openEditDrawer(
    item:
      | PaymentSource
      | Bill
      | Income
      | Category
      | InsurancePlan
      | InsuranceCategory
      | FamilyMember
  ) {
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
      case 'insurance-plans':
        editingInsurancePlan = item as InsurancePlan;
        break;
      case 'insurance-categories':
        editingInsuranceCategory = item as InsuranceCategory;
        break;
      case 'family':
        editingFamilyMember = item as FamilyMember;
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
    if (viewingInsurancePlan) editingInsurancePlan = viewingInsurancePlan;
    if (viewingInsuranceCategory) editingInsuranceCategory = viewingInsuranceCategory;
    if (viewingFamilyMember) editingFamilyMember = viewingFamilyMember;

    // Clear viewing items
    viewingPaymentSource = null;
    viewingBill = null;
    viewingIncome = null;
    viewingCategory = null;
    viewingInsurancePlan = null;
    viewingInsuranceCategory = null;
    viewingFamilyMember = null;

    drawerMode = 'edit';
  }

  function clearAllItems() {
    viewingPaymentSource = null;
    viewingBill = null;
    viewingIncome = null;
    viewingCategory = null;
    viewingInsurancePlan = null;
    viewingInsuranceCategory = null;
    viewingFamilyMember = null;
    editingPaymentSource = null;
    editingBill = null;
    editingIncome = null;
    editingCategory = null;
    editingInsurancePlan = null;
    editingInsuranceCategory = null;
    editingFamilyMember = null;
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
          success('Payment source deleted');
          break;
        case 'bills':
          await deleteBill(id);
          success('Bill deleted');
          break;
        case 'incomes':
          await deleteIncome(id);
          success('Income deleted');
          break;
        case 'categories':
          await deleteCategory(id);
          success('Category deleted');
          break;
        case 'insurance-plans':
          await deleteInsurancePlan(id);
          success('Insurance plan deleted');
          break;
        case 'insurance-categories':
          await deleteInsuranceCategory(id);
          success('Insurance category deleted');
          break;
        case 'family':
          await deleteFamilyMember(id);
          success('Family member deleted');
          break;
        case 'todos':
          await deleteTodo(id);
          success('Todo deleted');
          break;
      }
      showDeleteConfirm = false;
      itemToDelete = null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      showError(msg);
      console.error('Delete failed:', e);
    }
  }

  function confirmDelete(item: { id: string; name: string }) {
    // For todos, use the specialized delete dialog
    if (activeTab === 'todos') {
      const todo = $todos.find((t) => t.id === item.id);
      if (todo) {
        todoToDelete = todo;
        showTodoDeleteDialog = true;
      }
      return;
    }
    itemToDelete = item;
    showDeleteConfirm = true;
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    itemToDelete = null;
  }

  function cancelTodoDelete() {
    showTodoDeleteDialog = false;
    todoToDelete = null;
  }

  async function handleConfirmTodoDelete(option: DeleteTodoOption) {
    if (!todoToDelete) return;

    try {
      await deleteTodo(todoToDelete.id, option);
      success('Todo deleted');
      showTodoDeleteDialog = false;
      todoToDelete = null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      showError(msg);
      console.error('Delete failed:', e);
    }
  }

  async function handleConfirmDelete() {
    if (itemToDelete) {
      await handleDelete(itemToDelete.id);
    }
  }

  function _formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  function getPaymentSourceName(id: string): string {
    const ps = $paymentSourcesStore.paymentSources.find((p) => p.id === id);
    return ps?.name || 'Unknown';
  }

  // ============ Todos Modal Handlers ============
  function openAddTodoModal() {
    selectedTodo = null;
    todoModalMode = 'add';
    showTodoModal = true;
  }

  function openViewTodoModal(todo: Todo) {
    selectedTodo = todo;
    todoModalMode = 'view';
    showTodoModal = true;
  }

  function openEditTodoModal(todo: Todo) {
    selectedTodo = todo;
    todoModalMode = 'edit';
    showTodoModal = true;
  }

  function switchTodoToEdit() {
    todoModalMode = 'edit';
  }

  function closeTodoModal() {
    showTodoModal = false;
    selectedTodo = null;
  }

  function handleTodoSave() {
    closeTodoModal();
  }

  async function handleDeleteTodo(todo: Todo) {
    try {
      await deleteTodo(todo.id);
      success('Todo deleted');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      showError(msg);
      console.error('Delete failed:', e);
    }
  }
</script>

<div class="setup-page">
  <!-- Header -->
  <header class="setup-header">
    <h1>Manage</h1>
    <div class="header-spacer"></div>
    <LoadDefaultsButton />
  </header>

  <div class="setup-layout">
    <!-- Left Sidebar - Tabs -->
    <nav class="setup-sidebar">
      {#each tabs as tab (tab.id)}
        <button
          class="tab-button"
          class:active={activeTab === tab.id}
          on:click={() => {
            activeTab = tab.id;
            cancelDelete();
          }}
        >
          {tab.label}
        </button>
      {/each}
    </nav>

    <!-- Main Content Area -->
    <main class="setup-content">
      {#if activeTab === 'months'}
        <!-- Months Tab Content -->
        <div class="content-header">
          <h2>Months</h2>
        </div>

        <div class="months-list">
          {#if monthsLoading}
            <div class="loading-state">Loading months...</div>
          {:else if monthsError}
            <div class="error-state">
              <p>{monthsError}</p>
              <button class="btn btn-primary" on:click={loadMonths}>Retry</button>
            </div>
          {:else}
            {#each months as month (month.month)}
              <div class="month-card" class:not-exists={!month.exists}>
                <div class="month-header">
                  <h3 class="month-name">{formatMonth(month.month)}</h3>
                  <span class="month-badge {getStatusBadge(month).class}">
                    {getStatusBadge(month).text}
                  </span>
                </div>

                {#if month.exists}
                  <div class="month-stats">
                    <div class="stat">
                      <span class="stat-label">Income</span>
                      <span class="stat-value income">{formatMonthAmount(month.total_income)}</span>
                    </div>
                    <div class="stat">
                      <span class="stat-label">Bills</span>
                      <span class="stat-value expense">{formatMonthAmount(month.total_bills)}</span>
                    </div>
                    <div class="stat">
                      <span class="stat-label">Expenses</span>
                      <span class="stat-value expense"
                        >{formatMonthAmount(month.total_expenses)}</span
                      >
                    </div>
                    <div class="stat">
                      <span class="stat-label">Leftover</span>
                      <span
                        class="stat-value"
                        class:positive={month.leftover >= 0}
                        class:negative={month.leftover < 0}
                      >
                        {formatMonthAmount(month.leftover)}
                      </span>
                    </div>
                  </div>

                  <div class="month-actions">
                    <button class="btn btn-secondary" on:click={() => navigateToMonth(month.month)}>
                      View Details
                    </button>
                    <button class="btn btn-outline" on:click={() => handleToggleLock(month)}>
                      {month.is_read_only ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      class="btn btn-danger"
                      disabled={month.is_read_only}
                      title={month.is_read_only ? 'Unlock to delete' : 'Delete month'}
                      on:click={() => handleDeleteMonth(month)}
                    >
                      Delete
                    </button>
                  </div>
                {:else}
                  <div class="month-empty">
                    <p>This month hasn't been created yet.</p>
                  </div>
                  <div class="month-actions">
                    <button class="btn btn-primary" on:click={() => handleCreateMonth(month.month)}>
                      Create Month
                    </button>
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      {:else}
        <!-- Other Tabs Content -->
        <!-- Content Header -->
        <div class="content-header">
          <h2>
            {tabs.find((t) => t.id === activeTab)?.label}
            <span class="count">
              ({#if activeTab === 'payment-sources'}
                {$paymentSourcesStore.paymentSources.length}
              {:else if activeTab === 'bills'}
                {$billsStore.bills.length}
              {:else if activeTab === 'incomes'}
                {$incomesStore.incomes.length}
              {:else if activeTab === 'categories'}
                {$categoriesStore.categories.length}
              {:else if activeTab === 'insurance-plans'}
                {$insurancePlans.length}
              {:else if activeTab === 'insurance-categories'}
                {$insuranceCategories.length}
              {:else if activeTab === 'family'}
                {$familyMembers.length}
              {:else if activeTab === 'todos'}
                {$todos.length}
              {/if})
            </span>
          </h2>
          <button
            class="btn btn-primary"
            on:click={activeTab === 'todos' ? openAddTodoModal : openAddDrawer}
          >
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
              <PaymentSourcesList
                paymentSources={$paymentSourcesStore.paymentSources}
                onView={openViewDrawer}
                onEdit={openEditDrawer}
                onDelete={(ps) => confirmDelete({ id: ps.id, name: ps.name })}
              />
            {/if}
          {:else if activeTab === 'bills'}
            {#if $billsStore.bills.length === 0}
              <div class="empty-state">
                <p>No bills yet.</p>
                <p class="hint">Add your recurring bills like rent, utilities, subscriptions.</p>
              </div>
            {:else}
              <BillsListByCategory
                billsByCategory={$billsByCategory}
                totalFixedCosts={$totalFixedCosts}
                onView={openViewDrawer}
                onEdit={openEditDrawer}
                onDelete={(bill) => confirmDelete({ id: bill.id, name: bill.name })}
                {getPaymentSourceName}
              />
            {/if}
          {:else if activeTab === 'incomes'}
            {#if $incomesStore.incomes.length === 0}
              <div class="empty-state">
                <p>No incomes yet.</p>
                <p class="hint">Add your salary, freelance income, or other recurring income.</p>
              </div>
            {:else}
              <IncomesListByCategory
                incomesByCategory={$incomesByCategory}
                totalMonthlyIncome={$totalMonthlyIncome}
                onView={openViewDrawer}
                onEdit={openEditDrawer}
                onDelete={(income) => confirmDelete({ id: income.id, name: income.name })}
                {getPaymentSourceName}
              />
            {/if}
          {:else if activeTab === 'categories'}
            <!-- Category Orderers for drag-and-drop reordering -->
            <div class="category-orderers">
              <CategoryOrderer
                categories={$billCategories}
                type="bill"
                on:edit={(e) => openEditDrawer(e.detail.category)}
              />
              <CategoryOrderer
                categories={$incomeCategories}
                type="income"
                on:edit={(e) => openEditDrawer(e.detail.category)}
              />
            </div>
          {:else if activeTab === 'insurance-plans'}
            {#if $insurancePlans.length === 0}
              <div class="empty-state">
                <p>No insurance plans yet.</p>
                <p class="hint">Add your insurance plans to track claims and reimbursements.</p>
              </div>
            {:else}
              <InsurancePlansList
                plans={$insurancePlans}
                onView={openViewDrawer}
                onEdit={openEditDrawer}
                onDelete={(plan) => confirmDelete({ id: plan.id, name: plan.name })}
              />
            {/if}
          {:else if activeTab === 'insurance-categories'}
            {#if $insuranceCategories.length === 0}
              <div class="empty-state">
                <p>No insurance categories yet.</p>
                <p class="hint">
                  Categories will be created automatically when you access insurance claims.
                </p>
              </div>
            {:else}
              <InsuranceCategoriesList
                categories={$insuranceCategories}
                onView={openViewDrawer}
                onEdit={openEditDrawer}
                onDelete={(cat) => confirmDelete({ id: cat.id, name: cat.name })}
              />
            {/if}
          {:else if activeTab === 'family'}
            {#if $familyMembers.length === 0}
              <div class="empty-state">
                <p>No family members yet.</p>
                <p class="hint">Add family members to track insurance claims for each person.</p>
              </div>
            {:else}
              <FamilyMembersList
                members={$familyMembers}
                onView={openViewDrawer}
                onEdit={openEditDrawer}
                onDelete={(member) => confirmDelete({ id: member.id, name: member.name })}
              />
            {/if}
          {:else if activeTab === 'todos'}
            {#if $todos.length === 0}
              <div class="empty-state">
                <p>No todo templates yet.</p>
                <p class="hint">Add your first todo to track recurring tasks and reminders.</p>
              </div>
            {:else}
              <TodosList
                todos={$todos}
                onView={openViewTodoModal}
                onEdit={openEditTodoModal}
                onDelete={(todo) => confirmDelete({ id: todo.id, name: todo.title })}
              />
            {/if}
          {/if}
        </div>
      {/if}
    </main>
  </div>

  <!-- Drawer -->
  <Drawer
    isOpen={drawerOpen}
    title={drawerTitle}
    onClose={closeDrawer}
    isDirty={checkFormIsDirty}
    onSave={handleSaveFromDialog}
  >
    {#if drawerMode === 'view'}
      {#if activeTab === 'payment-sources' && viewingPaymentSource}
        <PaymentSourceView
          item={viewingPaymentSource}
          onEdit={switchToEdit}
          onClose={closeDrawer}
        />
      {:else if activeTab === 'bills' && viewingBill}
        <BillView item={viewingBill} onEdit={switchToEdit} onClose={closeDrawer} />
      {:else if activeTab === 'incomes' && viewingIncome}
        <IncomeView item={viewingIncome} onEdit={switchToEdit} onClose={closeDrawer} />
      {:else if activeTab === 'categories' && viewingCategory}
        <CategoryView item={viewingCategory} onEdit={switchToEdit} onClose={closeDrawer} />
      {:else if activeTab === 'insurance-plans' && viewingInsurancePlan}
        <InsurancePlanView
          item={viewingInsurancePlan}
          onEdit={switchToEdit}
          onClose={closeDrawer}
        />
      {:else if activeTab === 'insurance-categories' && viewingInsuranceCategory}
        <InsuranceCategoryView
          item={viewingInsuranceCategory}
          onEdit={switchToEdit}
          onClose={closeDrawer}
        />
      {:else if activeTab === 'family' && viewingFamilyMember}
        <FamilyMemberView item={viewingFamilyMember} onEdit={switchToEdit} onClose={closeDrawer} />
      {/if}
    {:else if activeTab === 'payment-sources'}
      <PaymentSourceForm
        bind:this={paymentSourceFormRef}
        editingItem={editingPaymentSource}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {:else if activeTab === 'bills'}
      <BillForm
        bind:this={billFormRef}
        editingItem={editingBill}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {:else if activeTab === 'incomes'}
      <IncomeForm
        bind:this={incomeFormRef}
        editingItem={editingIncome}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {:else if activeTab === 'categories'}
      <CategoryForm
        bind:this={categoryFormRef}
        editingItem={editingCategory}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {:else if activeTab === 'insurance-plans'}
      <InsurancePlanForm
        bind:this={insurancePlanFormRef}
        editingItem={editingInsurancePlan}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {:else if activeTab === 'insurance-categories'}
      <InsuranceCategoryForm
        bind:this={insuranceCategoryFormRef}
        editingItem={editingInsuranceCategory}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {:else if activeTab === 'family'}
      <FamilyMemberForm
        bind:this={familyMemberFormRef}
        editingItem={editingFamilyMember}
        onSave={handleSave}
        onCancel={closeDrawer}
      />
    {/if}
  </Drawer>

  <!-- Delete Confirmation Dialog -->
  <ConfirmDialog
    open={showDeleteConfirm}
    title="Delete {getTabSingular(activeTab)}"
    message="Are you sure you want to delete '{itemToDelete?.name}'? This action cannot be undone."
    confirmText="Delete"
    on:confirm={handleConfirmDelete}
    on:cancel={cancelDelete}
  />

  <!-- Todo Delete Confirmation Dialog -->
  <TodoDeleteDialog
    open={showTodoDeleteDialog}
    todoTitle={todoToDelete?.title || ''}
    isRecurring={todoToDelete?.recurrence !== 'none'}
    onConfirm={handleConfirmTodoDelete}
    onCancel={cancelTodoDelete}
  />

  <!-- Month Action Confirmation Dialog -->
  <ConfirmDialog
    open={showMonthConfirm}
    title={monthConfirmTitle}
    message={monthConfirmMessage}
    confirmText={monthActionLoading ? 'Processing...' : 'Confirm'}
    on:confirm={handleMonthConfirm}
    on:cancel={handleMonthCancel}
  />

  <!-- Todo Modals (Todos tab uses Modal instead of Drawer) -->
  {#if todoModalMode === 'view'}
    <TodoView
      open={showTodoModal}
      item={selectedTodo}
      onEdit={switchTodoToEdit}
      onClose={closeTodoModal}
    />
  {:else}
    <TodoForm
      open={showTodoModal}
      editingItem={todoModalMode === 'edit' ? selectedTodo : null}
      onSave={handleTodoSave}
      onClose={closeTodoModal}
    />
  {/if}
</div>

<style>
  .setup-page {
    min-height: 100vh;
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  /* Header */
  .setup-header {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--content-padding);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
  }

  .setup-header h1 {
    margin: 0;
    font-size: 1.25rem;
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
    width: var(--tab-sidebar-width);
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-default);
    padding: var(--space-4) 0;
    flex-shrink: 0;
  }

  .tab-button {
    width: 100%;
    height: var(--button-height);
    padding: 0 var(--space-4);
    border: none;
    background: none;
    color: var(--text-secondary);
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tab-button:hover {
    background: var(--accent-muted);
    color: var(--text-primary);
  }

  .tab-button.active {
    background: var(--accent);
    color: var(--text-inverse);
  }

  /* Main Content */
  .setup-content {
    flex: 1;
    padding: var(--content-padding);
    overflow-y: auto;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--section-gap);
    max-width: var(--content-max-setup);
    margin-left: auto;
    margin-right: auto;
  }

  .content-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .count {
    color: var(--text-secondary);
    font-weight: normal;
  }

  /* Entity List */
  .entity-list {
    display: flex;
    flex-direction: column;
    gap: var(--card-gap);
    max-width: var(--content-max-setup);
    margin: 0 auto;
  }

  .empty-state {
    text-align: center;
    padding: 60px var(--space-4);
    color: var(--text-secondary);
  }

  .empty-state p {
    margin: 0 0 var(--space-2);
  }

  .empty-state .hint {
    font-size: 0.875rem;
    color: var(--text-tertiary);
  }

  /* Category Orderers */
  .category-orderers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--section-gap);
    margin-bottom: var(--section-gap);
  }

  /* Buttons */
  .btn {
    height: var(--button-height);
    padding: 0 var(--space-4);
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  /* ============ Months Tab Styles ============ */
  .months-list {
    display: flex;
    flex-direction: column;
    gap: var(--card-gap);
    max-width: var(--content-max-setup);
    margin: 0 auto;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
  }

  .error-state p {
    margin-bottom: 20px;
    color: var(--error);
  }

  .month-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    transition: border-color 0.15s ease;
  }

  .month-card:hover {
    border-color: var(--accent);
  }

  .month-card.not-exists {
    opacity: 0.7;
  }

  .month-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .month-name {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .month-badge {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--space-1);
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-success {
    background: var(--success-muted);
    color: var(--success);
  }

  .badge-warning {
    background: var(--warning-muted);
    color: var(--warning);
  }

  .badge-muted {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .month-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 600;
  }

  .stat-value.income {
    color: var(--success);
  }

  .stat-value.expense {
    color: var(--error);
  }

  .stat-value.positive {
    color: var(--success);
  }

  .stat-value.negative {
    color: var(--error);
  }

  .month-empty {
    padding: var(--space-4) 0;
    text-align: center;
    color: var(--text-secondary);
  }

  .month-empty p {
    margin: 0;
  }

  .month-actions {
    display: flex;
    gap: var(--space-2);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-default);
  }

  .btn-secondary {
    background: var(--border-default);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn-outline {
    background: transparent;
    border: 1px solid var(--border-default);
    color: var(--text-primary);
  }

  .btn-outline:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .btn-danger {
    background: transparent;
    border: 1px solid var(--error);
    color: var(--error);
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--error);
    color: var(--text-on-error, #fff);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .setup-header {
      padding: var(--space-4) var(--content-padding-mobile);
    }

    .setup-layout {
      flex-direction: column;
    }

    .setup-sidebar {
      width: 100%;
      display: flex;
      overflow-x: auto;
      padding: 0;
      border-right: none;
      border-bottom: 1px solid var(--border-default);
    }

    .tab-button {
      flex-shrink: 0;
      padding: 0 var(--space-4);
    }

    .setup-content {
      padding: var(--content-padding-mobile);
    }

    .content-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--card-gap);
    }

    .content-header .btn {
      width: 100%;
    }

    .category-orderers {
      grid-template-columns: 1fr;
    }

    .month-stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .month-actions {
      flex-wrap: wrap;
    }

    .month-actions .btn {
      flex: 1;
      min-width: 100px;
    }
  }
</style>
