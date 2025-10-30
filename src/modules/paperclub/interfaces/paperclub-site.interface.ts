/**
 * Interfaces for Paper.club API responses and site data
 */

export interface PaperClubAPIResponse {
  currentPageResults: PaperClubSiteRaw[];
  totalResults?: number;
  currentPage?: number;
}

export interface PaperClubSiteRaw {
  name: string;
  hosting?: {
    country?: string;
    code?: string;
  };
  status?: string;
  articles?: Array<{
    sponsored?: boolean;
    words?: number;
    price?: number;
  }>;
  kpi?: {
    traffic?: number;
    trustFlow?: number;
    citationFlow?: number;
    ratio?: number;
    refDomain?: number;
    backLinks?: number;
    keywords?: number;
    domainRating?: number;
    domainAge?: number;
    maxTopicalTrustFlow?: string;
  };
  mainTopic?: {
    label?: string;
  };
  googleNews?: boolean;
  new?: boolean;
}

export interface PaperClubSite {
  // Core fields
  name: string;
  provider: string;

  // Hosting information
  hosting_country?: string;
  hosting_code?: string;
  status?: string;

  // Article metrics
  articles_sponsored?: number;
  articles_words?: number;
  articles_price?: number;

  // Traffic and SEO metrics
  traffic?: number;
  tf?: number; // Trust Flow
  cf?: number; // Citation Flow
  kpi_ratio?: number;
  domain_ref?: number;
  bl?: number; // Backlinks
  keywords?: number;
  domainRating?: number;
  domainAge?: number;

  // Topical information
  maxTopicalTrustFlow?: string;
  category?: string;

  // Flags
  googleNews?: number;
  new?: number;

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

export interface AuthResponse {
  token: string;
  expiresIn?: number;
}
