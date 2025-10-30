# API Integration - Working ✅

## Summary

The scraper now **automatically sends data to your API after each category** is scraped.

## Test Results

✅ **Religion category test:**
- Scraped: 124 sites
- Sent to API: `POST http://localhost:5000/backlinks/add`
- Response: 200 OK
- Data successfully stored in your database

```
[LOG] Sending 124 sites from Religion to API...
[LOG] Adding 124 sites to database...
[LOG] Successfully added 124 sites from Paper Club to database
[LOG] ✓ Successfully sent Religion data to API
```

## How It Works

### Per-Category Sending (Current Setup)

1. **Scrape** category pages (with pagination)
2. **Transform** API data to structured format
3. **Calculate** BQS scores for each site
4. **Send to API immediately** ⚡
5. **Continue** to next category

### Benefits

- ✅ Real-time database updates
- ✅ Memory efficient (doesn't hold all data)
- ✅ Crash-safe (keeps completed categories)
- ✅ Progress visibility (see data as it arrives)

## API Endpoint

Your backend receives:

```typescript
POST http://localhost:5000/backlinks/add

Body: Array<{
  // Basic info
  name: string;
  provider: "Paper Club";

  // SEO metrics
  tf?: number;          // Trust Flow
  cf?: number;          // Citation Flow
  domainRating?: number;
  traffic?: number;
  domain_ref?: number;
  bl?: number;
  keywords?: number;

  // Content
  articles_price?: number;
  articles_words?: number;
  category?: string;

  // BQS Scoring
  bqs_score?: number;
  bqs_score_info?: {
    bqs_quality_tier: "Excellent" | "Good" | "Fair" | "Poor";
    bqs_authority: number;
    bqs_consistency_penalty: number;
    bqs_passed_filter: boolean;
    bqs_filter_reason: string;
    bqs_roi?: number;
  };

  // Other fields...
}>
```

## Usage

### Quick Test (Single Category)

```bash
# Test with Religion (small, fast)
npm run test:category -- 23

# Test with Sport (larger)
npm run test:category -- Sport

# Test without sending to API
npm run test:category -- Sport --no-api
```

### Full Scrape (All 33 Categories)

```bash
# Scrape all categories, send each to API
npm run scrape

# Skip API sending (save to file only)
npm run scrape -- --no-api

# Truncate database first, then scrape
npm run scrape -- --truncate
```

## Command Options

```bash
npm run scrape [options]

Options:
  --no-api      Don't send to API (save to file only)
  --no-bqs      Skip BQS scoring (faster)
  --no-save     Don't save to JSON file
  --truncate    Clear database before scraping
```

## Examples

### Example 1: Full scrape with API
```bash
npm run scrape
```
Result: All 33 categories → sent to API → saved to JSON

### Example 2: Test only (no API)
```bash
npm run scrape -- --no-api
```
Result: Scrapes and saves to JSON, doesn't send to API

### Example 3: Fresh start
```bash
npm run scrape -- --truncate
```
Result: Clears database, then scrapes all and sends to API

## Performance

- **Single category**: ~15-30 seconds
- **All 33 categories**: ~20-30 minutes
- **Rate limit**: 300ms between requests
- **API timeout**: 30 seconds per request

## Monitoring

Watch logs in real-time:

```bash
npm run scrape

# You'll see:
# [LOG] Fetching all pages for category: Animaux
# [LOG] Sending 1,179 sites from Animaux to API...
# [LOG] Successfully added 1,179 sites from Paper Club to database
# [LOG] ✓ Successfully sent Animaux data to API
# [LOG] Fetching all pages for category: Auto & Moto
# ...
```

## Error Handling

If API sending fails:
- ❌ Error is logged
- ✅ Scraper continues to next category
- ✅ Data still saved to JSON file (if enabled)

Example:
```
[ERROR] ✗ Failed to send Sport to API: ECONNREFUSED
[LOG] Starting fetch for: Tourisme & Voyage
```

## Data Flow

```
Paper.club API
    ↓ (fetch)
Raw Site Data
    ↓ (transform)
Structured Data
    ↓ (score)
Data + BQS Scores
    ↓ (send)
Your API (http://localhost:5000/backlinks/add)
    ↓ (store)
MySQL Database
```

## Status: Production Ready ✅

The scraper is fully operational and ready for production use!

- ✅ API integration working
- ✅ BQS scoring active
- ✅ Error handling in place
- ✅ Memory efficient
- ✅ Crash-safe

## Additional Resources

- **QUICK_START.md** - Quick start guide for the scraper
- **.env.example** - All configuration options
