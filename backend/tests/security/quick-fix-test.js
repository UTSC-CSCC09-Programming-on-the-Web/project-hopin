#!/usr/bin/env node
/**
 * Quick Security Fix Validation Script
 * Tests the specific issues that were failing
 */

import fetch from "node-fetch";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8080";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, { ...options, timeout: 10000 });
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

async function testUnauthorizedAccess() {
  log("\n=== Testing Unauthorized Access Protection ===", "bold");

  const protectedEndpoints = [
    { path: "/api/auth/me", method: "GET" },
    { path: "/api/users", method: "GET" },
    { path: "/api/subscriptions/checkout-subscription", method: "POST" },
    { path: "/api/auth/signout", method: "POST" },
  ];

  let allBlocked = true;
  for (const endpoint of protectedEndpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: { "Content-Type": "application/json" },
    });

    const isBlocked = response.status === 401 || response.status === 403;
    log(
      `${endpoint.method} ${endpoint.path}: ${response.status} ${isBlocked ? "✅" : "❌"}`,
      isBlocked ? "green" : "red",
    );

    if (!isBlocked) {
      allBlocked = false;
    }
  }

  log(
    `\nUnauthorized Access Protection: ${allBlocked ? "PASS ✅" : "FAIL ❌"}`,
    allBlocked ? "green" : "red",
  );

  return allBlocked;
}

async function testUserCreation() {
  log("\n=== Testing User Creation ===", "bold");

  const user = {
    email: `test-${Date.now()}@security.com`,
    password: "SecurePass123!",
    name: "Test User",
  };

  const signupResponse = await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  const signupSuccess = signupResponse.status === 201;
  log(
    `User Signup: ${signupResponse.status} ${signupSuccess ? "✅" : "❌"}`,
    signupSuccess ? "green" : "red",
  );

  if (!signupSuccess) {
    log(`Error: ${JSON.stringify(signupResponse.data)}`, "red");
    return false;
  }

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  const loginSuccess =
    loginResponse.status === 200 && loginResponse.data?.accessToken;
  log(
    `User Login: ${loginResponse.status} ${loginSuccess ? "✅" : "❌"}`,
    loginSuccess ? "green" : "red",
  );

  if (!loginSuccess) {
    log(`Error: ${JSON.stringify(loginResponse.data)}`, "red");
  }

  return loginSuccess;
}

async function testSessionFixation() {
  log("\n=== Testing Session Fixation Protection ===", "bold");

  const user = {
    email: `session-${Date.now()}@security.com`,
    password: "SecurePass123!",
    name: "Session Test User",
  };

  // Create user
  const signupResponse = await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });

  if (signupResponse.status !== 201) {
    log("Failed to create test user for session fixation test", "red");
    return false;
  }

  // Login twice
  const login1 = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
    }),
  });

  await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay

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
    log("Failed to get tokens", "red");
    return false;
  }

  const differentTokens = token1 !== token2;
  log(`First token: ${token1.substring(0, 20)}...`, "blue");
  log(`Second token: ${token2.substring(0, 20)}...`, "blue");
  log(
    `Tokens are different: ${differentTokens ? "✅" : "❌"}`,
    differentTokens ? "green" : "red",
  );

  return differentTokens;
}

async function runQuickTests() {
  log("🔧 QUICK SECURITY FIX VALIDATION", "bold");
  log("================================", "cyan");
  log(`Testing against: ${BASE_URL}`, "blue");

  let results = {
    unauthorizedAccess: false,
    userCreation: false,
    sessionFixation: false,
  };

  try {
    results.unauthorizedAccess = await testUnauthorizedAccess();
    results.userCreation = await testUserCreation();
    results.sessionFixation = await testSessionFixation();

    log("\n📊 QUICK TEST SUMMARY", "bold");
    log("====================", "cyan");

    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;

    log(
      `Unauthorized Access Protection: ${results.unauthorizedAccess ? "PASS ✅" : "FAIL ❌"}`,
      results.unauthorizedAccess ? "green" : "red",
    );
    log(
      `User Creation/Login: ${results.userCreation ? "PASS ✅" : "FAIL ❌"}`,
      results.userCreation ? "green" : "red",
    );
    log(
      `Session Fixation Protection: ${results.sessionFixation ? "PASS ✅" : "FAIL ❌"}`,
      results.sessionFixation ? "green" : "red",
    );

    log(
      `\nOverall: ${passed}/${total} tests passing`,
      passed === total ? "green" : "yellow",
    );

    if (passed === total) {
      log("🎉 All critical security issues appear to be fixed!", "green");
    } else {
      log("⚠️  Some issues still need attention.", "yellow");
    }
  } catch (error) {
    log(`Error running tests: ${error.message}`, "red");
  }
}

runQuickTests().catch(console.error);
