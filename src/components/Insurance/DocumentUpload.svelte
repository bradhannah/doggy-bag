<script lang="ts">
  /**
   * DocumentUpload - File upload component for claim documents
   */
  import type { ClaimDocument, DocumentType } from '../../types/insurance';
  import { deleteDocument, getDocumentUrl } from '../../stores/insurance-claims';
  import { success, error as showError } from '../../stores/toast';
  import { createEventDispatcher } from 'svelte';
  import DocumentUploadModal from './DocumentUploadModal.svelte';
  import ConfirmDialog from '../shared/ConfirmDialog.svelte';
  import { formatDate } from '$lib/utils/format';

  export let claimId: string;
  export let documents: ClaimDocument[] = [];
  export let readonly = false;

  const dispatch = createEventDispatcher<{ uploaded: void; deleted: void }>();

  let showUploadModal = false;
  let showDeleteConfirm = false;
  let docToDelete: ClaimDocument | null = null;

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

  function promptDelete(doc: ClaimDocument) {
    docToDelete = doc;
    showDeleteConfirm = true;
  }

  async function confirmDelete() {
    if (!docToDelete) return;

    try {
      await deleteDocument(claimId, docToDelete.id);
      success('Document deleted');
      dispatch('deleted');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to delete document');
    } finally {
      showDeleteConfirm = false;
      docToDelete = null;
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    docToDelete = null;
  }

  function openDocument(doc: ClaimDocument) {
    const url = getDocumentUrl(claimId, doc.id);
    window.open(url, '_blank');
  }

  function downloadDocument(doc: ClaimDocument) {
    const url = getDocumentUrl(claimId, doc.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.original_filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleUploadComplete() {
    showUploadModal = false;
    dispatch('uploaded');
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
          {#if !readonly}
            <button
              class="btn-icon danger delete-btn"
              on:click={() => promptDelete(doc)}
              title="Delete document"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          {/if}
          <div class="doc-content">
            <div class="doc-header">
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
              <button class="doc-name-btn" on:click={() => downloadDocument(doc)} title="Download">
                {doc.original_filename}
              </button>
              <button
                class="doc-open-btn"
                on:click={() => openDocument(doc)}
                title="Open in new tab"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div class="doc-meta">
              <span class="doc-type">{getDocTypeLabel(doc.document_type)}</span>
              <span class="doc-size">{formatFileSize(doc.size_bytes)}</span>
              <span class="doc-date">{formatDate(doc.uploaded_at)}</span>
            </div>
            {#if doc.notes}
              <div class="doc-notes">{doc.notes}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="no-docs">No documents attached.</p>
  {/if}

  {#if !readonly}
    <button class="btn btn-secondary" on:click={() => (showUploadModal = true)}>
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
    </button>

    <DocumentUploadModal
      open={showUploadModal}
      {claimId}
      on:uploaded={handleUploadComplete}
      on:close={() => (showUploadModal = false)}
    />

    <ConfirmDialog
      open={showDeleteConfirm}
      title="Delete Document"
      message={docToDelete
        ? `Are you sure you want to delete "${docToDelete.original_filename}"?`
        : ''}
      confirmText="Delete"
      confirmStyle="danger"
      on:confirm={confirmDelete}
      on:cancel={cancelDelete}
    />
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
    position: relative;
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2);
    padding-right: var(--space-8);
    background: var(--bg-base);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
  }

  .delete-btn {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
  }

  .doc-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .doc-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .doc-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .doc-name-btn {
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 0.8125rem;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: all 0.15s;
  }

  .doc-name-btn:hover {
    color: var(--accent);
    text-decoration-color: var(--accent);
  }

  .doc-open-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .doc-open-btn:hover {
    color: var(--accent);
    background: var(--accent-muted);
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

  .doc-notes {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
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
