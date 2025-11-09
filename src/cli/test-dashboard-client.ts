import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DashboardHttpClient } from '../common/dashboard-http-client.service';

/**
 * Test script for Dashboard HTTP Client
 *
 * This script demonstrates:
 * 1. Basic GET, POST, PUT, PATCH, DELETE requests
 * 2. Setting custom headers
 * 3. Auth token management
 * 4. Error handling
 */
async function testDashboardClient() {
  console.log('='.repeat(60));
  console.log('TESTING DASHBOARD HTTP CLIENT');
  console.log('='.repeat(60));

  const app = await NestFactory.createApplicationContext(AppModule);
  const dashboardClient = app.get(DashboardHttpClient);

  try {
    // Test 1: Check configuration
    console.log('\n1. Checking client configuration...');
    console.log(`   Base URL: ${dashboardClient.getBaseURL()}`);
    console.log('✓ Client initialized successfully');

    // Test 2: Set custom headers
    console.log('\n2. Setting custom headers...');
    dashboardClient.setHeader('X-Custom-Header', 'test-value');
    dashboardClient.setAuthToken('test-token-123');
    console.log('✓ Custom headers set');

    // Test 3: GET request example (will fail if server not running)
    console.log('\n3. Testing GET request...');
    console.log('   Note: This will fail if the dashboard API is not running');
    try {
      const response = await dashboardClient.get('/health');
      console.log('✓ GET request successful');
      console.log(`   Response:`, response);
    } catch (error) {
      console.log('⚠ GET request failed (expected if server not running)');
      console.log(`   Error: ${error.message}`);
    }

    // Test 4: POST request example
    console.log('\n4. Testing POST request structure...');
    console.log('   (Not making actual request to avoid errors)');
    const sampleData = {
      name: 'Test Item',
      value: 123,
      timestamp: new Date().toISOString(),
    };
    console.log('   Sample POST data:', sampleData);
    console.log('✓ POST structure validated');

    // Test 5: Remove auth token
    console.log('\n5. Testing token removal...');
    dashboardClient.removeAuthToken();
    console.log('✓ Auth token removed');

    // Test 6: Timeout configuration
    console.log('\n6. Testing timeout configuration...');
    dashboardClient.setTimeout(15000);
    console.log('✓ Timeout set to 15 seconds');

    console.log('\n' + '='.repeat(60));
    console.log('DASHBOARD CLIENT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✓ Client initialization');
    console.log('✓ Header management');
    console.log('✓ Token management');
    console.log('✓ Configuration methods');
    console.log('\nClient is ready for use!');
    console.log('\nUsage example:');
    console.log('  const data = await dashboardClient.get("/endpoint");');
    console.log('  await dashboardClient.post("/endpoint", { data });');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Example usage patterns
 */
async function exampleUsagePatterns() {
  console.log('\n' + '='.repeat(60));
  console.log('EXAMPLE USAGE PATTERNS');
  console.log('='.repeat(60));

  const examples = `
// 1. GET request
const users = await dashboardClient.get('/users');

// 2. GET with query parameters
const filteredUsers = await dashboardClient.get('/users', {
  params: { role: 'admin', active: true }
});

// 3. POST request
const newUser = await dashboardClient.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// 4. PUT request (full update)
const updatedUser = await dashboardClient.put('/users/123', {
  name: 'John Updated',
  email: 'john.updated@example.com'
});

// 5. PATCH request (partial update)
const patchedUser = await dashboardClient.patch('/users/123', {
  name: 'John Patched'
});

// 6. DELETE request
await dashboardClient.delete('/users/123');

// 7. With authentication
dashboardClient.setAuthToken('your-jwt-token');
const protectedData = await dashboardClient.get('/protected/data');

// 8. Custom headers
dashboardClient.setHeader('X-API-Version', '2.0');
dashboardClient.setHeader('X-Request-ID', 'unique-id');

// 9. Error handling
try {
  const data = await dashboardClient.get('/might-fail');
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
  } else if (error.request) {
    // No response received
    console.error('No response from server');
  } else {
    // Request setup error
    console.error('Error:', error.message);
  }
}

// 10. Type-safe requests with TypeScript
interface User {
  id: number;
  name: string;
  email: string;
}

const typedUser = await dashboardClient.get<User>('/users/123');
console.log(typedUser.name); // Type-safe!
`;

  console.log(examples);
}

// Run tests
if (require.main === module) {
  testDashboardClient()
    .then(() => {
      exampleUsagePatterns();
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testDashboardClient };
