/**
 * Interfaces for RocketLinks API responses and site data
 */

export interface RocketLinksAuthResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface RocketLinksSiteRaw {
  // Core info
  domain: string;
  url: string;

  // Majestic metrics
  tf?: number; // Trust Flow
  cf?: number; // Citation Flow
  backlinks?: number;
  refDomains?: number;

  // Moz metrics
  da?: number; // Domain Authority
  pa?: number; // Page Authority

  // SEMRush metrics
  semrushKeywords?: number;
  semrushTraffic?: number;
  semrushValue?: number;

  // SimilarWeb metrics
  similarwebTraffic?: number;
  similarwebOrganicTraffic?: number;
  similarwebCategory?: string;

  // Ahrefs metrics
  ahrefsDR?: number; // Domain Rating
  ahrefsTraffic?: number;
  ahrefsKeywords?: number;
  ahrefsValue?: number;

  // Pricing
  price?: number;
  priceRecommended?: string; // Full string like "4 011 € pour 1200 mots"

  // Categories
  topicalTrustFlow?: string;
  siteCategories?: string;

  // Other info
  doFollow?: boolean;
  waybackAge?: number;
  googleIndexed?: number;

  [key: string]: any; // Allow additional fields
}

export interface RocketLinksSite {
  // Core fields
  name: string;
  provider: string;

  // Domain information
  domain?: string;
  url?: string;
  status?: string;

  // Pricing
  price?: number;

  // Traffic and SEO metrics
  traffic?: number;
  tf?: number; // Trust Flow
  cf?: number; // Citation Flow
  da?: number; // Domain Authority
  dr?: number; // Domain Rating
  domain_ref?: number;
  bl?: number; // Backlinks
  keywords?: number;

  // Category
  category?: string;

  // Generated fields
  link_ahref: string;
  entry_date: string;

  // BQS scoring fields (optional)
  bqs_score?: number;
  bqs_score_info?: {
    bqs_quality_tier?: string;
    bqs_authority?: number;
    bqs_consistency_penalty?: number;
    bqs_passed_filter?: boolean;
    bqs_filter_reason?: string;
    bqs_roi?: number;
  };
}

export interface RocketLinksCategory {
  id: string;
  name: string;
  slug?: string;
}

export interface RocketLinksAPIResponse {
  sites: RocketLinksSiteRaw[];
  totalResults?: number;
  currentPage?: number;
  totalPages?: number;
}
