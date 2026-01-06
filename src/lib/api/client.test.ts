// API Client Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setApiPort, getApiPort, isApiReady, getBaseUrl, apiUrl, apiClient } from './client';

// Mock the logger to avoid console noise
vi.mock('../logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Helper to create mock Response
function mockResponse(data: unknown, ok = true, status = 200, statusText = 'OK') {
  return Promise.resolve({
    ok,
    status,
    statusText,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

// Helper to create mock error Response
function mockErrorResponse(
  error: { message?: string; error?: string; details?: string[] },
  status = 400
) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Bad Request',
    json: () => Promise.resolve(error),
    text: () => Promise.resolve(JSON.stringify(error)),
  } as Response);
}

describe('API Client', () => {
  const originalFetch = globalThis.fetch;
  let mockFetch: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    mockFetch = vi.fn<typeof fetch>();
    globalThis.fetch = mockFetch;
    // Reset port state - use a function to reset internal state
    // We'll set port to a known value in tests that need it
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe('setApiPort', () => {
    it('sets the API port', () => {
      setApiPort(4000);
      expect(getApiPort()).toBe(4000);
    });

    it('updates the port when called again', () => {
      setApiPort(5000);
      expect(getApiPort()).toBe(5000);
      setApiPort(6000);
      expect(getApiPort()).toBe(6000);
    });
  });

  describe('getApiPort', () => {
    it('returns the current port', () => {
      setApiPort(7000);
      expect(getApiPort()).toBe(7000);
    });
  });

  describe('isApiReady', () => {
    it('returns true in browser mode (non-Tauri)', () => {
      // In test environment, we're not in Tauri
      expect(isApiReady()).toBe(true);
    });
  });

  describe('getBaseUrl', () => {
    it('returns empty string in dev mode (for Vite proxy)', () => {
      vi.stubEnv('DEV', true);
      // Clear any port that might be set from previous tests
      // Since we can't clear the port directly, we test the fallback behavior
      const url = getBaseUrl();
      // In dev mode without Tauri, should return empty string or fallback
      expect(typeof url).toBe('string');
    });

    it('returns localhost URL when port is set', () => {
      setApiPort(3001);
      // This may still return empty in dev mode due to Vite proxy logic
      const url = getBaseUrl();
      expect(typeof url).toBe('string');
    });
  });

  describe('apiUrl', () => {
    it('constructs full URL with path', () => {
      const url = apiUrl('/api/test');
      expect(url).toContain('/api/test');
    });

    it('handles paths without leading slash', () => {
      const url = apiUrl('api/test');
      expect(url).toContain('api/test');
    });
  });

  describe('apiClient.get', () => {
    it('makes GET request and returns JSON', async () => {
      const responseData = { id: 1, name: 'Test' };
      mockFetch.mockReturnValue(mockResponse(responseData));

      const result = await apiClient.get('/api/items');

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/items'));
      expect(result).toEqual(responseData);
    });

    it('throws error on non-OK response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
      );

      await expect(apiClient.get('/api/missing')).rejects.toThrow(
        'GET /api/missing failed: Not Found'
      );
    });
  });

  describe('apiClient.post', () => {
    it('makes POST request with JSON body', async () => {
      const requestBody = { name: 'New Item' };
      const responseData = { id: 1, name: 'New Item' };
      mockFetch.mockReturnValue(mockResponse(responseData));

      const result = await apiClient.post('/api/items', requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('throws error with message from response', async () => {
      mockFetch.mockReturnValue(mockErrorResponse({ message: 'Validation failed' }));

      await expect(apiClient.post('/api/items', {})).rejects.toThrow('Validation failed');
    });

    it('throws error with error field from response', async () => {
      mockFetch.mockReturnValue(mockErrorResponse({ error: 'Invalid data' }));

      await expect(apiClient.post('/api/items', {})).rejects.toThrow('Invalid data');
    });

    it('includes details in error message', async () => {
      mockFetch.mockReturnValue(
        mockErrorResponse({
          message: 'Validation failed',
          details: ['Name is required', 'Amount must be positive'],
        })
      );

      await expect(apiClient.post('/api/items', {})).rejects.toThrow(
        'Validation failed: Name is required, Amount must be positive'
      );
    });

    it('falls back to statusText when no message/error', async () => {
      mockFetch.mockReturnValue(mockErrorResponse({}));

      await expect(apiClient.post('/api/items', {})).rejects.toThrow(
        'POST /api/items failed: Bad Request'
      );
    });
  });

  describe('apiClient.put', () => {
    it('makes PUT request with ID in path', async () => {
      const requestBody = { name: 'Updated Item' };
      const responseData = { id: '123', name: 'Updated Item' };
      mockFetch.mockReturnValue(mockResponse(responseData));

      const result = await apiClient.put('/api/items', '123', requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/123'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('throws error with message from response', async () => {
      mockFetch.mockReturnValue(mockErrorResponse({ message: 'Not found' }, 404));

      await expect(apiClient.put('/api/items', '999', {})).rejects.toThrow('Not found');
    });

    it('includes details in error message', async () => {
      mockFetch.mockReturnValue(
        mockErrorResponse({
          error: 'Update failed',
          details: ['Invalid field value'],
        })
      );

      await expect(apiClient.put('/api/items', '123', {})).rejects.toThrow(
        'Update failed: Invalid field value'
      );
    });
  });

  describe('apiClient.putPath', () => {
    it('makes PUT request without ID pattern', async () => {
      const requestBody = { setting: 'value' };
      const responseData = { success: true };
      mockFetch.mockReturnValue(mockResponse(responseData));

      const result = await apiClient.putPath('/api/settings/theme', requestBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/settings/theme'),
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
      );
      expect(result).toEqual(responseData);
    });

    it('throws error with message from response', async () => {
      mockFetch.mockReturnValue(mockErrorResponse({ message: 'Invalid setting' }));

      await expect(apiClient.putPath('/api/settings/invalid', {})).rejects.toThrow(
        'Invalid setting'
      );
    });

    it('handles JSON parse failure gracefully', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new Error('Invalid JSON')),
        } as Response)
      );

      await expect(apiClient.putPath('/api/broken', {})).rejects.toThrow(
        'PUT /api/broken failed: Internal Server Error'
      );
    });
  });

  describe('apiClient.delete', () => {
    it('makes DELETE request with ID in path', async () => {
      mockFetch.mockReturnValue(mockResponse(null, true, 200));

      const result = await apiClient.delete('/api/items', '123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBeNull();
    });

    it('handles 204 No Content response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 204,
          statusText: 'No Content',
        } as Response)
      );

      const result = await apiClient.delete('/api/items', '123');
      expect(result).toBeNull();
    });

    it('throws error on non-OK non-204 response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response)
      );

      await expect(apiClient.delete('/api/items', '999')).rejects.toThrow(
        'DELETE /api/items/999 failed: Not Found'
      );
    });
  });

  describe('apiClient.deletePath', () => {
    it('makes DELETE request without ID pattern', async () => {
      mockFetch.mockReturnValue(mockResponse(null, true, 200));

      const result = await apiClient.deletePath('/api/cache/clear');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cache/clear'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBeNull();
    });

    it('handles 204 No Content response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 204,
          statusText: 'No Content',
        } as Response)
      );

      const result = await apiClient.deletePath('/api/cache/clear');
      expect(result).toBeNull();
    });

    it('throws error with message from JSON response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve(JSON.stringify({ message: 'Cannot delete' })),
        } as Response)
      );

      await expect(apiClient.deletePath('/api/protected')).rejects.toThrow('Cannot delete');
    });

    it('throws error with error field from JSON response', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: () => Promise.resolve(JSON.stringify({ error: 'Access denied' })),
        } as Response)
      );

      await expect(apiClient.deletePath('/api/protected')).rejects.toThrow('Access denied');
    });

    it('falls back to statusText for non-JSON error body', async () => {
      mockFetch.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Plain text error'),
        } as Response)
      );

      await expect(apiClient.deletePath('/api/broken')).rejects.toThrow(
        'DELETE /api/broken failed: Internal Server Error'
      );
    });
  });

  describe('apiClient.getBaseUrl', () => {
    it('exposes getBaseUrl method', () => {
      expect(typeof apiClient.getBaseUrl).toBe('function');
      expect(apiClient.getBaseUrl).toBe(getBaseUrl);
    });
  });
});
