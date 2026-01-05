# Quickstart: CI/CD Pipeline & Test Coverage

**Branch**: `007-cicd-test-coverage` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)

## Quick Commands

### Run All Tests

```bash
# Run all tests (backend + frontend)
make test

# Run backend tests only (Bun)
make test-backend

# Run frontend tests only (Vitest)
make test-frontend

# Run frontend tests with coverage
npx vitest run --coverage
```

### Check Test Coverage

```bash
# Generate coverage report (opens in browser)
npx vitest run --coverage
open coverage/index.html
```

### Validate Before PR

```bash
# Run the full validation suite locally
make lint && make format-check && bun run check && make test

# Or run everything in one command
make validate  # If added to Makefile
```

## Test File Locations

| Category            | Location                      | Pattern                |
| ------------------- | ----------------------------- | ---------------------- |
| Backend tests       | `api/src/**/*.test.ts`        | Co-located with source |
| Frontend stores     | `src/stores/*.test.ts`        | Co-located with source |
| Frontend components | `src/components/**/*.test.ts` | Co-located with source |
| Frontend lib        | `src/lib/**/*.test.ts`        | Co-located with source |

## Writing a Store Test

```typescript
// src/stores/bills.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock API client before importing store
vi.mock('$lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { bills, loadBills, createBill, billsStore } from './bills';
import { apiClient } from '$lib/api/client';

describe('Bills Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    billsStore.set({ bills: [], loading: false, error: null });
  });

  describe('loadBills', () => {
    it('fetches bills from API and updates store', async () => {
      const mockBills = [{ id: '1', name: 'Test Bill', amount: 100 }];
      vi.mocked(apiClient.get).mockResolvedValue(mockBills);

      await loadBills();

      expect(apiClient.get).toHaveBeenCalledWith('/api/bills');
      expect(get(bills)).toEqual(mockBills);
    });

    it('sets error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(loadBills()).rejects.toThrow('Network error');
    });
  });
});
```

## Writing a Component Test

```typescript
// src/components/shared/Toast.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Toast from './Toast.svelte';

describe('Toast Component', () => {
  it('renders message correctly', () => {
    render(Toast, {
      props: {
        id: 'test-1',
        message: 'Hello World',
        type: 'success',
      },
    });

    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('calls onClose when dismiss button clicked', async () => {
    const onClose = vi.fn();
    render(Toast, {
      props: {
        id: 'test-1',
        message: 'Test',
        type: 'info',
        onClose,
      },
    });

    await fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledWith('test-1');
  });
});
```

## Release Process

### 1. Prepare Release

```bash
# Ensure you're on main with latest changes
git checkout main
git pull origin main

# Verify all tests pass
make test
```

### 2. Update Versions

Edit these files to update version (e.g., 0.1.0 → 0.2.0):

- `package.json` → `.version`
- `src-tauri/tauri.conf.json` → `.version`
- `src-tauri/Cargo.toml` → `[package] version`

### 3. Update Changelog

Add entry to `CHANGELOG.md`:

```markdown
## [0.2.0] - 2026-01-15

### Added

- Feature X
- Feature Y

### Fixed

- Bug Z
```

### 4. Commit and Tag

```bash
git add -A
git commit -m "chore: bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

### 5. Monitor Release

- Go to GitHub Actions → Release workflow
- Wait for build to complete (~10 minutes)
- Check GitHub Releases for DMG attachment
- Download and test the DMG locally

## Coverage Thresholds

Target thresholds (vitest.config.ts):

```typescript
thresholds: {
  lines: 80,
  functions: 80,
  branches: 70,
  statements: 80,
}
```

Current thresholds (to be updated after tests are written):

```typescript
thresholds: {
  lines: 5,      // → 80
  functions: 5,  // → 80
  branches: 2,   // → 70
  statements: 5, // → 80
}
```

## CI/CD Workflow Files

After implementation, workflows will be at:

- `.github/workflows/pr-validation.yml` - Runs on PRs to main
- `.github/workflows/release.yml` - Runs on version tags

## Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Regenerate SvelteKit files
bun run check
```

### Coverage provider error with Bun

Use Node.js for coverage:

```bash
# Wrong (may fail)
bun run vitest run --coverage

# Correct
npx vitest run --coverage
```

### GitHub Actions build fails

1. Check the workflow logs in GitHub Actions
2. Verify versions match between package.json and tauri.conf.json
3. Ensure all dependencies are committed
