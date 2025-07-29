#!/usr/bin/env node
/**
 * Final Subscription Enforcement Test
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';

async function testSubscriptionEnforcement() {
  console.log('🔒 TESTING SUBSCRIPTION ENFORCEMENT');
  console.log('===================================');
  
  // Create and login user
  const user = {
    email: `final-test-${Date.now()}@test.com`,
    password: 'TestPass123!',
    name: 'Final Test User'
  };
  
  try {
    // Create user
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    
    if (signupRes.status !== 201) {
      console.log(`❌ Signup failed: ${signupRes.status}`);
      return;
    }
    
    // Login user  
    const loginRes = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password })
    });
    
    if (loginRes.status !== 200) {
      console.log(`❌ Login failed: ${loginRes.status}`);
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('✅ User created and logged in successfully');
    
    // Test subscription-protected endpoint
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`\n📊 Subscription Protection Test:`);
    console.log(`GET /api/users: ${usersRes.status}`);
    
    if (usersRes.status === 402) {
      const errorData = await usersRes.json();
      console.log(`✅ SUBSCRIPTION ENFORCEMENT WORKING!`);
      console.log(`   Error: ${errorData.error}`);
      console.log(`   Code: ${errorData.code}`);
      console.log(`   Redirect: ${errorData.redirectUrl}`);
    } else {
      console.log(`❌ Expected 402, got ${usersRes.status}`);
      const data = await usersRes.text();
      console.log(`   Response: ${data.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testSubscriptionEnforcement();
