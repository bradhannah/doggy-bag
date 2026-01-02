// Bun HTTP Server for BudgetForFun
// Handles backend API for IPC communication with Tauri frontend
// Runs on localhost:3000
// Uses simple routing with Bun serve

import { serve } from 'bun';
import { routes } from './src/routes';
import { StorageServiceImpl } from './src/services/storage';

// Initialize storage service with DATA_DIR from environment or default
// In production, Tauri passes DATA_DIR when spawning the sidecar
// In development, it defaults to './data' (project-relative)
StorageServiceImpl.initialize();

// Logging utility with timestamps
function log(level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', message: string, ...args: unknown[]) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, message, ...args);
  } else if (level === 'WARN') {
    console.warn(prefix, message, ...args);
  } else {
    console.log(prefix, message, ...args);
  }
}

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
      let case2Match = true;
      for (let i = 0; i < routeSegments.length - 1; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          case2Match = false;
          break;
        }
      }
      if (case2Match) return true;
    }
    
    // Case 3: adhoc pattern - month at pos 2, last two segments match
    //   Route: [api, months, adhoc, bills] (4 segments)
    //   Request: [api, months, 2025-01, adhoc, bills] (5 segments)
    //   Match: route[0,1] == req[0,1], route[2,3] == req[3,4]
    if (routeSegments.length >= 4 && routeSegments[2] === 'adhoc') {
      if (routeSegments[0] === requestSegments[0] &&    // api
          routeSegments[1] === requestSegments[1] &&    // months
          routeSegments[2] === requestSegments[3] &&    // adhoc
          routeSegments[3] === requestSegments[4]) {    // bills|incomes
        return true;
      }
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
    // Case 3: month after position 1, ID before last segment (adhoc pattern)
    //   e.g., /api/months/adhoc/bills/make-regular -> /api/months/2025-01/adhoc/bills/UUID/make-regular
    //   Route: [api, months, adhoc, bills, make-regular]
    //   Request: [api, months, 2025-01, adhoc, bills, UUID, make-regular]
    
    // Try Case 1 first: route's last segment matches request's second-to-last
    const lastRouteSegment = routeSegments[routeSegments.length - 1];
    const secondToLastRequestSegment = requestSegments[requestSegments.length - 2];
    
    if (lastRouteSegment === secondToLastRequestSegment) {
      // Check prefix matches (all segments before the last route segment)
      let case1Match = true;
      for (let i = 0; i < routeSegments.length - 1; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          case1Match = false;
          break;
        }
      }
      if (case1Match) return true;
    }
    
    // Try Case 2: route's last segment matches request's last, and second-to-last matches
    const lastRequestSegment = requestSegments[requestSegments.length - 1];
    const secondToLastRouteSegment = routeSegments[routeSegments.length - 2];
    const thirdToLastRequestSegment = requestSegments[requestSegments.length - 3];
    
    if (lastRouteSegment === lastRequestSegment && secondToLastRouteSegment === thirdToLastRequestSegment) {
      // Check prefix matches (all segments before the second-to-last route segment)
      let case2Match = true;
      for (let i = 0; i < routeSegments.length - 2; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          case2Match = false;
          break;
        }
      }
      if (case2Match) return true;
    }
    
    // Try Case 3: adhoc pattern - month at pos 2, id before last segment
    //   Route: [api, months, adhoc, bills, make-regular] (5 segments)
    //   Request: [api, months, 2025-01, adhoc, bills, UUID, make-regular] (7 segments)
    //   Match: route[0,1] == req[0,1], route[2,3] == req[3,4], route[4] == req[6]
    if (routeSegments.length >= 5 && routeSegments[2] === 'adhoc') {
      // Verify structure: api/months match, adhoc/bills|incomes match, action matches
      if (routeSegments[0] === requestSegments[0] &&    // api
          routeSegments[1] === requestSegments[1] &&    // months
          routeSegments[2] === requestSegments[3] &&    // adhoc
          routeSegments[3] === requestSegments[4] &&    // bills|incomes
          lastRouteSegment === lastRequestSegment) {    // make-regular
        return true;
      }
    }
    
    // Try Case 4: adhoc pattern with ID at end (for PUT/DELETE)
    //   Route: [api, months, adhoc, bills] (4 segments)
    //   Request: [api, months, 2025-01, adhoc, bills, UUID] (6 segments)
    //   Match: route[0,1] == req[0,1], route[2,3] == req[3,4]
    if (routeSegments.length === 4 && routeSegments[2] === 'adhoc') {
      if (routeSegments[0] === requestSegments[0] &&    // api
          routeSegments[1] === requestSegments[1] &&    // months
          routeSegments[2] === requestSegments[3] &&    // adhoc
          routeSegments[3] === requestSegments[4]) {    // bills|incomes
        return true;
      }
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
        let patternAMatch = true;
        for (let i = 0; i < 2; i++) {
          if (routeSegments[i] !== requestSegments[i]) {
            patternAMatch = false;
            break;
          }
        }
        if (patternAMatch) return true;
      }
    }
    
    // Pattern B: route's last matches request's last, and route's second-to-last matches request's third-to-last
    const thirdToLastRequestSegment = requestSegments[requestSegments.length - 3];
    if (lastRouteSegment === lastRequestSegment && secondToLastRouteSegment === thirdToLastRequestSegment) {
      // Check prefix matches (all segments before the second-to-last route segment)
      let patternBMatch = true;
      for (let i = 0; i < routeSegments.length - 2; i++) {
        if (routeSegments[i] !== requestSegments[i]) {
          patternBMatch = false;
          break;
        }
      }
      if (patternBMatch) return true;
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

    log('INFO', `${req.method} ${path}`);

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
          log('DEBUG', `Matched route: ${routePath} [${definition.method}]`);
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          log('ERROR', `Handler error: ${errorMessage}`);
          if (errorStack) {
            log('ERROR', `Stack trace:\n${errorStack}`);
          }
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

// Log startup info
const storageConfig = StorageServiceImpl.getConfig();
log('INFO', `Bun backend server running on http://localhost:${PORT}`);
log('INFO', `Health check: http://localhost:${PORT}/health`);
log('INFO', `Registered ${routes.length} routes`);
log('INFO', `Data directory: ${storageConfig.basePath}`);
log('INFO', `Mode: ${storageConfig.isDevelopment ? 'development' : 'production'}`);
