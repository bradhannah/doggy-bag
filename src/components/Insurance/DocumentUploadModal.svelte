<script lang="ts">
  /**
   * DocumentUploadModal - Modal for uploading claim documents with metadata
   *
   * @prop open - Whether the modal is open
   * @prop claimId - The claim ID to upload the document to
   */
  import type { DocumentType } from '../../types/insurance';
  import { uploadDocument } from '../../stores/insurance-claims';
  import { activePlans } from '../../stores/insurance-plans';
  import { success, error as showError } from '../../stores/toast';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let open: boolean = false;
  export let claimId: string;

  const dispatch = createEventDispatcher<{ uploaded: void; close: void }>();

  // Form state
  let selectedFile: File | null = null;
  let documentType: DocumentType = 'receipt';
  let relatedPlanId = '';
  let notes = '';
  let uploading = false;
  let dragOver = false;

  // File input ref
  let fileInput: HTMLInputElement;

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) {
      selectedFile = file;
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    selectedFile = input.files?.[0] || null;
  }

  function triggerFileSelect() {
    fileInput?.click();
  }

  function clearFile() {
    selectedFile = null;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;

    uploading = true;
    try {
      await uploadDocument(
        claimId,
        selectedFile,
        documentType,
        relatedPlanId || undefined,
        notes || undefined
      );
      success(`Document "${selectedFile.name}" uploaded`);
      dispatch('uploaded');
      handleClose();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to upload document');
    } finally {
      uploading = false;
    }
  }

  function handleClose() {
    // Reset form
    selectedFile = null;
    documentType = 'receipt';
    relatedPlanId = '';
    notes = '';
    if (fileInput) {
      fileInput.value = '';
    }
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      handleClose();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <div
    class="modal-backdrop"
    role="presentation"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
  >
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-header">
        <h3 id="modal-title">Upload Document</h3>
        <button class="btn-close" on:click={handleClose} title="Close" disabled={uploading}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Drop zone -->
        <div
          class="drop-zone"
          class:drag-over={dragOver}
          class:has-file={selectedFile}
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
          on:click={triggerFileSelect}
          on:keydown={(e) => e.key === 'Enter' && triggerFileSelect()}
          role="button"
          tabindex="0"
        >
          {#if selectedFile}
            <div class="file-info">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="file-icon">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" />
              </svg>
              <span class="file-name">{selectedFile.name}</span>
              <span class="file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
            <button
              class="btn-clear"
              on:click|stopPropagation={clearFile}
              title="Remove file"
              type="button"
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
          {:else}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="upload-icon">
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
            <span class="drop-text">Drag & drop a file here, or click to browse</span>
            <span class="drop-hint">PDF, JPG, PNG, GIF, WebP (max 10MB)</span>
          {/if}
        </div>
        <input
          type="file"
          bind:this={fileInput}
          on:change={handleFileSelect}
          accept="image/*,.pdf"
          class="hidden-input"
        />

        <!-- Document Type -->
        <div class="form-group">
          <label for="doc-type">Document Type</label>
          <select id="doc-type" bind:value={documentType} disabled={uploading}>
            <option value="receipt">Receipt</option>
            <option value="eob">EOB (Explanation of Benefits)</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Related Plan (conditional) -->
        {#if documentType === 'eob' && $activePlans.length > 0}
          <div class="form-group">
            <label for="related-plan">Related Plan</label>
            <select id="related-plan" bind:value={relatedPlanId} disabled={uploading}>
              <option value="">-- Select Plan --</option>
              {#each $activePlans as plan (plan.id)}
                <option value={plan.id}>{plan.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Notes -->
        <div class="form-group">
          <label for="doc-notes">Notes <span class="optional">(optional)</span></label>
          <textarea
            id="doc-notes"
            bind:value={notes}
            placeholder="Add notes about this document..."
            rows="3"
            disabled={uploading}
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleClose} disabled={uploading}>
          Cancel
        </button>
        <button
          class="btn btn-primary"
          on:click={handleUpload}
          disabled={!selectedFile || uploading}
        >
          {#if uploading}
            Uploading...
          {:else}
            Upload
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: var(--overlay-bg);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9998;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    width: 90%;
    min-width: 320px;
    max-width: 480px;
    box-shadow: 0 16px 48px var(--shadow-heavy);
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: scale(0.95) translateY(-10px);
      opacity: 0;
    }
    to {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border-default);
  }

  .modal-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  .btn-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-close:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .btn-close:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-body {
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .drop-zone {
    border: 2px dashed var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    position: relative;
  }

  .drop-zone:hover,
  .drop-zone.drag-over {
    border-color: var(--accent);
    background: var(--accent-muted);
  }

  .drop-zone.has-file {
    border-style: solid;
    border-color: var(--success);
    background: var(--success-muted);
    flex-direction: row;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
  }

  .upload-icon {
    color: var(--text-tertiary);
  }

  .drop-text {
    font-size: 0.875rem;
    color: var(--text-primary);
  }

  .drop-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
  }

  .file-icon {
    color: var(--success);
    flex-shrink: 0;
  }

  .file-name {
    font-size: 0.875rem;
    color: var(--text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-size {
    font-size: 0.75rem;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .btn-clear {
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
    flex-shrink: 0;
  }

  .btn-clear:hover {
    background: var(--error-muted);
    color: var(--error);
  }

  .hidden-input {
    display: none;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-group label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .optional {
    font-weight: 400;
    color: var(--text-tertiary);
  }

  .form-group select,
  .form-group textarea {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
  }

  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  .form-group select:disabled,
  .form-group textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .modal-footer {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    border-top: 1px solid var(--border-default);
  }

  .btn {
    flex: 1;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.15s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-inverse);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }
</style>
