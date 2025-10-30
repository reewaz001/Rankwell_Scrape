# Quick Start Guide

Get started with Rankwell Scraper in 5 minutes.

## 1. Install Dependencies

```bash
cd Rankwell_Scrape
npm install
```

## 2. Configure Environment

Copy and edit `.env`:

```bash
cp .env.example .env
```

**Minimum required settings:**

```env
# Paper.club credentials
PAPER_CLUB_EMAIL=your-email@example.com
PAPER_CLUB_PASSWORD=your-password

# Backend API
BACKEND_API_URL=http://localhost:5000
```

## 3. Test Your Setup

### Test Paper.club Authentication

```bash
npm run test:auth
```

**Expected output:**
```
✅ Authentication successful!
Token: eyJ0eXAiOiJKV1QiLCJh...
```

### Test Single Category Scraping

```bash
npm run test:category -- Religion
```

**Expected output:**
```
Category: Religion
Scraped 124 sites
✓ Successfully sent Religion data to API
```

## 4. Run Full Scraper

### All Categories (Production)

```bash
npm run scrape
```

This will:
- Scrape all 33 Paper.club categories
- Calculate BQS scores for each site
- Send data to your API after each category
- Save JSON backup to `./data/`
- Take ~20-30 minutes to complete

### Options

```bash
# Skip API sending (test mode)
npm run scrape -- --no-api

# Skip BQS scoring (faster)
npm run scrape -- --no-bqs

# Clear database before scraping
npm run scrape -- --truncate
```

## 5. Common Commands

```bash
# Scraping
npm run scrape                    # Full scrape (all categories)
npm run test:category -- Sport    # Test single category

# Testing
npm run test:auth                 # Test Paper.club login

# Development
npm run start:dev                 # Start NestJS in watch mode
npm run build                     # Build for production
```

## Project Structure

```
Rankwell_Scrape/
├── src/
│   ├── modules/paperclub/       # Paper.club scraper
│   │   ├── services/            # API, scraper, transformer
│   │   └── interfaces/          # TypeScript types
│   ├── scoring/                 # BQS calculator
│   ├── config/                  # Categories config
│   └── cli/                     # CLI scripts
├── data/                        # Output JSON files
├── .env                         # Configuration
└── package.json                 # Dependencies
```

## API Endpoint

Your backend should implement:

```typescript
POST http://localhost:5000/backlinks/add

Body: Array<{
  name: string;
  provider: "Paper Club";
  tf?: number;
  cf?: number;
  domainRating?: number;
  traffic?: number;
  bqs_score?: number;
  // ... more fields
}>

Response: { success: boolean, message: string }
```

## Documentation

- **API_INTEGRATION.md** - How data is sent to your backend
- **.env.example** - All configuration options

## Troubleshooting

### "Authentication failed"
- Check credentials in `.env`
- Ensure Paper.club account is active

### API errors (ECONNREFUSED)
- Ensure backend is running at `http://localhost:5000`
- Check `BACKEND_API_URL` in `.env`

## Next Steps

1. ✅ Test authentication: `npm run test:auth`
2. ✅ Test single category: `npm run test:category -- Religion`
3. ✅ Run full scrape: `npm run scrape`

## Support

- **Issues:** Check error messages carefully
- **Logs:** Check `./logs/scraper.log`

## Summary

✅ **API-based scraping:** Paper.club REST API integration
✅ **Real-time API sync:** Data sent after each category
✅ **BQS scoring:** Automatic quality scoring for all sites
✅ **Production-ready:** Tested and working

Start scraping:
```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run test:auth
npm run scrape
```

Happy scraping! 🚀
