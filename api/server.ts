// Bun HTTP Server for BudgetForFun
// Handles backend API for IPC communication with Tauri frontend
// Runs on localhost:3000
// Uses simple routing with Bun serve

import { serve } from 'bun';
import { routes } from './src/routes';

const PORT = 3000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const corsResponse = (body: string | object, status = 200) => {
  return new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
};

// Route matching function - handles patterns with path params
// Supports patterns like:
//   /api/months -> matches /api/months/2025-01
//   /api/months/summary -> matches /api/months/2025-01/summary  
//   /api/months/expenses -> matches /api/months/2025-01/expenses, /api/months/2025-01/expenses/UUID
function matchRoute(requestPath: string, routePath: string, hasPathParam: boolean): boolean {
  if (!hasPathParam) {
    return requestPath === routePath;
  }
  
  // Split paths into segments
  const requestSegments = requestPath.split('/').filter(Boolean);
  const routeSegments = routePath.split('/').filter(Boolean);
  
  // Request must have at least as many segments as the route (can have more for path params)
  if (requestSegments.length < routeSegments.length) {
    return false;
  }
  
  // For routes ending in a resource type (like /expenses), we allow:
  // - Exact match with path param: /api/months/2025-01/expenses
  // - Match with additional ID param: /api/months/2025-01/expenses/UUID
  
  // Build expected pattern: for each route segment, check if it matches
  // Allow one "wildcard" position for path params
  
  // Strategy: Match static segments, skip one dynamic segment per gap in length
  const extraSegments = requestSegments.length - routeSegments.length;
  
  if (extraSegments === 0) {
    // Exact length match - all segments must match exactly
    for (let i = 0; i < routeSegments.length; i++) {
      if (routeSegments[i] !== requestSegments[i]) {
        return false;
      }
    }
    return true;
  }
  
  if (extraSegments === 1) {
    // One extra segment - can be at the end OR in the middle
    // Case 1: Extra at end (e.g., /api/months -> /api/months/2025-01)
    let allPrefixMatch = true;
    for (let i = 0; i < routeSegments.length; i++) {
      if (routeSegments[i] !== requestSegments[i]) {
        allPrefixMatch = false;
        break;
      }
    }
    if (allPrefixMatch) return true;
    
    // Case 2: Extra in middle (e.g., /api/months/summary -> /api/months/2025-01/summary)
    const lastRouteSegment = routeSegments[routeSegments.length - 1];
    const lastRequestSegment = requestSegments[requestSegments.length - 1];
    if (lastRouteSegment === lastRequestSegment) {
      for (let i = 0; i < routeSegments.length - 1; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          return false;
        }
      }
      return true;
    }
  }
  
  if (extraSegments === 2) {
    // Two extra segments - can be:
    // Case 1: month in middle, ID at end
    //   e.g., /api/months/expenses -> /api/months/2025-01/expenses/UUID
    //   Route: [api, months, expenses]
    //   Request: [api, months, 2025-01, expenses, UUID]
    // Case 2: month in middle, ID before last segment
    //   e.g., /api/months/bills/reset -> /api/months/2025-01/bills/UUID/reset
    //   Route: [api, months, bills, reset]
    //   Request: [api, months, 2025-01, bills, UUID, reset]
    
    // Try Case 1 first: route's last segment matches request's second-to-last
    const lastRouteSegment = routeSegments[routeSegments.length - 1];
    const secondToLastRequestSegment = requestSegments[requestSegments.length - 2];
    
    if (lastRouteSegment === secondToLastRequestSegment) {
      // Check prefix matches (all segments before the last route segment)
      for (let i = 0; i < routeSegments.length - 1; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          return false;
        }
      }
      return true;
    }
    
    // Try Case 2: route's last segment matches request's last, and second-to-last matches
    const lastRequestSegment = requestSegments[requestSegments.length - 1];
    const secondToLastRouteSegment = routeSegments[routeSegments.length - 2];
    const thirdToLastRequestSegment = requestSegments[requestSegments.length - 3];
    
    if (lastRouteSegment === lastRequestSegment && secondToLastRouteSegment === thirdToLastRequestSegment) {
      // Check prefix matches (all segments before the second-to-last route segment)
      for (let i = 0; i < routeSegments.length - 2; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          return false;
        }
      }
      return true;
    }
  }
  
  if (extraSegments === 3) {
    // Three extra segments - multiple patterns:
    // Pattern A: month + billId + paymentId
    //   e.g., /api/months/bills/payments -> /api/months/2025-01/bills/UUID/payments/PAYMENT-UUID
    //   Route: [api, months, bills, payments]
    //   Request: [api, months, 2025-01, bills, UUID, payments, PAYMENT-UUID]
    //   Match when route's last segment matches request's second-to-last
    // Pattern B: month + id + action
    //   e.g., /api/months/bills/reset -> /api/months/2025-01/bills/UUID/reset
    //   Route: [api, months, bills, reset]
    //   Request: [api, months, 2025-01, bills, UUID, reset]
    //   Match when route's last segment matches request's last segment
    
    const lastRouteSegment = routeSegments[routeSegments.length - 1];
    const lastRequestSegment = requestSegments[requestSegments.length - 1];
    const secondToLastRequestSegment = requestSegments[requestSegments.length - 2];
    const secondToLastRouteSegment = routeSegments[routeSegments.length - 2];
    
    // Pattern A: route's last matches request's second-to-last (paymentId at end)
    if (lastRouteSegment === secondToLastRequestSegment) {
      // Check: route[2] should match request[3] (bills/incomes)
      const thirdRouteSegment = routeSegments[2];
      const fourthRequestSegment = requestSegments[3];
      if (thirdRouteSegment === fourthRequestSegment) {
        // Check prefix matches
        for (let i = 0; i < 2; i++) {
          if (routeSegments[i] !== requestSegments[i]) {
            return false;
          }
        }
        return true;
      }
    }
    
    // Pattern B: route's last matches request's last, and route's second-to-last matches request's third-to-last
    const thirdToLastRequestSegment = requestSegments[requestSegments.length - 3];
    if (lastRouteSegment === lastRequestSegment && secondToLastRouteSegment === thirdToLastRequestSegment) {
      // Check prefix matches (all segments before the second-to-last route segment)
      for (let i = 0; i < routeSegments.length - 2; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          return false;
        }
      }
      return true;
    }
  }
  
  return false;
}

// Start server
const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    console.log(`Request: ${req.method} ${path}`);

    // Handle OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Find matching route - sort by specificity (longer paths first)
    const sortedRoutes = [...routes].sort((a, b) => b.path.length - a.path.length);
    
    for (const route of sortedRoutes) {
      const { path: routePath, definition } = route;
      
      const pathMatches = matchRoute(path, routePath, definition.hasPathParam || false);
      
      if (pathMatches && req.method === definition.method) {
        try {
          console.log(` -> Matched route: ${routePath} [${definition.method}]`);
          const response = await definition.handler(req);

          // Add CORS headers to existing Response
          const headers = new Headers(response.headers);
          Object.entries(CORS_HEADERS).forEach(([key, value]) => {
            headers.set(key, value);
          });

          return new Response(response.body, {
            status: response.status,
            headers,
          });
        } catch (error) {
          console.error('Server error:', error);
          return corsResponse(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            error instanceof Error && 'status' in error
              ? (error as any).status
              : 500
          );
        }
      }
    }
    
    // 404 for unknown routes
    return corsResponse({ error: 'Not Found' }, 404);
  }
});

console.log(`Bun backend server running on http://localhost:${PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`API endpoints:`, routes.map(r => `${r.definition.method} ${r.path}`));
