<script lang="ts">
  /**
   * InsuranceClaimsPage - Main page component for insurance claims management
   * Layout: Left panel (claims list) + Right panel (claim detail or form)
   * Supports both regular claims and expected expenses
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { InsuranceClaim } from '../../types/insurance';
  import {
    loadInsuranceClaims,
    loadClaimsSummary,
    getClaimById,
  } from '../../stores/insurance-claims';
  import { loadInsurancePlans, activePlans } from '../../stores/insurance-plans';
  import { loadInsuranceCategories, activeCategories } from '../../stores/insurance-categories';

  import ClaimsSummary from './ClaimsSummary.svelte';
  import ClaimsList from './ClaimsList.svelte';
  import ClaimDetail from './ClaimDetail.svelte';
  import ClaimForm from './ClaimForm.svelte';
  import ExpectedExpenseForm from './ExpectedExpenseForm.svelte';
  import ConvertToClaimModal from './ConvertToClaimModal.svelte';
  import Drawer from '../shared/Drawer.svelte';

  // Page state
  let selectedClaim: InsuranceClaim | null = null;
  let highlightSubmissionId: string | null = null;
  let showNewClaimDrawer = false;
  let showEditClaimDrawer = false;
  let showNewExpectedDrawer = false;
  let showEditExpectedDrawer = false;
  let showConvertModal = false;
  let convertingClaim: InsuranceClaim | null = null;
  let editingClaim: InsuranceClaim | null = null;
  let claimFormComponent: ClaimForm;
  let expectedFormComponent: ExpectedExpenseForm;

  // Load all data on mount, and auto-select claim if URL param present
  onMount(async () => {
    await Promise.all([
      loadInsurancePlans(),
      loadInsuranceCategories(),
      loadInsuranceClaims(),
      loadClaimsSummary(),
    ]);

    // Check for claim ID in URL query params
    const claimId = $page.url.searchParams.get('claim');
    const submissionId = $page.url.searchParams.get('submission');
    if (claimId) {
      const claim = await getClaimById(claimId);
      if (claim) {
        selectedClaim = claim;
        // If a specific submission was requested, highlight it
        if (submissionId) {
          highlightSubmissionId = submissionId;
        }
      }
    }
  });

  function handleSelectClaim(event: CustomEvent<InsuranceClaim>) {
    selectedClaim = event.detail;
    highlightSubmissionId = null; // Clear highlight when selecting a different claim
  }

  function handleCreateClaim() {
    editingClaim = null;
    showNewClaimDrawer = true;
  }

  function handleEditClaim() {
    if (selectedClaim) {
      editingClaim = selectedClaim;
      if (selectedClaim.status === 'expected') {
        showEditExpectedDrawer = true;
      } else {
        showEditClaimDrawer = true;
      }
    }
  }

  function handleCreateExpected() {
    editingClaim = null;
    showNewExpectedDrawer = true;
  }

  async function handleClaimSaved() {
    showNewClaimDrawer = false;
    showEditClaimDrawer = false;
    showNewExpectedDrawer = false;
    showEditExpectedDrawer = false;
    await loadInsuranceClaims();
    await loadClaimsSummary();

    // If editing, refresh the selected claim
    if (editingClaim && selectedClaim) {
      const updated = await getClaimById(editingClaim.id);
      if (updated) {
        selectedClaim = updated;
      }
    }
    editingClaim = null;
  }

  function handleClaimFormCancel() {
    showNewClaimDrawer = false;
    showEditClaimDrawer = false;
    showNewExpectedDrawer = false;
    showEditExpectedDrawer = false;
    editingClaim = null;
  }

  async function handleClaimDeleted() {
    selectedClaim = null;
    await loadInsuranceClaims();
    await loadClaimsSummary();
  }

  function handleConvertClaim() {
    if (selectedClaim && selectedClaim.status === 'expected') {
      convertingClaim = selectedClaim;
      showConvertModal = true;
    }
  }

  async function handleClaimConverted() {
    showConvertModal = false;
    convertingClaim = null;
    selectedClaim = null;
    await loadInsuranceClaims();
    await loadClaimsSummary();
  }

  function closeConvertModal() {
    showConvertModal = false;
    convertingClaim = null;
  }

  async function handleClaimUpdated() {
    // Refresh the selected claim from the store
    if (selectedClaim) {
      const updated = await getClaimById(selectedClaim.id);
      if (updated) {
        selectedClaim = updated;
      }
    }
    await loadClaimsSummary();
  }

  function closeDetail() {
    selectedClaim = null;
  }

  // Check if setup is needed
  $: needsSetup = $activePlans.length === 0 || $activeCategories.length === 0;
</script>

<div class="insurance-page">
  <!-- Page Header -->
  <header class="page-header">
    <h1>Insurance Claims</h1>
    <p class="subtitle">Track medical expenses and reimbursements</p>
  </header>

  <!-- Summary Cards -->
  <ClaimsSummary />

  <!-- Setup Notice -->
  {#if needsSetup}
    <div class="setup-notice">
      <h3>Get Started</h3>
      <p>Before you can track claims, you need to set up your insurance plans and categories.</p>
      <a href="/setup" class="btn btn-primary">Go to Manage Page</a>
    </div>
  {/if}

  <!-- Main Content -->
  <div class="main-content" class:with-detail={selectedClaim}>
    <!-- Claims List Panel -->
    <div class="list-panel">
      <ClaimsList
        {selectedClaim}
        on:select={handleSelectClaim}
        on:create={handleCreateClaim}
        on:createExpected={handleCreateExpected}
      />
    </div>

    <!-- Detail Panel (shown when a claim is selected) -->
    {#if selectedClaim}
      <div class="detail-panel">
        <div class="detail-header-bar">
          <button class="close-btn" on:click={closeDetail} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div class="detail-content">
          <ClaimDetail
            claim={selectedClaim}
            onEdit={handleEditClaim}
            onClose={closeDetail}
            {highlightSubmissionId}
            on:deleted={handleClaimDeleted}
            on:updated={handleClaimUpdated}
            on:convert={handleConvertClaim}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- New Claim Drawer -->
<Drawer
  isOpen={showNewClaimDrawer}
  title="New Claim"
  onClose={handleClaimFormCancel}
  isDirty={() => claimFormComponent?.isDirty() ?? false}
  onSave={() => claimFormComponent?.handleSubmit()}
>
  <ClaimForm
    bind:this={claimFormComponent}
    editingItem={null}
    onSave={handleClaimSaved}
    onCancel={handleClaimFormCancel}
  />
</Drawer>

<!-- Edit Claim Drawer -->
<Drawer
  isOpen={showEditClaimDrawer}
  title="Edit Claim"
  onClose={handleClaimFormCancel}
  isDirty={() => claimFormComponent?.isDirty() ?? false}
  onSave={() => claimFormComponent?.handleSubmit()}
>
  <ClaimForm
    bind:this={claimFormComponent}
    editingItem={editingClaim}
    onSave={handleClaimSaved}
    onCancel={handleClaimFormCancel}
  />
</Drawer>

<!-- New Expected Expense Drawer -->
<Drawer
  isOpen={showNewExpectedDrawer}
  title="Schedule Expected Expense"
  onClose={handleClaimFormCancel}
  isDirty={() => expectedFormComponent?.isDirty() ?? false}
  onSave={() => expectedFormComponent?.handleSubmit()}
>
  <ExpectedExpenseForm
    bind:this={expectedFormComponent}
    editingItem={null}
    onSave={handleClaimSaved}
    onCancel={handleClaimFormCancel}
  />
</Drawer>

<!-- Edit Expected Expense Drawer -->
<Drawer
  isOpen={showEditExpectedDrawer}
  title="Edit Expected Expense"
  onClose={handleClaimFormCancel}
  isDirty={() => expectedFormComponent?.isDirty() ?? false}
  onSave={() => expectedFormComponent?.handleSubmit()}
>
  <ExpectedExpenseForm
    bind:this={expectedFormComponent}
    editingItem={editingClaim}
    onSave={handleClaimSaved}
    onCancel={handleClaimFormCancel}
  />
</Drawer>

<!-- Convert to Claim Modal -->
{#if showConvertModal && convertingClaim}
  <ConvertToClaimModal
    claim={convertingClaim}
    open={showConvertModal}
    onClose={closeConvertModal}
    on:converted={handleClaimConverted}
  />
{/if}

<style>
  .insurance-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--content-padding);
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height, 0px));
  }

  .page-header {
    margin-bottom: var(--space-4);
  }

  .page-header h1 {
    margin: 0 0 var(--space-1);
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .subtitle {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9375rem;
  }

  .setup-notice {
    background: var(--accent-muted);
    border: 1px solid var(--accent-border, var(--accent));
    border-radius: var(--radius-md);
    padding: var(--space-6);
    text-align: center;
    margin-bottom: var(--space-4);
  }

  .setup-notice h3 {
    margin: 0 0 var(--space-2);
    color: var(--text-primary);
  }

  .setup-notice p {
    margin: 0 0 var(--space-4);
    color: var(--text-secondary);
  }

  .main-content {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--card-gap);
    min-height: 0;
  }

  .main-content.with-detail {
    grid-template-columns: 400px 1fr;
  }

  .list-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 400px;
  }

  .detail-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .detail-header-bar {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-2);
    border-bottom: 1px solid var(--border-default);
    background: var(--bg-elevated);
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: var(--accent-muted);
    color: var(--text-primary);
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  /* Button styles */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .main-content.with-detail {
      grid-template-columns: 1fr;
    }

    .list-panel {
      display: none;
    }

    .main-content.with-detail .list-panel {
      display: none;
    }
  }

  @media (max-width: 768px) {
    .insurance-page {
      padding: var(--content-padding-mobile, var(--space-3));
    }
  }
</style>
