import type { LeadFeatures } from '../services/lead-scoring-ml.service';

export interface LeadData {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  insuranceType?: string | null;
  source: string;
  metadata?: any;
  createdAt: Date;
  
  // Agent assignment data (optional)
  agentId?: string | null;
  assignedAt?: Date | null;
  acceptedAt?: Date | null;
}

export interface AgentData {
  id: string;
  averageResponseTime: number;
  conversionRate: number;
  rating: number;
}

// Label encoders (should match training data)
const SOURCE_ENCODERS: Record<string, number> = {
  'website': 0,
  'mobile_app': 1,
  'referral': 2,
  'social_media': 3,
  'email_campaign': 4,
  'display_ad': 5,
  'print_ad': 6,
  'billboard': 7,
  'cold_lead': 8,
  'UNKNOWN': 9
};

const INSURANCE_TYPE_ENCODERS: Record<string, number> = {
  'AUTO': 0,
  'HOME': 1,
  'LIFE': 2,
  'HEALTH': 3,
  'COMMERCIAL': 4,
  'UNKNOWN': 5
};

const STATE_ENCODERS: Record<string, number> = {
  'CA': 0, 'TX': 1, 'FL': 2, 'NY': 3, 'PA': 4,
  'IL': 5, 'OH': 6, 'GA': 7, 'NC': 8, 'MI': 9,
  'UNKNOWN': 10
  // Add more states as needed
};

const BROWSER_ENCODERS: Record<string, number> = {
  'chrome': 0,
  'firefox': 1,
  'safari': 2,
  'edge': 3,
  'other': 4,
  'unknown': 5
};

const UTM_SOURCE_ENCODERS: Record<string, number> = {
  'google': 0,
  'facebook': 1,
  'twitter': 2,
  'linkedin': 3,
  'email': 4,
  'direct': 5,
  'unknown': 6
};

const UTM_MEDIUM_ENCODERS: Record<string, number> = {
  'cpc': 0,
  'organic': 1,
  'social': 2,
  'email': 3,
  'referral': 4,
  'unknown': 5
};

const HIGH_ENGAGEMENT_SOURCES = ['referral', 'website', 'mobile_app'];
const MEDIUM_ENGAGEMENT_SOURCES = ['social_media', 'email_campaign', 'display_ad'];
const LOW_ENGAGEMENT_SOURCES = ['print_ad', 'billboard', 'cold_lead'];

const GENERIC_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com'
];

export class FeatureExtractor {
  static extractFeatures(lead: LeadData, agent?: AgentData): LeadFeatures {
    const metadata = lead.metadata || {};
    const createdAt = new Date(lead.createdAt);

    // Contact completeness features
    const has_email = lead.email ? 1 : 0;
    const has_phone = lead.phone ? 1 : 0;
    const has_full_name = (lead.firstName && lead.lastName) ? 1 : 0;
    const has_address = (lead.street && lead.city && lead.state) ? 1 : 0;
    const has_zipcode = lead.zipCode ? 1 : 0;
    const contact_completeness = (has_email + has_phone + has_full_name + has_address + has_zipcode) / 5.0;

    // Engagement features
    const form_completed = metadata.form_completed ? 1 : 0;
    const requested_quote = metadata.requested_quote ? 1 : 0;
    const pages_visited = parseInt(metadata.pages_visited || '0', 10);
    const time_on_site = parseInt(metadata.time_on_site || '0', 10);
    const return_visitor = metadata.return_visitor ? 1 : 0;
    const mobile_device = metadata.mobile_device ? 1 : 0;
    
    const source_engagement_level = this.getSourceEngagementLevel(lead.source);

    // Temporal features
    const hour_of_day = createdAt.getHours();
    const day_of_week = createdAt.getDay();
    const is_weekend = (day_of_week === 0 || day_of_week === 6) ? 1 : 0;
    const is_business_hours = (hour_of_day >= 9 && hour_of_day <= 17) ? 1 : 0;
    const month = createdAt.getMonth() + 1;
    const quarter = Math.floor(month / 3) + 1;

    // Email features
    const is_generic_email = this.isGenericEmail(lead.email);

    // Agent features
    const agent_avg_response_time = agent?.averageResponseTime || 0;
    const agent_conversion_rate = agent?.conversionRate || 0;
    const agent_rating = agent?.rating || 0;

    // Timing features
    const time_to_assignment = this.calculateTimeToAssignment(createdAt, lead.assignedAt);
    const time_to_acceptance = this.calculateTimeToAcceptance(lead.assignedAt, lead.acceptedAt);

    // Categorical encodings
    const source_encoded = this.encodeSource(lead.source);
    const insuranceType_encoded = this.encodeInsuranceType(lead.insuranceType);
    const state_encoded = this.encodeState(lead.state);
    const browser_encoded = this.encodeBrowser(metadata.browser);
    const utm_source_encoded = this.encodeUtmSource(metadata.utm_source);
    const utm_medium_encoded = this.encodeUtmMedium(metadata.utm_medium);
    const utm_campaign_encoded = 0; // Simplified

    return {
      has_email,
      has_phone,
      has_full_name,
      has_address,
      has_zipcode,
      contact_completeness,
      form_completed,
      requested_quote,
      pages_visited,
      time_on_site,
      return_visitor,
      mobile_device,
      source_engagement_level,
      hour_of_day,
      day_of_week,
      is_weekend,
      is_business_hours,
      month,
      quarter,
      is_generic_email,
      agent_avg_response_time,
      agent_conversion_rate,
      agent_rating,
      time_to_assignment,
      time_to_acceptance,
      source_encoded,
      insuranceType_encoded,
      state_encoded,
      browser_encoded,
      utm_source_encoded,
      utm_medium_encoded,
      utm_campaign_encoded
    };
  }

