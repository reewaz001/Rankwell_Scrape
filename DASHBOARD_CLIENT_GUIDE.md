# Dashboard HTTP Client Guide

## Overview

The `DashboardHttpClient` is a reusable Axios-based HTTP client for making requests to your Dashboard API. It provides a clean, type-safe interface with built-in error handling, logging, and request/response interceptors.

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Dashboard API Configuration
DASHBOARD_BASE_URL=http://localhost:3000/api
```

The base URL is automatically loaded and used for all requests.

## Usage

### Basic Injection

Inject the client into any NestJS service:

```typescript
import { Injectable } from '@nestjs/common';
import { DashboardHttpClient } from '../common/dashboard-http-client.service';

@Injectable()
export class MyService {
  constructor(private readonly dashboardClient: DashboardHttpClient) {}

  async myMethod() {
    const data = await this.dashboardClient.get('/endpoint');
    return data;
  }
}
```

## HTTP Methods

### GET Request

```typescript
// Simple GET
const users = await this.dashboardClient.get('/users');

// GET with query parameters
const filteredUsers = await this.dashboardClient.get('/users', {
  params: {
    role: 'admin',
    active: true,
    page: 1,
    limit: 10
  }
});

// GET with type safety
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await this.dashboardClient.get<User>('/users/123');
console.log(user.name); // TypeScript knows this exists!
```

### POST Request

```typescript
// Create new resource
const newUser = await this.dashboardClient.post('/users', {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
});

// POST with type safety
interface CreateUserDto {
  name: string;
  email: string;
}

interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

const response = await this.dashboardClient.post<UserResponse, CreateUserDto>(
  '/users',
  { name: 'John', email: 'john@example.com' }
);
```

### PUT Request (Full Update)

```typescript
// Replace entire resource
const updatedUser = await this.dashboardClient.put('/users/123', {
  name: 'John Updated',
  email: 'john.updated@example.com',
  role: 'user'
});
```

### PATCH Request (Partial Update)

```typescript
// Update specific fields
const patchedUser = await this.dashboardClient.patch('/users/123', {
  name: 'John Patched'
});
```

### DELETE Request

```typescript
// Delete resource
await this.dashboardClient.delete('/users/123');

// DELETE with response
const result = await this.dashboardClient.delete<{ success: boolean }>('/users/123');
console.log(result.success);
```

## Authentication

### Setting Auth Token

```typescript
// Set Bearer token
this.dashboardClient.setAuthToken('your-jwt-token-here');

// Now all requests include: Authorization: Bearer your-jwt-token-here
const protectedData = await this.dashboardClient.get('/protected/endpoint');
```

### Removing Auth Token

```typescript
this.dashboardClient.removeAuthToken();
```

### Example: Login Flow

```typescript
async login(email: string, password: string) {
  // Login without token
  const response = await this.dashboardClient.post<{ token: string }>('/auth/login', {
    email,
    password
  });

  // Set token for subsequent requests
  this.dashboardClient.setAuthToken(response.token);

  return response;
}

async logout() {
  await this.dashboardClient.post('/auth/logout');
  this.dashboardClient.removeAuthToken();
}
```

## Custom Headers

### Setting Custom Headers

```typescript
// Set a custom header
this.dashboardClient.setHeader('X-API-Version', '2.0');
this.dashboardClient.setHeader('X-Request-ID', 'unique-id-123');
this.dashboardClient.setHeader('X-Client-Type', 'scraper');

// All subsequent requests will include these headers
```

### Removing Custom Headers

```typescript
this.dashboardClient.removeHeader('X-API-Version');
```

## Configuration Methods

### Set Timeout

```typescript
// Set timeout to 15 seconds (default is 30 seconds)
this.dashboardClient.setTimeout(15000);
```

### Get Base URL

```typescript
const baseUrl = this.dashboardClient.getBaseURL();
console.log(`API Base URL: ${baseUrl}`);
```

### Get Axios Instance

For advanced usage, you can get the underlying Axios instance:

```typescript
const axios = this.dashboardClient.getAxiosInstance();

// Use for advanced configurations
axios.interceptors.request.use((config) => {
  // Custom interceptor logic
  return config;
});
```

## Error Handling

### Basic Error Handling

```typescript
try {
  const data = await this.dashboardClient.get('/might-fail');
} catch (error) {
  if (error.response) {
    // Server responded with error status (4xx, 5xx)
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
    console.error('Headers:', error.response.headers);
  } else if (error.request) {
    // Request made but no response received (network error)
    console.error('No response from server');
    console.error('Request:', error.request);
  } else {
    // Error setting up request
    console.error('Error:', error.message);
  }
}
```

### Typed Error Handling

```typescript
interface ApiErrorResponse {
  message: string;
  code: string;
  details?: any;
}

