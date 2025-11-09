# Rel Attribute & Link Type Update

## What Changed

The scraper now extracts the `rel` attribute from found `<a>` tags and determines the `link_type`.

## New Fields in Response

### Before
```json
{
  "foundLink": {
    "href": "https://example.com",
    "text": "Click here",
    "outerHTML": "<a href='...'>Click here</a>",
    "matched": true,
    "matchType": "domain"
  }
}
```

### After
```json
{
  "foundLink": {
    "href": "https://example.com",
    "text": "Click here",
    "outerHTML": "<a href='...'>Click here</a>",
    "matched": true,
    "matchType": "domain",
    "rel": "nofollow",
    "link_type": "nofollow"
  }
}
```

## Link Type Logic

### Case 1: No `rel` attribute
```html
<a href="https://example.com">Link</a>
```
**Result:**
```json
{
  "rel": undefined,
  "link_type": "DoFollow"
}
```

### Case 2: Single `rel` value
```html
<a href="https://example.com" rel="nofollow">Link</a>
```
**Result:**
```json
{
  "rel": "nofollow",
  "link_type": "nofollow"
}
```

### Case 3: Multiple `rel` values (space-separated)
```html
<a href="https://example.com" rel="nofollow ugc">Link</a>
```
**Result:**
```json
{
  "rel": "nofollow ugc",
  "link_type": "nofollow ugc"
}
```

### Case 4: Sponsored link
```html
<a href="https://example.com" rel="nofollow sponsored">Link</a>
```
**Result:**
```json
{
  "rel": "nofollow sponsored",
  "link_type": "nofollow sponsored"
}
```

## Common `rel` Values

### DoFollow (No rel attribute)
```json
"link_type": "DoFollow"
```
- Link passes PageRank/link equity
- Default behavior when no `rel` attribute

### NoFollow
```json
"link_type": "nofollow"
```
- Link does not pass PageRank
- Common for user-generated content

### Sponsored
```json
"link_type": "sponsored"
```
- Paid/sponsored link
- Google's preferred way to mark ads

### UGC (User Generated Content)
```json
"link_type": "ugc"
```
- Content created by users
- Forum posts, comments, etc.

### Multiple Values
```json
"link_type": "nofollow ugc"
"link_type": "nofollow sponsored"
```
- Multiple attributes separated by space
- All values preserved

## Example Output

### Example 1: DoFollow Link
```json
{
  "url": "https://publisher.com/article",
  "landingPage": "https://target.com",
  "success": true,
  "foundLink": {
    "href": "https://target.com/page",
    "text": "Visit Site",
    "outerHTML": "<a href=\"https://target.com/page\">Visit Site</a>",
    "matched": true,
    "matchType": "domain",
    "link_type": "DoFollow"
  }
}
```

### Example 2: NoFollow Link
```json
{
  "url": "https://publisher.com/article",
  "landingPage": "https://target.com",
  "success": true,
  "foundLink": {
    "href": "https://target.com/page",
    "text": "Visit Site",
    "outerHTML": "<a href=\"https://target.com/page\" rel=\"nofollow\">Visit Site</a>",
    "matched": true,
    "matchType": "domain",
    "rel": "nofollow",
    "link_type": "nofollow"
  }
}
```

### Example 3: Sponsored Link
```json
{
  "url": "https://publisher.com/article",
  "landingPage": "https://target.com",
  "success": true,
  "foundLink": {
    "href": "https://target.com/page",
    "text": "Sponsored Link",
    "outerHTML": "<a href=\"https://target.com/page\" rel=\"nofollow sponsored\">Sponsored Link</a>",
    "matched": true,
    "matchType": "domain",
    "rel": "nofollow sponsored",
    "link_type": "nofollow sponsored"
  }
}
```

## Analyzing Results

### Count DoFollow vs NoFollow

```typescript
const results = // ... scraped data

const doFollowCount = results.filter(r =>
  r.foundLink?.matched && r.foundLink.link_type === 'DoFollow'
).length;

const noFollowCount = results.filter(r =>
  r.foundLink?.matched && r.foundLink.link_type?.includes('nofollow')
).length;

console.log(`DoFollow: ${doFollowCount}`);
console.log(`NoFollow: ${noFollowCount}`);
```

### Filter by Link Type

```typescript
// Get only DoFollow links
const doFollowLinks = results.filter(r =>
  r.foundLink?.link_type === 'DoFollow'
);

// Get only NoFollow links
const noFollowLinks = results.filter(r =>
  r.foundLink?.link_type?.includes('nofollow')
);

// Get sponsored links
const sponsoredLinks = results.filter(r =>
  r.foundLink?.link_type?.includes('sponsored')
);
```

### Group by Link Type

```typescript
const linkTypeStats = results.reduce((acc, result) => {
  if (result.foundLink?.matched) {
    const type = result.foundLink.link_type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
  }
  return acc;
}, {} as Record<string, number>);

console.log('Link Type Distribution:', linkTypeStats);
// Output: { "DoFollow": 150, "nofollow": 45, "nofollow sponsored": 10, ... }
```

## Testing

Run the scraper and check the new fields:

```bash
npm run test:netlink-scraper sample
```

Look for:
```json
{
  "foundLink": {
    ...
    "rel": "nofollow",
    "link_type": "nofollow"
  }
}
```

## Impact on SEO Analysis

Now you can:
- ✅ Identify which backlinks are DoFollow (pass link equity)
- ✅ Identify which are NoFollow (don't pass link equity)
- ✅ Identify sponsored/paid links
- ✅ Calculate DoFollow vs NoFollow ratio
- ✅ Prioritize which netlinks provide SEO value

## Summary

**New Fields:**
- `rel`: Raw rel attribute value (or undefined)
- `link_type`:
  - `"DoFollow"` if no rel attribute
  - Rel value(s) if rel attribute exists (e.g., "nofollow", "nofollow ugc")

**Backwards Compatible:**
- Existing fields remain unchanged
- Only adds new optional fields
- No breaking changes
