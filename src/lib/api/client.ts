const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return ''; // Use relative URL in dev (proxied by Vite)
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

export const apiClient = {
  async get(path: string) {
    const response = await fetch(`${getBaseUrl()}${path}`);
    if (!response.ok) {
      throw new Error(`GET ${path} failed: ${response.statusText}`);
    }
    return response.json();
  },

  async post(path: string, body: unknown) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json();
      const message = error.message || error.error || `POST ${path} failed: ${response.statusText}`;
      const details = error.details ? `: ${error.details.join(', ')}` : '';
      throw new Error(message + details);
    }
    return response.json();
  },

  async put(path: string, id: string, body: unknown) {
    const response = await fetch(`${getBaseUrl()}${path}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.json();
      const message = error.message || error.error || `PUT ${path}/${id} failed: ${response.statusText}`;
      const details = error.details ? `: ${error.details.join(', ')}` : '';
      throw new Error(message + details);
    }
    return response.json();
  },

  async delete(path: string, id: string) {
    const response = await fetch(`${getBaseUrl()}${path}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`DELETE ${path}/${id} failed: ${response.statusText}`);
    }
    return null;
  }
};