try {
  const data = await this.dashboardClient.get('/endpoint');
} catch (error) {
  if (error.response) {
    const errorData = error.response.data as ApiErrorResponse;
    console.error(`API Error: ${errorData.message} (${errorData.code})`);
  }
}
```

## Advanced Usage Patterns

### Pattern 1: Retry Logic

```typescript
async getWithRetry<T>(url: string, maxRetries = 3): Promise<T> {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.dashboardClient.get<T>(url);
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}
```

### Pattern 2: Batch Requests

```typescript
async batchCreate<T>(items: any[]): Promise<T[]> {
  const promises = items.map(item =>
    this.dashboardClient.post<T>('/items', item)
  );

  return await Promise.all(promises);
}
```

### Pattern 3: Paginated Requests

```typescript
async getAllPages<T>(endpoint: string, pageSize = 50): Promise<T[]> {
  let allItems: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await this.dashboardClient.get<{
      items: T[];
      hasMore: boolean;
    }>(endpoint, {
      params: { page, limit: pageSize }
    });

    allItems = allItems.concat(response.items);
    hasMore = response.hasMore;
    page++;
  }

  return allItems;
}
```

### Pattern 4: Request Caching

```typescript
private cache = new Map<string, { data: any; timestamp: number }>();

async getCached<T>(url: string, ttl = 60000): Promise<T> {
  const cached = this.cache.get(url);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < ttl) {
    return cached.data;
  }

  const data = await this.dashboardClient.get<T>(url);
  this.cache.set(url, { data, timestamp: now });

  return data;
}
```

## Real-World Examples

### Example 1: User Management Service

```typescript
@Injectable()
export class UserManagementService {
  constructor(private readonly dashboardClient: DashboardHttpClient) {
    // Set auth token on initialization
    this.dashboardClient.setAuthToken(process.env.DASHBOARD_API_KEY);
  }

  async createUser(userData: CreateUserDto) {
    return await this.dashboardClient.post('/users', userData);
  }

  async getUser(userId: number) {
    return await this.dashboardClient.get(`/users/${userId}`);
  }

  async updateUser(userId: number, updates: Partial<User>) {
    return await this.dashboardClient.patch(`/users/${userId}`, updates);
  }

  async deleteUser(userId: number) {
    return await this.dashboardClient.delete(`/users/${userId}`);
  }

  async listUsers(filters?: UserFilters) {
    return await this.dashboardClient.get('/users', {
      params: filters
    });
  }
}
```

### Example 2: Data Sync Service

```typescript
@Injectable()
export class DataSyncService {
  constructor(private readonly dashboardClient: DashboardHttpClient) {}

  async syncScrapedData(sites: Site[]) {
    const batchSize = 100;
    const batches = this.chunk(sites, batchSize);

    for (const batch of batches) {
      try {
        await this.dashboardClient.post('/sync/batch', {
          sites: batch,
          timestamp: new Date().toISOString()
        });
        console.log(`Synced batch of ${batch.length} sites`);
      } catch (error) {
        console.error(`Failed to sync batch:`, error.message);
        // Continue with next batch
      }
    }
  }

  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

### Example 3: Health Check Service

```typescript
@Injectable()
export class HealthCheckService {
  constructor(private readonly dashboardClient: DashboardHttpClient) {}

  async checkDashboardHealth(): Promise<HealthStatus> {
    try {
      const response = await this.dashboardClient.get<HealthStatus>('/health', {
        timeout: 5000 // 5 second timeout for health checks
      });

      return {
        status: 'healthy',
        ...response
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
```

## Testing

Run the test script:

```bash
npm run test:dashboard
```

This will test:
- ✅ Client initialization
- ✅ Header management
- ✅ Token management
- ✅ Configuration methods
- ✅ Request structure (without actual server)

## Features

### Built-in Features

- ✅ **Automatic base URL handling**
- ✅ **Request/Response logging**
- ✅ **Error handling and logging**
- ✅ **Type-safe requests**
- ✅ **Auth token management**
- ✅ **Custom headers**
- ✅ **Configurable timeout**
- ✅ **Interceptors for request/response**

### Interceptors

The client includes automatic interceptors that:

1. **Request Interceptor**
   - Logs outgoing requests (method + URL)
   - Can be extended for custom logic

2. **Response Interceptor**
   - Logs successful responses
   - Logs detailed error information
   - Handles different error types (network, server, request setup)

## Files Reference

- **Service**: `src/common/dashboard-http-client.service.ts`
- **Test**: `src/cli/test-dashboard-client.ts`
- **Module**: Integrated into `PaperClubModule`

## Troubleshooting

### "DASHBOARD_BASE_URL environment variable is required"

- Make sure `.env` file exists
- Check that `DASHBOARD_BASE_URL` is set in `.env`
- Restart your application after changing `.env`

### Connection Refused / ECONNREFUSED

- Dashboard API server is not running
- Check the URL in `DASHBOARD_BASE_URL`
- Verify network connectivity

### Timeout Errors

- Increase timeout: `dashboardClient.setTimeout(60000)`
- Check if the API endpoint is slow
- Verify network conditions

### 401 Unauthorized

- Auth token not set: `dashboardClient.setAuthToken(token)`
- Token may have expired
- Check token format (should be Bearer token)

## Next Steps

1. Configure your dashboard API URL in `.env`
2. Inject the client into your services
3. Replace manual Axios usage with the client
4. Add authentication tokens as needed
5. Implement error handling patterns

For more help, see the test script at `src/cli/test-dashboard-client.ts`
