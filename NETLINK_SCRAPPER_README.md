
  npm run scrape:rocketlinks -- --all

  This will:
  1. Login to RocketLinks
  2. For each of 61 categories:
    - Scrape page 1, 2, 3... until no more results
    - Save 100 sites to DB after each page
    - Wait 5 seconds, then move to next category

  Flow:
  CATEGORY 1/61: Adult (sw_adult)
    Page 1: Found 100 sites → Saved to DB
    Page 2: Found 100 sites → Saved to DB
    ...
    Page 8: No results → Done
    Waiting 5s...

  CATEGORY 2/61: Adult (MS) (ms_adult)
    Page 1: Found 100 sites → Saved to DB
    ...

  ... continues through all 61 categories

  Other commands:
  npm run scrape:rocketlinks                        # Single category (sw_adult)
  npm run scrape:rocketlinks -- --category g_health # Specific category
  npm run scrape:rocketlinks -- --all --no-api      # All categories, no DB