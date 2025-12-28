import type { TrackEventDto, SetTraitDto, SetConsentDto } from '@insurance/types';

const CDP_API_URL = process.env.NEXT_PUBLIC_CDP_API_URL || 'http://localhost:3002/api/v1/cdp';

class CDPTrackingService {
  private anonymousId: string | null = null;
  private sessionId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.anonymousId = this.getOrCreateAnonymousId();
      this.sessionId = this.getOrCreateSessionId();
    }
  }

  private getOrCreateAnonymousId(): string {
    let anonymousId = localStorage.getItem('cdp_anonymous_id');
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('cdp_anonymous_id', anonymousId);
    }
    return anonymousId;
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('cdp_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('cdp_session_id', sessionId);
    }
    return sessionId;
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getOS(): string {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Other';
  }

  async trackEvent(customerId: string | null, event: Omit<TrackEventDto, 'customerId' | 'anonymousId' | 'sessionId' | 'deviceType' | 'browser' | 'os' | 'userAgent'>): Promise<void> {
    try {
      const eventData: TrackEventDto = {
        ...event,
        customerId: customerId || undefined,
        anonymousId: !customerId ? this.anonymousId || undefined : undefined,
        sessionId: this.sessionId || undefined,
        deviceType: this.getDeviceType(),
        browser: this.getBrowser(),
        os: this.getOS(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date(),
      };

      await fetch(`${CDP_API_URL}/events/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async trackPageView(customerId: string | null, pageName?: string): Promise<void> {
    const pageTitle = pageName || (typeof document !== 'undefined' ? document.title : 'Unknown Page');
    const pageUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';

    await this.trackEvent(customerId, {
      eventType: 'PAGE_VIEW',
      eventName: pageTitle,
      eventCategory: 'Navigation',
      properties: {
        pageUrl,
        referrer,
      },
    });
  }

  async trackButtonClick(customerId: string | null, buttonLabel: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(customerId, {
      eventType: 'BUTTON_CLICK',
      eventName: `${buttonLabel} Clicked`,
      eventCategory: 'Interaction',
      properties: {
        buttonLabel,
        ...properties,
      },
    });
  }

  async trackFormSubmit(customerId: string | null, formName: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(customerId, {
      eventType: 'FORM_SUBMIT',
      eventName: `${formName} Submitted`,
      eventCategory: 'Form',
      properties: {
        formName,
        ...properties,
      },
    });
  }

  async trackQuoteRequest(customerId: string | null, insuranceType: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent(customerId, {
      eventType: 'QUOTE_REQUEST',
      eventName: 'Quote Requested',
      eventCategory: 'Quote',
      properties: {
        insuranceType,
        ...properties,
      },
    });
  }

  async trackLogin(customerId: string): Promise<void> {
    await this.trackEvent(customerId, {
      eventType: 'LOGIN',
      eventName: 'User Logged In',
      eventCategory: 'Authentication',
    });
  }

  async trackLogout(customerId: string): Promise<void> {
    await this.trackEvent(customerId, {
      eventType: 'LOGOUT',
      eventName: 'User Logged Out',
      eventCategory: 'Authentication',
    });
  }

  async setTrait(customerId: string, trait: SetTraitDto): Promise<void> {
    try {
      await fetch(`${CDP_API_URL}/traits/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trait),
      });
    } catch (error) {
      console.error('Failed to set trait:', error);
    }
  }

  async setConsent(customerId: string, consent: SetConsentDto): Promise<void> {
    try {
      await fetch(`${CDP_API_URL}/consents/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consent),
      });
    } catch (error) {
      console.error('Failed to set consent:', error);
    }
  }

  async getCustomer360(customerId: string): Promise<any> {
    try {
      const response = await fetch(`${CDP_API_URL}/customer360/${customerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer 360 view');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get customer 360:', error);
      return null;
    }
  }

  clearAnonymousId(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cdp_anonymous_id');
    }
  }

  clearSessionId(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('cdp_session_id');
    }
  }
}

export const cdpTrackingService = new CDPTrackingService();
