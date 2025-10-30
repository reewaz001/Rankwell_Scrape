# Quick Start Guide

## 1. Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (optional - for future browser scraping)
npx playwright install chromium
```

## 2. Configuration

The `.env` file is already configured with Paper.club credentials.

## 3. Run the Scraper

### Basic Usage

```bash
# Scrape all categories with BQS scoring
npm run scrape
```

### Advanced Usage

```bash
# Skip BQS scoring (faster)
npm run scrape -- --no-bqs

# Skip database sync (only save to JSON file)
npm run scrape -- --no-db

# Truncate database before scraping
npm run scrape -- --truncate

# Skip file saving (only send to database)
npm run scrape -- --no-save
```

## 4. Output

### JSON Files
Scraped data is saved to `data/paperclub_data_TIMESTAMP.json`

### Database
Data is automatically synced to your backend API at `http://localhost:5000/backlinks/add`

## 5. Project Structure

```
src/
├── modules/paperclub/        # Paper.club scraping module
│   ├── services/            # API, scraper, transformer services
│   ├── interfaces/          # TypeScript interfaces
│   └── dto/                 # Data validation
├── scoring/                 # BQS calculator
├── common/                  # Shared services (database)
├── config/                  # Configuration (categories)
├── cli/                     # CLI scripts
└── main.ts                  # Bootstrap
```

## 6. Key Features

### API-Based Scraping
- No browser automation needed for Paper.club
- Fast and efficient API requests
- Automatic pagination handling

### BQS Scoring
- Automatic quality scoring for each site
- Filters low-quality backlinks
- Calculates ROI based on price

### Reusable Architecture
- NestJS dependency injection
- Modular services
- Easy to extend for new providers

## 7. Development

```bash
# Run in development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Format code
npm run format

# Lint code
npm run lint
```

## 8. Troubleshooting

### Authentication Error
- Check credentials in `.env`
- Verify Paper.club account is active

### Database Connection Error
- Ensure backend API is running at `http://localhost:5000`
- Check `BACKEND_API_URL` in `.env`

### No Data Scraped
- Check internet connection
- Verify Paper.club API is accessible
- Check logs in `logs/` directory

## 9. Next Steps

### Add Browser Scraping (Playwright)
For sites that need browser automation:

```typescript
// Create browser service
import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';

@Injectable()
export class BrowserService {
  async launchBrowser() {
    return await chromium.launch({ headless: true });
  }
}
```

### Add Lightpanda Integration
Lightweight alternative to Playwright:

```bash
npm install lightpanda-playwright
```

```typescript
import { chromium } from 'lightpanda-playwright';
```

## 10. Support

For issues or questions:
- Check README.md for detailed documentation
- Review src/modules/paperclub/ for implementation details
- Examine logs/ directory for error messages
