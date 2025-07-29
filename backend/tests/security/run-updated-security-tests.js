#!/usr/bin/env node
/**
 * Test Runner for Updated Security Test Suite
 * Runs all security tests with proper sequencing and reporting
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTest(testFile, testName) {
  return new Promise((resolve) => {
    log(`\n🔄 Running ${testName}...`, 'blue');
    log('=' .repeat(50), 'cyan');
    
    const testPath = join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--experimental-fetch' }
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`\n✅ ${testName} completed successfully`, 'green');
      } else {
        log(`\n❌ ${testName} failed with exit code ${code}`, 'red');
      }
      resolve(code === 0);
    });
    
    child.on('error', (error) => {
      log(`\n💥 ${testName} error: ${error.message}`, 'red');
      resolve(false);
    });
  });
}

async function checkServerHealth() {
  log('🏥 Checking server health...', 'blue');
  
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:8080/api/health', { timeout: 5000 });
    
    if (response.ok) {
      log('✅ Server is healthy and ready for testing', 'green');
      return true;
    } else {
      log(`❌ Server health check failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Server is not responding: ${error.message}`, 'red');
    log('Please ensure the backend server is running on localhost:8080', 'yellow');
    return false;
  }
}

async function runAllSecurityTests() {
  log('🛡️  HOPIN SECURITY TEST SUITE RUNNER - UPDATED', 'bold');
  log('==================================================', 'cyan');
  log(`Started at: ${new Date().toISOString()}`, 'blue');
  
  // Check if server is running
  const serverHealthy = await checkServerHealth();
  if (!serverHealthy) {
    log('\n🚨 Cannot run tests: Server is not accessible', 'red');
    log('Please start the backend server and try again.', 'yellow');
    process.exit(1);
  }
  
  const tests = [
    {
      file: 'comprehensive-security-tests.js',
      name: 'Comprehensive Security Tests',
      description: 'Authentication, subscription, rate limiting, and input validation'
    },
    {
      file: 'subscription-security-tests.js',
      name: 'Subscription Security Tests',
      description: 'Payment protection and subscription enforcement'
    },
    {
      file: 'rate-limiting-tests.js',
      name: 'Rate Limiting Tests',
      description: 'Abuse prevention and progressive penalties'
    }
  ];
  
  const results = [];
  let totalDuration = 0;
  
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const startTime = Date.now();
    
    log(`\n📋 Test ${i + 1}/${tests.length}: ${test.name}`, 'magenta');
    log(`Description: ${test.description}`, 'blue');
    
    const success = await runTest(test.file, test.name);
    const duration = Date.now() - startTime;
    totalDuration += duration;
    
    results.push({
      name: test.name,
      success,
      duration
    });
    
    log(`Duration: ${(duration / 1000).toFixed(1)}s`, 'blue');
    
    // Add delay between tests to avoid overwhelming the server
    if (i < tests.length - 1) {
      log('\n⏱️  Waiting 3 seconds before next test...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final Summary
  log('\n📊 FINAL SECURITY TEST SUMMARY', 'bold');
  log('===============================', 'cyan');
  
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = results.length - successfulTests;
  const successRate = ((successfulTests / results.length) * 100).toFixed(1);
  
  log(`Total Tests Run: ${results.length}`, 'blue');
  log(`Successful: ${successfulTests}`, successfulTests === results.length ? 'green' : 'yellow');
  log(`Failed: ${failedTests}`, failedTests === 0 ? 'green' : 'red');
  log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'green' : successRate >= '80.0' ? 'yellow' : 'red');
  log(`Total Duration: ${(totalDuration / 1000).toFixed(1)}s`, 'blue');
  
  log('\nDetailed Results:', 'bold');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = `(${(result.duration / 1000).toFixed(1)}s)`;
    log(`  ${status} ${result.name} ${duration}`, result.success ? 'green' : 'red');
  });
  
  if (successfulTests === results.length) {
    log('\n🎉 ALL SECURITY TESTS PASSED!', 'green');
    log('Your application security is robust and ready for production.', 'green');
  } else if (successRate >= 80) {
    log('\n⚠️  MOST SECURITY TESTS PASSED', 'yellow');
    log('Some issues detected. Review failed tests and address before production.', 'yellow');
  } else {
    log('\n🚨 CRITICAL SECURITY ISSUES DETECTED', 'red');
    log('Multiple test failures indicate serious security vulnerabilities.', 'red');
    log('Do not deploy to production until these issues are resolved.', 'red');
  }
  
  log('\n📝 Next Steps:', 'bold');
  if (failedTests > 0) {
    log('1. Review the failed test output above', 'blue');
    log('2. Fix the identified security issues', 'blue');
    log('3. Re-run the tests to verify fixes', 'blue');
    log('4. Consider additional security measures if needed', 'blue');
  } else {
    log('1. Monitor security logs in production', 'blue');
    log('2. Run these tests regularly (CI/CD integration recommended)', 'blue');
    log('3. Keep security dependencies updated', 'blue');
    log('4. Review and update security tests as the application evolves', 'blue');
  }
  
  log(`\nCompleted at: ${new Date().toISOString()}`, 'blue');
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle process interruption
process.on('SIGINT', () => {
  log('\n\n⏸️  Test suite interrupted by user', 'yellow');
  log('Exiting gracefully...', 'blue');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n⏹️  Test suite terminated', 'yellow');
  process.exit(143);
});

runAllSecurityTests().catch((error) => {
  log(`\n💥 Test suite error: ${error.message}`, 'red');
  log(error.stack, 'red');
  process.exit(1);
});
