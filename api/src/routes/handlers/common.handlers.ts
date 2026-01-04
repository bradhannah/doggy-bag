export function createHealthHandler() {
  return async () => {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Bun backend working',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  };
}

export function createTestHandler() {
  return async () => {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Bun backend hot reload working',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  };
}

export function createHotReloadHandler() {
  return async () => {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message:
          'Hot reload triggered - this is for testing only, in dev mode Tauri will auto-reload via Vite HMR',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  };
}
