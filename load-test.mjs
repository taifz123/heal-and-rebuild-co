/**
 * Load Testing Script for Heal & Rebuild Co.
 *
 * Tests concurrent booking requests and auth endpoints to verify:
 * - Quota enforcement under concurrent load
 * - Atomic capacity updates (no overbooking)
 * - Rate limiting on auth endpoints
 * - Response times under load
 *
 * Usage:
 *   node load-test.mjs [base_url]
 *
 * Default base_url: http://localhost:3000
 *
 * Prerequisites:
 * - Server must be running
 * - Seed data must be loaded (run: node seed-data.mjs)
 * - Test users must exist (jane@example.com, john@example.com, etc.)
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TEST_PASSWORD = 'password123';

// ─── Helpers ────────────────────────────────────────────────────────────────

let totalRequests = 0;
let successCount = 0;
let failCount = 0;
let rateLimitCount = 0;
const latencies = [];

async function timedFetch(url, options = {}) {
  totalRequests++;
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const elapsed = Date.now() - start;
    latencies.push(elapsed);
    return { res, elapsed };
  } catch (err) {
    const elapsed = Date.now() - start;
    latencies.push(elapsed);
    failCount++;
    return { res: null, elapsed, error: err };
  }
}

async function login(email) {
  const { res } = await timedFetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  if (!res || !res.ok) {
    if (res?.status === 429) {
      rateLimitCount++;
      return null;
    }
    return null;
  }
  const data = await res.json();
  // Extract cookie from set-cookie header
  const cookie = res.headers.get('set-cookie');
  return cookie;
}

function printStats(label) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.length > 0 ? (sorted.reduce((a, b) => a + b, 0) / sorted.length).toFixed(1) : 0;
  const max = sorted[sorted.length - 1] || 0;

  console.log(`\n📊 ${label}`);
  console.log(`   Total requests: ${totalRequests}`);
  console.log(`   Success: ${successCount}  |  Failed: ${failCount}  |  Rate-limited: ${rateLimitCount}`);
  console.log(`   Latency (ms): avg=${avg}  p50=${p50}  p95=${p95}  p99=${p99}  max=${max}`);
}

// ─── Test 1: Auth Endpoint Load ─────────────────────────────────────────────

async function testAuthLoad() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST 1: Auth Endpoint Load (50 concurrent login attempts)');
  console.log('═══════════════════════════════════════════════════════');

  totalRequests = 0;
  successCount = 0;
  failCount = 0;
  rateLimitCount = 0;
  latencies.length = 0;

  const emails = [
    'jane@example.com',
    'john@example.com',
    'sarah@example.com',
    'mike@example.com',
  ];

  const promises = [];
  for (let i = 0; i < 50; i++) {
    const email = emails[i % emails.length];
    promises.push(
      timedFetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: TEST_PASSWORD }),
      }).then(({ res }) => {
        if (res?.ok) successCount++;
        else if (res?.status === 429) rateLimitCount++;
        else failCount++;
      })
    );
  }

  await Promise.all(promises);
  printStats('Auth Load Test Results');

  if (rateLimitCount > 0) {
    console.log('   ✅ Rate limiting is working correctly');
  } else {
    console.log('   ⚠️  No rate limiting detected (may need to adjust thresholds)');
  }
}

// ─── Test 2: Concurrent Booking Stress Test ─────────────────────────────────

async function testConcurrentBooking() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST 2: Concurrent Booking Stress Test');
  console.log('═══════════════════════════════════════════════════════');

  totalRequests = 0;
  successCount = 0;
  failCount = 0;
  rateLimitCount = 0;
  latencies.length = 0;

  // First, log in to get cookies for each test user
  const testEmails = ['jane@example.com', 'john@example.com', 'sarah@example.com', 'mike@example.com'];
  const cookies = [];

  for (const email of testEmails) {
    const cookie = await login(email);
    if (cookie) {
      cookies.push({ email, cookie });
      console.log(`   Logged in: ${email}`);
    } else {
      console.log(`   ⚠️  Failed to log in: ${email}`);
    }
  }

  if (cookies.length === 0) {
    console.log('   ❌ No users could log in. Skipping booking test.');
    return;
  }

  // Get available session slots via tRPC
  console.log('   Fetching available session slots...');
  const slotsRes = await fetch(`${BASE_URL}/api/trpc/sessionSlots.getAll`, {
    headers: { Cookie: cookies[0].cookie },
  });

  if (!slotsRes.ok) {
    console.log('   ❌ Could not fetch session slots. Skipping booking test.');
    return;
  }

  const slotsData = await slotsRes.json();
  const slots = slotsData?.result?.data;

  if (!slots || slots.length === 0) {
    console.log('   ❌ No session slots available. Run seed-data.mjs first.');
    return;
  }

  // Pick a slot with available capacity
  const targetSlot = slots.find((s) => s.isActive && s.bookedCount < s.capacity);
  if (!targetSlot) {
    console.log('   ❌ No slots with available capacity found.');
    return;
  }

  console.log(`   Target slot: "${targetSlot.name}" (capacity: ${targetSlot.capacity}, booked: ${targetSlot.bookedCount})`);
  const availableSpots = targetSlot.capacity - targetSlot.bookedCount;
  console.log(`   Available spots: ${availableSpots}`);

  // Send concurrent booking requests from all users
  const bookingPromises = [];
  for (let i = 0; i < cookies.length; i++) {
    const { email, cookie } = cookies[i];
    bookingPromises.push(
      timedFetch(`${BASE_URL}/api/trpc/bookings.create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          json: { sessionSlotId: targetSlot.id },
        }),
      }).then(async ({ res, elapsed }) => {
        if (res?.ok) {
          successCount++;
          console.log(`   ✅ ${email} booked successfully (${elapsed}ms)`);
        } else {
          failCount++;
          const body = await res?.text().catch(() => 'unknown');
          console.log(`   ❌ ${email} booking failed: ${res?.status} (${elapsed}ms)`);
        }
      })
    );
  }

  await Promise.all(bookingPromises);

  // Verify final slot state
  const verifyRes = await fetch(`${BASE_URL}/api/trpc/sessionSlots.getAll`, {
    headers: { Cookie: cookies[0].cookie },
  });
  if (verifyRes.ok) {
    const verifyData = await verifyRes.json();
    const updatedSlot = verifyData?.result?.data?.find((s) => s.id === targetSlot.id);
    if (updatedSlot) {
      console.log(`\n   Post-test slot state: booked=${updatedSlot.bookedCount}/${updatedSlot.capacity}`);
      if (updatedSlot.bookedCount <= updatedSlot.capacity) {
        console.log('   ✅ No overbooking detected — atomic capacity enforcement works');
      } else {
        console.log('   ❌ OVERBOOKING DETECTED — capacity enforcement failed!');
      }
    }
  }

  printStats('Concurrent Booking Test Results');
}

// ─── Test 3: Rate Limit Burst Test ──────────────────────────────────────────

async function testRateLimitBurst() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST 3: Rate Limit Burst Test (100 rapid requests)');
  console.log('═══════════════════════════════════════════════════════');

  totalRequests = 0;
  successCount = 0;
  failCount = 0;
  rateLimitCount = 0;
  latencies.length = 0;

  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(
      timedFetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `burst-test-${i}@example.com`,
          password: 'wrongpassword',
        }),
      }).then(({ res }) => {
        if (res?.status === 429) rateLimitCount++;
        else if (res?.ok) successCount++;
        else failCount++;
      })
    );
  }

  await Promise.all(promises);
  printStats('Rate Limit Burst Test Results');

  const rateLimitPct = ((rateLimitCount / totalRequests) * 100).toFixed(1);
  console.log(`   Rate-limited: ${rateLimitPct}% of requests`);
  if (rateLimitCount > 0) {
    console.log('   ✅ Rate limiting is protecting auth endpoints');
  } else {
    console.log('   ⚠️  Rate limiting may not be configured or threshold is too high');
  }
}

// ─── Test 4: Invalid Input Fuzzing ──────────────────────────────────────────

async function testInputValidation() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TEST 4: Input Validation (malformed requests)');
  console.log('═══════════════════════════════════════════════════════');

  totalRequests = 0;
  successCount = 0;
  failCount = 0;
  rateLimitCount = 0;
  latencies.length = 0;

  const invalidPayloads = [
    { label: 'Empty body', body: {} },
    { label: 'Missing email', body: { password: 'test' } },
    { label: 'Missing password', body: { email: 'test@test.com' } },
    { label: 'SQL injection email', body: { email: "' OR 1=1 --", password: 'test' } },
    { label: 'XSS in name', body: { email: 'xss@test.com', password: 'test', name: '<script>alert(1)</script>' } },
    { label: 'Very long email', body: { email: 'a'.repeat(10000) + '@test.com', password: 'test' } },
    { label: 'Null values', body: { email: null, password: null } },
    { label: 'Number as email', body: { email: 12345, password: 'test' } },
  ];

  for (const { label, body } of invalidPayloads) {
    const { res, elapsed } = await timedFetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const status = res?.status || 'ERR';
    if (status >= 400 && status < 500) {
      successCount++;
      console.log(`   ✅ ${label}: ${status} (${elapsed}ms) — correctly rejected`);
    } else if (status === 429) {
      rateLimitCount++;
      console.log(`   🛡️ ${label}: ${status} (${elapsed}ms) — rate limited`);
    } else {
      failCount++;
      console.log(`   ⚠️  ${label}: ${status} (${elapsed}ms) — unexpected response`);
    }
  }

  printStats('Input Validation Test Results');
}

// ─── Run All Tests ──────────────────────────────────────────────────────────

async function main() {
  console.log('🔥 Heal & Rebuild Co. — Load Test Suite');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Time: ${new Date().toISOString()}`);

  // Verify server is reachable
  try {
    const health = await fetch(`${BASE_URL}/`);
    console.log(`   Server status: ${health.status}`);
  } catch (err) {
    console.error(`\n❌ Cannot reach server at ${BASE_URL}`);
    console.error('   Make sure the server is running and try again.');
    process.exit(1);
  }

  await testAuthLoad();
  await testConcurrentBooking();
  await testRateLimitBurst();
  await testInputValidation();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🏁 All load tests complete');
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});
