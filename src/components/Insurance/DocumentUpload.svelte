<script lang="ts">
  /**
   * DocumentUpload - File upload component for claim documents
   */
  import type { ClaimDocument, DocumentType } from '../../types/insurance';
  import { uploadDocument, deleteDocument, getDocumentUrl } from '../../stores/insurance-claims';
  import { activePlans } from '../../stores/insurance-plans';
  import { success, error as showError } from '../../stores/toast';
  import { createEventDispatcher } from 'svelte';

  export let claimId: string;
  export let documents: ClaimDocument[] = [];
  export let readonly = false;

  const dispatch = createEventDispatcher<{ uploaded: void; deleted: void }>();

  let uploading = false;
  let selectedDocType: DocumentType = 'receipt';
  let selectedPlanId = '';
  let fileInput: HTMLInputElement;

  function getDocTypeLabel(type: DocumentType): string {
    switch (type) {
      case 'receipt':
        return 'Receipt';
      case 'eob':
        return 'EOB';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function triggerFileSelect() {
    fileInput?.click();
  }

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploading = true;
    try {
      await uploadDocument(claimId, file, selectedDocType, selectedPlanId || undefined);
      success(`Document "${file.name}" uploaded`);
      dispatch('uploaded');

      // Reset form
      input.value = '';
      selectedDocType = 'receipt';
      selectedPlanId = '';
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to upload document');
    } finally {
      uploading = false;
    }
  }

  async function handleDelete(doc: ClaimDocument) {
    if (!confirm(`Delete document "${doc.original_filename}"?`)) return;

    try {
      await deleteDocument(claimId, doc.id);
      success('Document deleted');
      dispatch('deleted');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to delete document');
    }
  }

  function openDocument(doc: ClaimDocument) {
    const url = getDocumentUrl(claimId, doc.id);
    window.open(url, '_blank');
  }
</script>

<div class="document-section">
  <div class="section-header">
    <h4>Documents ({documents.length})</h4>
  </div>

  {#if documents.length > 0}
    <div class="documents-list">
      {#each documents as doc (doc.id)}
        <div class="document-item">
          <button class="doc-info" on:click={() => openDocument(doc)}>
            <span class="doc-icon">
              {#if doc.mime_type.startsWith('image/')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path
                    d="M21 15l-5-5L5 21"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" />
                </svg>
              {/if}
            </span>
            <span class="doc-name">{doc.original_filename}</span>
          </button>
          <div class="doc-meta">
            <span class="doc-type">{getDocTypeLabel(doc.document_type)}</span>
            <span class="doc-size">{formatFileSize(doc.size_bytes)}</span>
            <span class="doc-date">{formatDate(doc.uploaded_at)}</span>
          </div>
          {#if !readonly}
            <button
              class="btn-icon danger"
              on:click={() => handleDelete(doc)}
              title="Delete document"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="no-docs">No documents attached.</p>
  {/if}

  {#if !readonly}
    <div class="upload-form">
      <div class="upload-options">
        <select bind:value={selectedDocType} disabled={uploading}>
          <option value="receipt">Receipt</option>
          <option value="eob">EOB</option>
          <option value="other">Other</option>
        </select>
        {#if selectedDocType === 'eob' && $activePlans.length > 0}
          <select bind:value={selectedPlanId} disabled={uploading}>
            <option value="">-- Select Plan --</option>
            {#each $activePlans as plan (plan.id)}
              <option value={plan.id}>{plan.name}</option>
            {/each}
          </select>
        {/if}
      </div>
      <input
        type="file"
        bind:this={fileInput}
        on:change={handleFileChange}
        accept="image/*,.pdf,.doc,.docx"
        class="hidden-input"
      />
      <button class="btn btn-secondary" on:click={triggerFileSelect} disabled={uploading}>
        {#if uploading}
          Uploading...
        {:else}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <polyline
              points="17,8 12,3 7,8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <line
              x1="12"
              y1="3"
              x2="12"
              y2="15"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
          Upload Document
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .document-section {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-default);
  }

  .section-header {
    margin-bottom: var(--space-3);
  }

  .section-header h4 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .documents-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .document-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
  }

  .doc-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--text-primary);
    text-align: left;
  }

  .doc-info:hover {
    color: var(--accent);
  }

  .doc-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .doc-name {
    flex: 1;
    font-size: 0.8125rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .doc-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.6875rem;
    color: var(--text-tertiary);
  }

  .doc-type {
    padding: 2px 6px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    font-weight: 500;
  }

  .no-docs {
    color: var(--text-tertiary);
    font-size: 0.8125rem;
    margin: 0 0 var(--space-3) 0;
  }

  .upload-form {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }

  .upload-options {
    display: flex;
    gap: var(--space-2);
  }

  .upload-options select {
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.75rem;
  }

  .hidden-input {
    display: none;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon.danger:hover {
    background: var(--error-muted);
    color: var(--error);
  }
</style>
