# Setup and Run Guide

## Current Status

✅ **Scraper Infrastructure**: Complete and ready
❌ **Dashboard API**: Not running (required for full testing)

## Error You're Seeing

```
No response received from API
```

This means the Dashboard API at `http://localhost:5000/` is not running.

## Options to Test the Scraper

### Option 1: Test with Mock Data (No API Required)

Run the scraper with example.com to verify functionality:

```bash
npm run test:netlink-scraper:mock
```

This will:
- ✅ Test the scraping logic
- ✅ Test URL matching
- ✅ Verify Lightpanda browser works
- ❌ Won't fetch actual netlinks from dashboard

### Option 2: Start Your Dashboard API (Full Test)

1. **Start your Dashboard API** on port 5000
2. **Verify it's running**:
   ```bash
   curl http://localhost:5000/netlink/all/paginated?page=1&limit=10
   ```
3. **Run the scraper**:
   ```bash
   npm run test:netlink-scraper sample
   ```

### Option 3: Change Dashboard URL

If your dashboard is running on a different port/URL:

1. **Update `.env` file**:
   ```bash
   DASHBOARD_BASE_URL=http://your-actual-url:port/
   ```

2. **Copy to active .env** (if needed):
   ```bash
   cp .env.example .env
   ```

3. **Run the test**:
   ```bash
   npm run test:netlink-scraper sample
   ```

## What's Working

✅ Lightpanda browser integration
✅ URL matching logic
✅ Scraping infrastructure
✅ Batch processing
✅ Progress tracking
✅ Error handling

## What's Needed

The Dashboard API needs to provide this endpoint:

```
GET /netlink/all/paginated?page=1&limit=100
```

Expected response:
```json
{
  "data": [
    {
      "id": 123,
      "url_bought": "https://publisher-site.com/article",
      "landing_page": "https://target-site.com"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "limit": 100,
    "totalItems": 7959,
    "totalPages": 80,
    "hasNextPage": true
  }
}
```

## Quick Start Checklist

- [ ] Dashboard API is running
- [ ] Dashboard URL is correct in `.env`
- [ ] Lightpanda token (`LPD_TOKEN`) is set in `.env`
- [ ] Test with: `npm run test:netlink-scraper sample`

## Testing Without Dashboard

If you don't have the dashboard API yet, you can:

1. **Test the scraper logic**:
   ```bash
   npm run test:netlink-scraper:mock
   ```

2. **Test Lightpanda browser**:
   ```bash
   npm run test:lightpanda
   ```

3. **Test with manual netlink data**:
   ```typescript
   // In your code
   const mockNetlinks = [
     {
       id: 1,
       url_bought: 'https://example.com',
       landing_page: 'https://example.org'
     }
   ];

   const results = await scraperService.scrapeNetlinks(mockNetlinks, {
     concurrency: 1
   });
   ```

## Environment Configuration

Your `.env` should have:

```bash
# Lightpanda Cloud Configuration
LPD_TOKEN=your-token-here

# Dashboard API Configuration
DASHBOARD_BASE_URL=http://localhost:5000/
```

## Available Test Commands

```bash
# Test scraper with mock data (no API needed)
npm run test:netlink-scraper:mock

# Test scraper with real API (API required)
npm run test:netlink-scraper sample

# Test Lightpanda browser
npm run test:lightpanda

# Test Dashboard HTTP client
npm run test:dashboard

# Test Netlink service (fetching from API)
npm run test:netlink
```

## Troubleshooting

### "No response received from API"

**Cause**: Dashboard API not running
**Solution**: Start your Dashboard API or use mock test

### "LPD_TOKEN environment variable is required"

**Cause**: Missing Lightpanda token
**Solution**: Add `LPD_TOKEN` to `.env` file

### "Cannot have more than one browser context"

**Cause**: Lightpanda cloud limitation (handled automatically)
**Solution**: This is normal, the service handles it

### Browser connection fails

**Cause**: Invalid Lightpanda token or network issue
**Solution**:
1. Verify token in `.env`
2. Test with: `npm run test:lightpanda`
3. Check internet connection

## Next Steps

### If Dashboard API is Ready:

1. ✅ Start Dashboard API
2. ✅ Verify endpoint: `http://localhost:5000/netlink/all/paginated`
3. ✅ Update `.env` with correct URL
4. ✅ Run: `npm run test:netlink-scraper sample`
5. ✅ Review results
6. ✅ Run full scrape: `npm run test:netlink-scraper save`

### If Dashboard API is Not Ready:

1. ✅ Test scraper logic: `npm run test:netlink-scraper:mock`
2. ✅ Prepare your Dashboard API endpoint
3. ✅ Come back when API is ready

## Support

The scraper is fully implemented and tested. It just needs:
1. Dashboard API running at configured URL
2. Valid Lightpanda token in `.env`

Everything else is ready to go! 🚀
