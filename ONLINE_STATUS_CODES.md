# Online Status Codes and HTTP Status Codes

## Overview
The scraper assigns an `online_status` code to each netlink based on what was found during scraping, and also captures the HTTP `status_code` from the page response.

## HTTP Status Code (`status_code`)

**New Feature**: The scraper now captures and sends the HTTP status code from the page response.

### Common HTTP Status Codes:
- **200** - OK (page loaded successfully)
- **301** - Moved Permanently (redirect)
- **302** - Found (temporary redirect)
- **403** - Forbidden (access denied)
- **404** - Not Found (page doesn't exist)
- **500** - Internal Server Error
- **503** - Service Unavailable

### Example Payload with Status Code:
```json
{
  "netlink_id": 7484,
  "link_type": "dofollow",
  "online_status": 1,
  "status_code": 200
}
```

### How to View Status Code:
When testing with `npm run test:single-netlink`, the status code is displayed:
```
✓ Page loaded successfully
✓ HTTP Status Code: 200
```

---

## Online Status Codes (`online_status`)

| Code | Name | Description | API Payload Example |
|------|------|-------------|---------------------|
| **1** | Exact Match Found | The exact landing page URL was found on the page | `online_status: 1, link_type: "dofollow"` |
| **2** | No Match Found | Site loaded successfully but no matching link or domain found | `online_status: 2, link_type: "unknown"` |
| **3** | Site Not Accessible | Failed to scrape (timeout, DNS error, site down, etc.) | `online_status: 3, link_type: "unknown"` |
| **4** | Domain Match Only | Found a link with the same domain but different URL path | `online_status: 4, link_type: "dofollow"` |

## Detailed Explanations

### Status 1: Exact Match Found ✅
**When**: The exact landing page URL (or very close match) was found on the scraped page.

**Example**:
- Landing page: `https://www.district-immo.com/agences/saint-germain/`
- Found link: `https://www.district-immo.com/agences/saint-germain/`
- Result: Status 1 (exact match)

**Match Types**:
- `exact` - Normalized URLs are identical
- `domain` - Link contains landing page URL
- `subdomain` - Landing page URL contains link
- `partial` - Same domain, similar paths

**API Payload**:
```json
{
  "netlink_id": 7484,
  "link_type": "dofollow",
  "online_status": 1,
  "status_code": 200
}
```

**Log Output**:
```
LINK MATCHED: true
MATCH TYPE: exact
LINK TYPE: dofollow
LINK HREF: https://www.district-immo.com/agences/saint-germain/
```

---

### Status 4: Domain Match Only ⚠️
**When**: A link with the same domain was found, but the URL path doesn't match the landing page.

**Example**:
- Landing page: `https://www.district-immo.com/agences/saint-germain/`
- Found link: `https://www.district-immo.com/` (just homepage)
- Result: Status 4 (domain match)

**OR**:
- Landing page: `https://www.district-immo.com/agences/saint-germain/`
- Found link: `https://www.district-immo.com/agences/paris/` (different office)
- Result: Status 4 (domain match)

**Meaning**:
- The site links to the correct domain
- But not to the specific page that was purchased/expected
- Could indicate the link was changed or moved

**API Payload**:
```json
{
  "netlink_id": 7484,
  "link_type": "dofollow",
  "online_status": 4
}
```

**Log Output**:
```
LINK MATCHED: false
DOMAIN MATCH FOUND: YES
DOMAIN LINK TYPE: dofollow
DOMAIN LINK HREF: https://www.district-immo.com/
NOTE: Domain found but exact landing page URL not found
```

---

### Status 2: No Match Found ❌
**When**: Site loaded successfully but no matching link or domain was found.

**Example**:
- Landing page: `https://www.district-immo.com/agences/saint-germain/`
- Found links: `https://example.com/`, `https://other-site.com/`
- Result: Status 2 (no match)

**Meaning**:
- The link was probably removed completely
- Or the site never had the link
- Site is accessible but no backlink exists

**API Payload**:
```json
{
  "netlink_id": 7484,
  "link_type": "unknown",
  "online_status": 2
}
```

**Log Output**:
```
LINK MATCHED: false
DOMAIN MATCH FOUND: NO
```

---

### Status 3: Site Not Accessible 🔴
**When**: Failed to scrape the page (errors during loading).

**Common Reasons**:
- Navigation timeout (site too slow or down)
- DNS error (domain doesn't exist)
- Connection refused (server offline)
- SSL errors
- Network errors

**Example Errors**:
- `Navigation timeout of 30000 ms exceeded`
- `net::ERR_NAME_NOT_RESOLVED`
- `net::ERR_CONNECTION_REFUSED`

**API Payload**:
```json
{
  "netlink_id": 7484,
  "link_type": "unknown",
  "online_status": 3
}
```

**Log Output**:
```
STATUS: FAILED
ERROR: Navigation timeout of 30000 ms exceeded
```

---

## Decision Flow

```
Start Scraping
    |
    v
Can we load the page?
    |
    +-- NO --> Status 3 (Site Not Accessible)
    |
    +-- YES --> Search all links on page
                    |
                    v
                Found exact landing page URL?
                    |
                    +-- YES --> Status 1 (Exact Match Found)
                    |
                    +-- NO --> Found same domain?
                                    |
                                    +-- YES --> Status 4 (Domain Match Only)
                                    |
                                    +-- NO --> Status 2 (No Match Found)
```

## Use Cases

### For SEO / Link Building
- **Status 1**: ✅ Perfect - Link is active and correct
- **Status 4**: ⚠️ Warning - Link exists but points to wrong page (contact publisher)
- **Status 2**: ❌ Problem - Link removed (contact publisher or request refund)
- **Status 3**: 🔴 Issue - Can't verify (site down, retry later)

### For Monitoring
- Track status changes over time
- Alert when status changes from 1 → 4 or 1 → 2
- Retry status 3 (might be temporary)

### For Reporting
- **Active Links**: Count of status 1
- **Domain Links**: Count of status 4 (needs attention)
- **Missing Links**: Count of status 2 (needs action)
- **Unreachable Sites**: Count of status 3 (needs retry)

## Examples from Real Scraping

### Example 1: Perfect Link
```
URL: https://ilbi.org/marche-immobilier-a-paris-6eme/
LANDING PAGE: https://www.district-immo.com/agences/saint-germain/
STATUS: SUCCESS
LINK MATCHED: true
MATCH TYPE: exact
LINK TYPE: dofollow
→ online_status: 1
```

### Example 2: Domain Only
```
URL: https://example-blog.com/article-123/
LANDING PAGE: https://my-site.com/specific-page/
STATUS: SUCCESS
LINK MATCHED: false
DOMAIN MATCH FOUND: YES
DOMAIN LINK HREF: https://my-site.com/
→ online_status: 4
```

### Example 3: No Link
```
URL: https://example-blog.com/article-456/
LANDING PAGE: https://my-site.com/specific-page/
STATUS: SUCCESS
LINK MATCHED: false
DOMAIN MATCH FOUND: NO
→ online_status: 2
```

### Example 4: Site Down
```
URL: https://broken-site.com/article/
LANDING PAGE: https://my-site.com/specific-page/
STATUS: FAILED
ERROR: Navigation timeout of 30000 ms exceeded
→ online_status: 3
```

## Summary Table

| Status | Link Found? | Domain Found? | Site Accessible? | Action Needed |
|--------|-------------|---------------|------------------|---------------|
| 1 | ✅ Yes | ✅ Yes | ✅ Yes | None - Perfect! |
| 4 | ❌ No | ✅ Yes | ✅ Yes | Contact publisher - wrong URL |
| 2 | ❌ No | ❌ No | ✅ Yes | Contact publisher - link missing |
| 3 | ❓ Unknown | ❓ Unknown | ❌ No | Retry later |
