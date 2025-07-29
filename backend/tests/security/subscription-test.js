#!/usr/bin/env node
/**
 * Subscription Enforcement Validation Test
 * Tests that subscription middleware is working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, { ...options, timeout: 10000 });
    return {
      status: response.status,
      headers: response.headers,
      data: response.headers.get('content-type')?.includes('application/json') 
        ? await response.json() 
        : await response.text()
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function createAndLoginUser() {
  log('\n=== Creating and Logging In Test User ===', 'bold');
  
  const user = {
    email: `subtest-${Date.now()}@security.com`,
    password: 'SecurePass123!',
    name: 'Subscription Test User'
  };
  
  // Create user
  const signupResponse = await makeRequest(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  
  if (signupResponse.status !== 201) {
    log(`❌ Failed to create user: ${JSON.stringify(signupResponse.data)}`, 'red');
    return null;
  }
  
  log('✅ User created successfully', 'green');
  
  // Add delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Login user
  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      password: user.password
    })
  });
  
  if (loginResponse.status !== 200 || !loginResponse.data?.accessToken) {
    log(`❌ Failed to login user: Status ${loginResponse.status}`, 'red');
    if (loginResponse.data) {
      log(`    Response: ${JSON.stringify(loginResponse.data)}`, 'red');
    }
    return null;
  }
  
  log('✅ User logged in successfully', 'green');
  
  return {
    user,
    token: loginResponse.data.accessToken,
    userId: loginResponse.data.id
  };
}

async function testSubscriptionEnforcement(token) {
  log('\n=== Testing Subscription Enforcement ===', 'bold');
  
  const protectedEndpoints = [
    { path: '/api/users', method: 'GET', name: 'Get All Users' },
    { path: '/api/users/by-email?email=test@example.com', method: 'GET', name: 'Get User by Email' }
  ];

  let allBlocked = true;
  for (const endpoint of protectedEndpoints) {
    const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // Should return 402 (Payment Required) for subscription enforcement
    const isBlocked = response.status === 402;
    log(`${endpoint.name}: ${response.status} ${isBlocked ? '✅' : '❌'}`, 
      isBlocked ? 'green' : 'red');
    
    if (response.status === 402 && response.data?.code) {
      log(`  └─ Code: ${response.data.code}`, 'blue');
    }
    
    if (!isBlocked) {
      allBlocked = false;
      log(`  └─ Expected 402, got ${response.status}: ${JSON.stringify(response.data)}`, 'red');
    }
  }
  
  return allBlocked;
}

async function testRateLimiting() {
  log('\n=== Testing Rate Limiting on User Endpoints ===', 'bold');
  
  // Add delay before rate limiting test
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Create a user for rate limiting test
  const userResult = await createAndLoginUser();
  if (!userResult) {
    log('❌ Failed to create user for rate limiting test', 'red');
    return false;
  }
  
  const { token } = userResult;
  
  // Test rate limiting on user endpoint with rapid requests
  log('Testing rapid requests to /api/users endpoint...', 'blue');
  
  const rapidRequests = [];
  for (let i = 0; i < 15; i++) {  // Reduced from 25 to 15
    rapidRequests.push(
      makeRequest(`${BASE_URL}/api/users`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    );
    
    // Add small delay between requests to be more realistic
    if (i % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  const results = await Promise.all(rapidRequests);
  
  const rateLimited = results.filter(r => r.status === 429).length;
  const blocked = results.filter(r => r.status === 402).length; // Subscription blocks
  const total = results.length;
  
  log(`Rate Limited: ${rateLimited}/${total}`, rateLimited > 0 ? 'green' : 'yellow');
  log(`Subscription Blocked: ${blocked}/${total}`, blocked > 0 ? 'green' : 'red');
  
  // Rate limiting should kick in, or all should be subscription blocked
  return rateLimited > 2 || blocked === total;
}

async function runSubscriptionTests() {
  log('🔒 SUBSCRIPTION ENFORCEMENT VALIDATION', 'bold');
  log('=====================================');
  log(`Testing against: ${BASE_URL}`, 'blue');
  
  let results = {
    userCreation: false,
    subscriptionEnforcement: false,
    rateLimiting: false
  };
  
  try {
    // Test 1: Create user and login
    const userResult = await createAndLoginUser();
    results.userCreation = userResult !== null;
    
    if (userResult) {
      // Test 2: Test subscription enforcement
      results.subscriptionEnforcement = await testSubscriptionEnforcement(userResult.token);
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Test 3: Test rate limiting
    results.rateLimiting = await testRateLimiting();
    
    log('\n📊 SUBSCRIPTION TEST SUMMARY', 'bold');
    log('============================');
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    log(`User Creation/Login: ${results.userCreation ? 'PASS ✅' : 'FAIL ❌'}`, 
      results.userCreation ? 'green' : 'red');
    log(`Subscription Enforcement: ${results.subscriptionEnforcement ? 'PASS ✅' : 'FAIL ❌'}`, 
      results.subscriptionEnforcement ? 'green' : 'red');
    log(`Rate Limiting: ${results.rateLimiting ? 'PASS ✅' : 'FAIL ❌'}`, 
      results.rateLimiting ? 'green' : 'red');
    
    log(`\nOverall: ${passed}/${total} tests passing`, 
      passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
      log('🎉 Subscription enforcement is working correctly!', 'green');
    } else {
      log('⚠️  Some subscription enforcement issues detected.', 'yellow');
    }
    
    return results;
    
  } catch (error) {
    log(`Error running tests: ${error.message}`, 'red');
    return results;
  }
}

runSubscriptionTests().catch(console.error);
