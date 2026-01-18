#!/bin/bash
echo "=== HTTP Load Test ==="
echo ""

# Test 1: Empty route (no middleware, MinimalContext)
echo "1. Empty route (no middleware, MinimalContext)"
oha -n 100000 -c 100 http://localhost:3000/health | grep -E "Requests/sec|Latency"

# Test 2: Static route with FastContext
echo "2. Static route with FastContext"
oha -n 100000 -c 100 http://localhost:3000/api/status | grep -E "Requests/sec|Latency"

# Test 3: Dynamic route
echo "3. Dynamic route with params"
oha -n 100000 -c 100 http://localhost:3000/api/users/123 | grep -E "Requests/sec|Latency"

# Test 4: 3 middleware
echo "4. Route with 3 middleware"
oha -n 100000 -c 100 http://localhost:3000/api/protected/resource | grep -E "Requests/sec|Latency"

# Test 5: PhotonAdapter path
echo "5. PhotonAdapter path"
oha -n 100000 -c 100 http://localhost:3000/photon/users | grep -E "Requests/sec|Latency"
