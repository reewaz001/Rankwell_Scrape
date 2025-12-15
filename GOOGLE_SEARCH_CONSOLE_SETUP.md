# Google Search Console API Setup Guide

This guide explains how to set up and use the Google Search Console API integration.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Authentication Setup](#authentication-setup)
  - [Option 1: Service Account (Recommended)](#option-1-service-account-recommended)
  - [Option 2: OAuth2](#option-2-oauth2)
- [Environment Configuration](#environment-configuration)
- [Usage Examples](#usage-examples)
- [Available Methods](#available-methods)

## Prerequisites

1. **Google Cloud Project**: Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable API**: Enable the "Google Search Console API" for your project
3. **Search Console Access**: Have access to the site(s) you want to query in [Google Search Console](https://search.google.com/search-console)

## Authentication Setup

### Option 1: Service Account (Recommended)

Best for server-to-server applications and automated scripts.

#### Steps:

1. **Create Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "gsc-api-access")
   - Click "Create and Continue"

2. **Generate Key**:
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose JSON format
   - Download the key file
   - Save it securely (e.g., `credentials/google-service-account.json`)

3. **Grant Access in Search Console**:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Select your property
   - Go to Settings > Users and permissions
   - Click "Add User"
   - Enter the service account email (looks like `xxx@xxx.iam.gserviceaccount.com`)
   - Grant "Full" or "Restricted" permission
   - Click "Add"

4. **Configure Environment**:
   ```bash
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/google-service-account.json
   ```

### Option 2: OAuth2

Best for applications that need user authorization.

#### Steps:

1. **Create OAuth2 Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs (e.g., `http://localhost:3000/oauth2callback`)
   - Download the credentials JSON

2. **Configure Environment**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   ```

3. **Get Refresh Token**:
   ```bash
   # Run the auth test to get authorization URL
   npm run test:gsc auth

   # Visit the URL, authorize, and get the code
   # Then exchange code for tokens programmatically:
   # const tokens = await gscService.getTokensFromCode(code);
   # Save the refresh_token to environment variable
   ```

4. **Add Refresh Token**:
   ```bash
   GOOGLE_REFRESH_TOKEN=your-refresh-token-here
   ```

## Environment Configuration

Add these variables to your `.env` file:

```env
# Option 1: Service Account (Recommended for servers)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/google-service-account.json

# Option 2: OAuth2 (For user authorization)
# GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=your-client-secret
# GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
# GOOGLE_REFRESH_TOKEN=your-refresh-token
```

## Usage Examples

### Basic Commands

```bash
# List all accessible sites
npm run test:gsc sites

# Get top queries for a site (last 30 days)
npm run test:gsc queries "https://example.com/"

# Get top pages
npm run test:gsc pages "https://example.com/"

# Get full analytics data (saves to gsc-data/ folder)
npm run test:gsc analytics "https://example.com/"

# Get sitemaps
npm run test:gsc sitemaps "https://example.com/"

# Get performance by country and device
npm run test:gsc performance "https://example.com/"

# Test authentication
npm run test:gsc auth
```

### Programmatic Usage

```typescript
import { GoogleSearchConsoleService } from './common/google-search-console.service';

// Get service instance
const gscService = app.get(GoogleSearchConsoleService);

// List sites
const sites = await gscService.getSitesList();
console.log(sites);

// Get top queries
const queries = await gscService.getTopQueries(
  'https://example.com/',
  '2024-01-01',
  '2024-01-31',
  100 // limit
);

// Get search analytics with custom options
const analytics = await gscService.getSearchAnalytics({
  siteUrl: 'https://example.com/',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  dimensions: ['query', 'page'],
  rowLimit: 1000
});

// Get search analytics with pagination (fetches all results)
const allData = await gscService.getSearchAnalyticsPaginated({
  siteUrl: 'https://example.com/',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  dimensions: ['query'],
}, (currentRows, totalFetched) => {
  console.log(`Fetched ${currentRows} rows, total: ${totalFetched}`);
});

// Get top pages
const pages = await gscService.getTopPages(
  'https://example.com/',
  '2024-01-01',
  '2024-01-31',
  50
);

// Get performance by country
const countries = await gscService.getPerformanceByCountry(
  'https://example.com/',
  '2024-01-01',
  '2024-01-31'
);

// Get performance by device
const devices = await gscService.getPerformanceByDevice(
  'https://example.com/',
  '2024-01-01',
  '2024-01-31'
);

// Get sitemaps
const sitemaps = await gscService.getSitemaps('https://example.com/');
```

## Available Methods

### Authentication
- `getAuthorizationUrl()`: Get OAuth2 authorization URL
- `getTokensFromCode(code)`: Exchange auth code for tokens

### Sites
- `getSitesList()`: Get list of accessible sites/properties

### Search Analytics
- `getSearchAnalytics(options)`: Get search analytics data
- `getSearchAnalyticsPaginated(options, onProgress)`: Get all results with pagination
- `getTopQueries(siteUrl, startDate, endDate, limit)`: Get top performing queries
- `getTopPages(siteUrl, startDate, endDate, limit)`: Get top performing pages

### Performance
- `getPerformanceByCountry(siteUrl, startDate, endDate)`: Performance by country
- `getPerformanceByDevice(siteUrl, startDate, endDate)`: Performance by device

### Sitemaps
- `getSitemaps(siteUrl)`: Get list of sitemaps
- `submitSitemap(siteUrl, feedpath)`: Submit a new sitemap
- `deleteSitemap(siteUrl, feedpath)`: Delete a sitemap

## Search Analytics Options

### Dimensions
- `query`: Search query
- `page`: Landing page URL
- `country`: Country code
- `device`: Device type (desktop, mobile, tablet)
- `searchAppearance`: How result appeared in search

### Date Format
Dates should be in `YYYY-MM-DD` format (e.g., `2024-01-31`)

### Row Limits
- Default: 1000 rows per request
- Maximum: 25000 rows per request
- Use pagination for larger datasets

## Troubleshooting

### "Access Not Configured" Error
- Make sure the Google Search Console API is enabled in your Cloud Console
- Check that you're using the correct project

### "Insufficient Permissions" Error
- Verify the service account email has been added to Search Console
- Make sure you granted the correct permission level
- Wait a few minutes for permissions to propagate

### "Invalid Credentials" Error
- Check that the service account key file path is correct
- Verify the key file is valid JSON
- Make sure OAuth2 credentials are correct

### No Data Returned
- Verify the site URL format matches exactly (include trailing slash)
- Check the date range - data may not be available yet
- Ensure the site has data in Search Console

## API Limits

- **Daily quota**: 2000 requests per day (as of 2024)
- **Rate limit**: 600 queries per minute per project
- **Row limit**: 25,000 rows per request

If you need more, request a quota increase in Google Cloud Console.

## Additional Resources

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [Search Analytics API Guide](https://developers.google.com/webmaster-tools/v1/searchanalytics)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Search Console](https://search.google.com/search-console)
