#!/bin/bash
set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUN_PORT=3000
VITE_PORT=1420

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Process tracking
PIDS=()
FAILED=0

# Logging functions
log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${GREEN}  $1${NC}\n"; }

# Start process with PID tracking
start_process() {
  local name="$1"
  local cmd="$2"
  local dir="$3"
  
  log_step "Starting $name..."
  cd "$PROJECT_ROOT/$dir" || exit 1
  
  $cmd > "$SCRIPT_DIR/logs/${name}.log" 2>&1 &
  local pid=$!
  PIDS+=("$pid")
  
  log_info "$name started with PID $pid"
  echo $pid > "$SCRIPT_DIR/pids/${name}.pid"
}

# Quick health check
check_service() {
  local name="$1"
  local url="$2"
  local max_attempts=5
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    log_info "Checking $name at $url... (attempt $attempt/$max_attempts)"
    if curl -f -s --max-time 3 "$url" > /dev/null 2>&1; then
      log_info "$name is responding"
      return 0
    fi
    
    if [ $attempt -lt $max_attempts ]; then
      sleep 2
    fi
    
    ((attempt++))
  done
  
  log_error "$name failed to respond after $((max_attempts * 2)) seconds"
  FAILED=1
  return 1
}

# Test integration
test_integration() {
  log_step "Testing service integration..."
  
  log_info "Testing backend health..."
  local response=$(curl -s http://localhost:$BUN_PORT/health 2>/dev/null || echo "failed")
  
  if [ "$response" = "failed" ]; then
    log_error "Backend health check failed"
    FAILED=1
    return 1
  fi
  
  log_info "Integration test passed"
  return 0
}

# Cleanup
cleanup() {
  log_step "Cleaning up processes..."
  
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      log_info "Terminating PID $pid"
      kill "$pid" 2>/dev/null || true
      
      local count=0
      while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
        sleep 1
        ((count++))
      done
      
      if kill -0 "$pid" 2>/dev/null; then
        log_warn "Force killing PID $pid"
        kill -9 "$pid" 2>/dev/null || true
      fi
    fi
  done
  
  rm -rf "$SCRIPT_DIR/pids"
  
  if [ $FAILED -eq 0 ]; then
    rm -rf "$SCRIPT_DIR/logs"
  else
    log_error "Logs preserved in $SCRIPT_DIR/logs/"
  fi
}

# Main
main() {
  log_step "Starting Smoke Test"
  
  mkdir -p "$SCRIPT_DIR/logs"
  mkdir -p "$SCRIPT_DIR/pids"
  
  trap cleanup EXIT INT TERM
  
  start_process "Bun backend" "bun run server.ts" "api"
  sleep 5
  
  start_process "Vite dev server" "npm run dev" "."
  sleep 5
  
  check_service "Bun backend" "http://localhost:$BUN_PORT/health"
  check_service "Vite dev server" "http://localhost:$VITE_PORT"
  
  if [ $FAILED -eq 0 ]; then
    test_integration
  fi
  
  log_step "Smoke Test Complete"
  
  if [ $FAILED -eq 0 ]; then
    log_info "All checks passed!"
    exit 0
  else
    log_error "Smoke test failed!"
    exit 1
  fi
}

main "$@"
