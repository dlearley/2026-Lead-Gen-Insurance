// Consent Banner Component
// Phase 25.1B - Data Privacy & GDPR Automation

import { useEffect, useState } from 'react';
import { gdprApiService } from '../../services/gdpr-api.service';
import type { ConsentBanner, ConsentAction } from '../../types';

interface ConsentBannerProps {
  onConsentRecorded?: (bannerId: string, actions: ConsentAction[]) => void;
  className?: string;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({
  onConsentRecorded,
  className = ''
}) => {
  const [banner, setBanner] = useState<ConsentBanner | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveBanner();
  }, []);

  const loadActiveBanner = async () => {
    try {
      const response = await gdprApiService.getActiveConsentBanners();
      if (response.banners.length > 0) {
        setBanner(response.banners[0]);
        
        // Set default preferences (required purposes default to true)
        const defaultPrefs: Record<string, boolean> = {};
        response.banners[0].purposes.forEach(purpose => {
          defaultPrefs[purpose.id] = purpose.required ? true : false;
        });
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Failed to load consent banner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAll = async () => {
    if (!banner) return;

    const allAccepted = Object.fromEntries(
      banner.purposes.map(purpose => [purpose.id, true])
    );
    setPreferences(allAccepted);
    await recordConsent(allAccepted);
  };

  const handleRejectAll = async () => {
    if (!banner) return;

    const allRejected = Object.fromEntries(
      banner.purposes.map(purpose => [purpose.id, !purpose.required])
    );
    setPreferences(allRejected);
    await recordConsent(allRejected);
  };

  const handleSavePreferences = async () => {
    await recordConsent(preferences);
  };

  const recordConsent = async (prefs: Record<string, boolean>) => {
    if (!banner) return;

    try {
      const actions: ConsentAction[] = Object.entries(prefs).map(([purposeId, granted]) => ({
        purposeId,
        action: granted ? 'accepted' : 'rejected',
        timestamp: new Date(),
        method: 'banner'
      }));

      await gdprApiService.recordConsent({
        bannerId: banner.id,
        actions
      });

      onConsentRecorded?.(banner.id, actions);
      
      // Hide banner after recording
      setBanner(null);
    } catch (error) {
      console.error('Failed to record consent:', error);
    }
  };

  if (loading) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!banner) {
    return null; // No banner to show or consent already recorded
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 ${className}`}>
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 mb-4 lg:mb-0 lg:mr-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {banner.title}
            </h3>
            <p className="text-sm text-gray-600">
              {banner.description}
            </p>
            
            {showDetails && (
              <div className="mt-4 space-y-3">
                {banner.purposes.map((purpose) => (
                  <div key={purpose.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {purpose.name}
                          {purpose.required && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Required
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {purpose.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Legal basis: {purpose.legalBasis}
                        </p>
                      </div>
                      <label className="ml-4 flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences[purpose.id] || false}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            [purpose.id]: e.target.checked
                          }))}
                          disabled={purpose.required}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            {banner.style.showManagePreferences && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {showDetails ? 'Hide Details' : 'Manage Preferences'}
              </button>
            )}
            
            {banner.style.showRejectAll && (
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Reject All
              </button>
            )}
            
            {banner.style.showAcceptAll && (
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Accept All
              </button>
            )}
            
            <button
              onClick={handleSavePreferences}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};