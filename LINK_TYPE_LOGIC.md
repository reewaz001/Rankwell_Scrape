# Link Type Detection Logic

## Overview
The scraper determines whether a link is "dofollow" or "nofollow" based on the `rel` attribute of the `<a>` tag.

## Rules

### Simple Logic:
- ✅ **If `rel` contains "nofollow"** (in any combination) → `link_type = "nofollow"`
- ✅ **Otherwise** (no `rel` attribute OR `rel` without "nofollow") → `link_type = "dofollow"`

## Examples

### NoFollow Links
```html
<!-- Pure nofollow -->
<a href="..." rel="nofollow">Link</a>
→ link_type = "nofollow"

<!-- Nofollow with other attributes -->
<a href="..." rel="nofollow ugc">Link</a>
→ link_type = "nofollow"

<!-- Nofollow with sponsored -->
<a href="..." rel="nofollow sponsored">Link</a>
→ link_type = "nofollow"

<!-- Any combination containing nofollow -->
<a href="..." rel="ugc nofollow">Link</a>
→ link_type = "nofollow"
```

### DoFollow Links
```html
<!-- No rel attribute -->
<a href="...">Link</a>
→ link_type = "dofollow"

<!-- Empty rel -->
<a href="..." rel="">Link</a>
→ link_type = "dofollow"

<!-- Other rel values without nofollow -->
<a href="..." rel="ugc">Link</a>
→ link_type = "dofollow"

<a href="..." rel="sponsored">Link</a>
→ link_type = "dofollow"

<a href="..." rel="ugc sponsored">Link</a>
→ link_type = "dofollow"
```

## Implementation

### During Scraping (extractData method)
```typescript
// Default is dofollow
let link_type = 'dofollow';

// If rel exists and contains "nofollow" (case-insensitive), it's nofollow
if (link.rel && link.rel.toLowerCase().includes('nofollow')) {
  link_type = 'nofollow';
}
```

### When Sending to API
The `link_type` is included in the batch upsert request:

```json
{
  "items": [
    {
      "netlink_id": 7484,
      "link_type": "dofollow",  // or "nofollow"
      "online_status": 1
    }
  ]
}
```

## API Values

The following values are sent to the API:

| Value | Meaning |
|-------|---------|
| `"dofollow"` | Link has no `rel` attribute OR `rel` doesn't contain "nofollow" |
| `"nofollow"` | Link has `rel` attribute that contains "nofollow" |
| `"unknown"` | Link was found but couldn't determine type (rare edge case) |

## Log Output

The scraper logs the link type for each matched link:

```
✓ Found matching link: https://district-immo.com/agences/saint-germain (exact match)
  Link type: dofollow (rel="none")
```

or

```
✓ Found matching link: https://district-immo.com/agences/saint-germain (exact match)
  Link type: nofollow (rel="nofollow ugc")
```

## SEO Context

### DoFollow Links
- Pass PageRank/link juice
- Help with SEO
- Tell search engines to follow and credit the link
- Default behavior of links

### NoFollow Links
- Don't pass PageRank/link juice
- Don't help with SEO directly
- Tell search engines not to follow or credit the link
- Used for paid links, user-generated content, untrusted content

## Common `rel` Attribute Values

| Attribute | Meaning | Link Type in Our System |
|-----------|---------|------------------------|
| (none) | Normal link | `dofollow` |
| `nofollow` | Don't follow this link | `nofollow` |
| `ugc` | User-Generated Content | `dofollow` |
| `sponsored` | Paid/sponsored link | `dofollow` |
| `nofollow ugc` | User content, don't follow | `nofollow` |
| `nofollow sponsored` | Paid link, don't follow | `nofollow` |

**Note**: The presence of "nofollow" is what matters. Any other attributes are ignored for determining the link type.