  private static getSourceEngagementLevel(source: string): number {
    if (HIGH_ENGAGEMENT_SOURCES.includes(source)) return 3;
    if (MEDIUM_ENGAGEMENT_SOURCES.includes(source)) return 2;
    if (LOW_ENGAGEMENT_SOURCES.includes(source)) return 1;
    return 0;
  }

  private static isGenericEmail(email?: string | null): number {
    if (!email) return 0;
    
    const domain = email.split('@')[1];
    if (!domain) return 0;
    
    return GENERIC_EMAIL_DOMAINS.includes(domain.toLowerCase()) ? 1 : 0;
  }

  private static calculateTimeToAssignment(createdAt: Date, assignedAt?: Date | null): number {
    if (!assignedAt) return -1;
    
    const diff = new Date(assignedAt).getTime() - createdAt.getTime();
    return diff / (1000 * 60 * 60); // hours
  }

  private static calculateTimeToAcceptance(assignedAt?: Date | null, acceptedAt?: Date | null): number {
    if (!assignedAt || !acceptedAt) return -1;
    
    const diff = new Date(acceptedAt).getTime() - new Date(assignedAt).getTime();
    return diff / (1000 * 60 * 60); // hours
  }

  private static encodeSource(source: string): number {
    return SOURCE_ENCODERS[source] ?? SOURCE_ENCODERS['UNKNOWN'];
  }

  private static encodeInsuranceType(type?: string | null): number {
    if (!type) return INSURANCE_TYPE_ENCODERS['UNKNOWN'];
    return INSURANCE_TYPE_ENCODERS[type] ?? INSURANCE_TYPE_ENCODERS['UNKNOWN'];
  }

  private static encodeState(state?: string | null): number {
    if (!state) return STATE_ENCODERS['UNKNOWN'];
    return STATE_ENCODERS[state] ?? STATE_ENCODERS['UNKNOWN'];
  }

  private static encodeBrowser(browser?: string): number {
    if (!browser) return BROWSER_ENCODERS['unknown'];
    const browserLower = browser.toLowerCase();
    return BROWSER_ENCODERS[browserLower] ?? BROWSER_ENCODERS['unknown'];
  }

  private static encodeUtmSource(utmSource?: string): number {
    if (!utmSource) return UTM_SOURCE_ENCODERS['unknown'];
    const sourceLower = utmSource.toLowerCase();
    return UTM_SOURCE_ENCODERS[sourceLower] ?? UTM_SOURCE_ENCODERS['unknown'];
  }

  private static encodeUtmMedium(utmMedium?: string): number {
    if (!utmMedium) return UTM_MEDIUM_ENCODERS['unknown'];
    const mediumLower = utmMedium.toLowerCase();
    return UTM_MEDIUM_ENCODERS[mediumLower] ?? UTM_MEDIUM_ENCODERS['unknown'];
  }

  static determineVertical(insuranceType?: string | null): 'pc' | 'health' | 'commercial' | undefined {
    if (!insuranceType) return undefined;
    
    if (insuranceType === 'AUTO' || insuranceType === 'HOME') return 'pc';
    if (insuranceType === 'HEALTH') return 'health';
    if (insuranceType === 'COMMERCIAL') return 'commercial';
    
    return undefined;
  }
}
