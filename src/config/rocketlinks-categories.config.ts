/**
 * RocketLinks Categories Configuration
 *
 * List of all thematic categories available in RocketLinks
 * Categories are prefixed by source:
 * - sw_ = SimilarWeb categories
 * - g_ = Google categories
 * - ms_ = Microsoft/other categories
 */

export interface RocketLinksCategory {
  id: string;
  name: string;
  source: 'similarweb' | 'google' | 'microsoft' | 'unknown';
}

// SimilarWeb Categories (sw_)
export const ROCKETLINKS_SW_CATEGORIES: RocketLinksCategory[] = [
  { id: 'sw_adult', name: 'Adult', source: 'similarweb' },
  { id: 'ms_adult', name: 'Adult (MS)', source: 'microsoft' },
  { id: 'sw_arts_and_entertainment', name: 'Arts and Entertainment', source: 'similarweb' },
  { id: 'sw_business_and_consumer_services', name: 'Business and Consumer Services', source: 'similarweb' },
  { id: 'sw_community_and_society', name: 'Community and Society', source: 'similarweb' },
  { id: 'sw_computers_electronics_and_technology', name: 'Computers, Electronics and Technology', source: 'similarweb' },
  { id: 'sw_e-commerce_and_shopping', name: 'E-commerce and Shopping', source: 'similarweb' },
  { id: 'sw_finance', name: 'Finance', source: 'similarweb' },
  { id: 'sw_food_and_drink', name: 'Food and Drink', source: 'similarweb' },
  { id: 'sw_gambling', name: 'Gambling', source: 'similarweb' },
  { id: 'sw_games', name: 'Games', source: 'similarweb' },
  { id: 'sw_health', name: 'Health', source: 'similarweb' },
  { id: 'sw_heavy_industry_and_engineering', name: 'Heavy Industry and Engineering', source: 'similarweb' },
  { id: 'sw_hobbies_and_leisure', name: 'Hobbies and Leisure', source: 'similarweb' },
  { id: 'sw_home_and_garden', name: 'Home and Garden', source: 'similarweb' },
  { id: 'sw_jobs_and_career', name: 'Jobs and Career', source: 'similarweb' },
  { id: 'sw_law_and_government', name: 'Law and Government', source: 'similarweb' },
  { id: 'sw_lifestyle', name: 'Lifestyle', source: 'similarweb' },
  { id: 'sw_news_and_media', name: 'News and Media', source: 'similarweb' },
  { id: 'sw_pets_and_animals', name: 'Pets and Animals', source: 'similarweb' },
  { id: 'sw_reference_materials', name: 'Reference Materials', source: 'similarweb' },
  { id: 'sw_science_and_education', name: 'Science and Education', source: 'similarweb' },
  { id: 'sw_sports', name: 'Sports', source: 'similarweb' },
  { id: 'sw_travel_and_tourism', name: 'Travel and Tourism', source: 'similarweb' },
  { id: 'sw_vehicles', name: 'Vehicles', source: 'similarweb' },
];

// Google Categories (g_)
export const ROCKETLINKS_GOOGLE_CATEGORIES: RocketLinksCategory[] = [
  { id: 'g_news_media_publications', name: 'News, Media & Publications', source: 'google' },
  { id: 'g_arts_entertainment', name: 'Arts & Entertainment', source: 'google' },
  { id: 'g_business_industrial', name: 'Business & Industrial', source: 'google' },
  { id: 'g_travel_tourism', name: 'Travel & Tourism', source: 'google' },
  { id: 'g_hobbies_leisure', name: 'Hobbies & Leisure', source: 'google' },
  { id: 'g_home_garden', name: 'Home & Garden', source: 'google' },
  { id: 'g_sports_fitness', name: 'Sports & Fitness', source: 'google' },
  { id: 'g_computers_consumer_electronics', name: 'Computers & Consumer Electronics', source: 'google' },
  { id: 'g_family_community', name: 'Family & Community', source: 'google' },
  { id: 'g_jobs_education', name: 'Jobs & Education', source: 'google' },
  { id: 'g_health', name: 'Health', source: 'google' },
  { id: 'g_internet_telecom', name: 'Internet & Telecom', source: 'google' },
  { id: 'g_food_groceries', name: 'Food & Groceries', source: 'google' },
  { id: 'g_beauty_personal_care', name: 'Beauty & Personal Care', source: 'google' },
  { id: 'g_blocked', name: 'Blocked', source: 'google' },
  { id: 'g_vehicles', name: 'Vehicles', source: 'google' },
  { id: 'g_real_estate', name: 'Real Estate', source: 'google' },
  { id: 'g_finance', name: 'Finance', source: 'google' },
  { id: 'g_law_government', name: 'Law & Government', source: 'google' },
  { id: 'g_retailers_general_merchandise', name: 'Retailers & General Merchandise', source: 'google' },
  { id: 'g_apparel', name: 'Apparel', source: 'google' },
  { id: 'g_dining_nightlife', name: 'Dining & Nightlife', source: 'google' },
  { id: 'g_occasions_gifts', name: 'Occasions & Gifts', source: 'google' },
  { id: 'g_unknown', name: 'Unknown', source: 'google' },
];

// Microsoft Categories (ms_)
export const ROCKETLINKS_MS_CATEGORIES: RocketLinksCategory[] = [
  { id: 'ms_adult', name: 'Adult', source: 'microsoft' },
  { id: 'ms_business', name: 'Business', source: 'microsoft' },
  { id: 'ms_arts', name: 'Arts', source: 'microsoft' },
  { id: 'ms_society', name: 'Society', source: 'microsoft' },
  { id: 'ms_sports', name: 'Sports', source: 'microsoft' },
  { id: 'ms_reference', name: 'Reference', source: 'microsoft' },
  { id: 'ms_recreation', name: 'Recreation', source: 'microsoft' },
  { id: 'ms_science', name: 'Science', source: 'microsoft' },
  { id: 'ms_regional', name: 'Regional', source: 'microsoft' },
  { id: 'ms_news', name: 'News', source: 'microsoft' },
  { id: 'ms_health', name: 'Health', source: 'microsoft' },
  { id: 'ms', name: 'General (MS)', source: 'microsoft' },
];

// All RocketLinks categories combined
export const ROCKETLINKS_CATEGORIES: RocketLinksCategory[] = [
  ...ROCKETLINKS_SW_CATEGORIES,
  ...ROCKETLINKS_GOOGLE_CATEGORIES,
  ...ROCKETLINKS_MS_CATEGORIES,
];

/**
 * Get category by ID
 */
export function getRocketLinksCategoryById(id: string): RocketLinksCategory | undefined {
  return ROCKETLINKS_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Get category by name
 */
export function getRocketLinksCategoryByName(name: string): RocketLinksCategory | undefined {
  return ROCKETLINKS_CATEGORIES.find(cat => cat.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get categories by source
 */
export function getRocketLinksCategoriesBySource(source: 'similarweb' | 'google' | 'microsoft'): RocketLinksCategory[] {
  return ROCKETLINKS_CATEGORIES.filter(cat => cat.source === source);
}

/**
 * Get all category IDs as a comma-separated string (for API calls)
 */
export function getAllRocketLinksCategoryIds(): string {
  return ROCKETLINKS_CATEGORIES.map(cat => cat.id).join(',');
}
