import { createLogger } from '../logger';

const log = createLogger('API Client');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Dynamic port storage - set by Tauri sidecar-ready event
let apiPort: number | null = null;

// Check if running in Tauri
const isTauriEnv = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Set the API port (called when sidecar-ready event is received)
 */
export function setApiPort(port: number) {
  apiPort = port;
  log.info(`Port set to ${port}`);
}

/**
 * Get the current API port (null if not yet set)
 */
export function getApiPort(): number | null {
  return apiPort;
}

/**
 * Check if the API client is ready (has a port configured)
 */
export function isApiReady(): boolean {
  // In Tauri, we need the port to be set
  if (isTauriEnv()) {
    return apiPort !== null;
  }
  // In browser dev mode, we use Vite proxy so we're always ready
  return true;
}

export const getBaseUrl = () => {
  // In Tauri (dev or prod), use the dynamic port from sidecar
  if (isTauriEnv() && apiPort !== null) {
    return `http://localhost:${apiPort}`;
  }

  // In browser dev mode (not Tauri), use Vite proxy
  if (import.meta.env.DEV && !isTauriEnv()) {
    return ''; // Use relative URL (proxied by Vite to port 3000)
  }

  // Fallback for edge cases
  if (apiPort !== null) {
    return `http://localhost:${apiPort}`;
  }

  log.warn('Port not set, using fallback');
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

// Helper to build full API URL
export const apiUrl = (path: string) => `${getBaseUrl()}${path}`;

export const apiClient = {
  // Expose getBaseUrl for components that need to construct their own URLs
  getBaseUrl,

  async get(path: string) {
    const response = await fetch(apiUrl(path));
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.error || error.message || `GET ${path} failed: ${response.statusText}`;
      throw new ApiError(message, response.status);
    }
    return response.json();
  },

  async post(path: string, body: unknown) {
    const response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.error || error.message || `POST ${path} failed: ${response.statusText}`;
      const details = Array.isArray(error.details) ? `: ${error.details.join(', ')}` : '';
      throw new ApiError(message + details, response.status);
    }
    return response.json();
  },

  async put(path: string, id: string, body: unknown) {
    const response = await fetch(apiUrl(`${path}/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message =
        error.error || error.message || `PUT ${path}/${id} failed: ${response.statusText}`;
      const details = Array.isArray(error.details) ? `: ${error.details.join(', ')}` : '';
      throw new ApiError(message + details, response.status);
    }
    return response.json();
  },

  // Generic PUT for paths that don't follow the /{id} pattern
  async putPath(path: string, body: unknown) {
    const response = await fetch(apiUrl(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.error || error.message || `PUT ${path} failed: ${response.statusText}`;
      throw new ApiError(message, response.status);
    }
    return response.json();
  },

  async delete(path: string, id: string) {
    const response = await fetch(apiUrl(`${path}/${id}`), {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      throw new ApiError(`DELETE ${path}/${id} failed: ${response.statusText}`, response.status);
    }
    return null;
  },

  // Generic DELETE for paths that don't follow the /{id} pattern
  async deletePath(path: string) {
    const response = await fetch(apiUrl(path), {
      method: 'DELETE',
    });
    if (!response.ok && response.status !== 204) {
      const errorBody = await response.text();
      let errorMsg = `DELETE ${path} failed: ${response.statusText}`;
      try {
        const error = JSON.parse(errorBody);
        errorMsg = error.message || error.error || errorMsg;
      } catch {
        // Use raw error body if not JSON
      }
      throw new ApiError(errorMsg, response.status);
    }
    return null;
  },
};
