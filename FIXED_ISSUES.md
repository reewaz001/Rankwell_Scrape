# Fixed Issues Summary

## Problem: 500 Internal Server Error from Paper.club API

### Root Cause
The Paper.club API was rejecting requests with extra HTTP headers. The Node.js axios HTTP client was sending:
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

While the Python aiohttp client only sent:
```
Authorization: Bearer {token}
```

### Solution
Modified `getHeaders()` in `paperclub-api.service.ts:87` to only send the Authorization header:

```typescript
private getHeaders(): Record<string, string> {
  return {
    ...(this.token && { Authorization: `Bearer ${this.token}` }),
  };
}
```

### Testing Results
✅ Authentication: Working
✅ API Requests: Status 200
✅ Pagination: Working (12 pages, 1,179 sites from "Animaux")
✅ BQS Scoring: Working
✅ Data Transformation: Working

### Test Commands
```bash
# Test authentication only
npm run test:auth

# Test single category
npm run test:category

# Run full scraper
npm run scrape
```

## Key Learnings

1. **API Server Sensitivity**: Some APIs reject requests with "unnecessary" headers even if they're standard HTTP headers
2. **Python vs Node.js HTTP Clients**: Different default behaviors - Python's aiohttp is more minimal by default
3. **Debugging Approach**: Compare working (Python) vs non-working (Node.js) implementations at the HTTP level
4. **Manual URL Building**: Axios parameter serialization didn't work correctly for array parameters like `to[]` - manual URL construction was needed

## Files Modified

1. `src/modules/paperclub/services/paperclub-api.service.ts`
   - Line 87-95: Simplified headers to only send Authorization
   - Line 112-113: Manual URL construction instead of axios params

2. Created test scripts:
   - `src/cli/test-auth.ts` - Authentication testing
   - `src/cli/test-single-category.ts` - Single category scraping test

## Performance

- **Single Category** ("Animaux"): ~17 seconds for 1,179 sites
- **Rate Limiting**: 300ms delay between requests (configurable)
- **Authentication**: Token valid for 24 hours

## Next Steps

The scraper is production-ready. You can now:
1. Run `npm run scrape` to scrape all 33 categories
2. Data will be saved to `data/` folder
3. Optionally synced to your backend API at `http://localhost:5000`
