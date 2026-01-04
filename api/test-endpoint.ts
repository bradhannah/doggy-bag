// Test endpoint for hot reload validation
export const testHandler = () => {
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
