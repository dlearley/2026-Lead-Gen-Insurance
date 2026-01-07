'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { agencyPortalService } from '../../../services/agency-portal.service';
import { Users, Network, BarChart2, LogOut, TrendingUp, Award, DollarSign } from 'lucide-react';

export default function AgencyDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<{ id: string; email: string; name: string } | null>(null);

  useEffect(() => {
    if (!agencyPortalService.isAuthenticated()) {
      router.push('/agency-portal/login');
      return;
    }

    loadDashboard();
    loadAgencyInfo();
  }, []);

  const loadAgencyInfo = async () => {
    try {
      const agencyData = await agencyPortalService.getCurrentAgency();
      setAgency(agencyData);
    } catch (error) {
      console.error('Failed to load agency info:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      // For demo purposes, we'll use a mock agency ID
      const mockAgencyId = 'broker_12345';
      const data = await agencyPortalService.getDashboard(mockAgencyId);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    agencyPortalService.logout();
    router.push('/agency-portal/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agency Portal</h1>
            <p className="text-sm text-gray-500">
              Welcome, {agency?.name || 'Agency Admin'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Agency Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Network Score */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Network Score</h3>
              <Network className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.networkOverview?.profile?.networkScore || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Tier: {dashboard?.networkOverview?.profile?.networkTier || 'Bronze'}
            </p>
          </div>

          {/* Total Brokers */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Brokers</h3>
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.networkOverview?.profile?.totalConnections || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              In your network
            </p>
          </div>

          {/* Network Value */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Network Value</h3>
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                ${dashboard?.networkValue?.totalValue?.toLocaleString() || '0'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Estimated value
            </p>
          </div>

          {/* Growth Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Growth Rate</h3>
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-green-600">
                +{dashboard?.growthMetrics?.netGrowth || 0}%
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              This month
            </p>
          </div>
        </div>

        {/* Network Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Network Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Network Performance</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Referrals</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.networkOverview?.metrics?.totalReferralsSent || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Conversions</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.networkOverview?.metrics?.totalConversions || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Revenue Generated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ${dashboard?.networkOverview?.metrics?.totalRevenue?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.networkOverview?.metrics?.averageConversionRate ? `${(dashboard.networkOverview.metrics.averageConversionRate * 100).toFixed(1)}%` : '0%'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Network Multiplier</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.networkValue?.networkMultiplier || 1.0}x
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Referral Multiplier</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.networkOverview?.profile?.referralMultiplier || 1.0}x
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Top Performers</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {dashboard?.networkOverview?.topPerformers?.length > 0 ? (
                    dashboard.networkOverview.topPerformers.map((broker: any, index: number) => (
                      <li key={broker.brokerId}>
                        <div className="relative pb-8">
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white font-medium text-white">
                                {index + 1}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{broker.brokerName}</p>
                                <p className="text-sm text-gray-500">
                                  {broker.networkScore} points • {broker.totalConversions} conversions
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <span className="text-green-600 font-medium">
                                  ${broker.totalRevenue?.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li>
                      <div className="text-center py-8">
                        <p className="text-gray-500">No top performers data</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Network Growth & Analytics</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">New Connections</dt>
                <dd className="mt-1 text-2xl font-bold text-green-600">
                  +{dashboard?.growthMetrics?.newConnections || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Network Score Change</dt>
                <dd className={`mt-1 text-2xl font-bold ${dashboard?.growthMetrics?.networkScoreChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboard?.growthMetrics?.networkScoreChange >= 0 ? '+' : ''}{dashboard?.growthMetrics?.networkScoreChange || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Revenue Growth</dt>
                <dd className="mt-1 text-2xl font-bold text-green-600">
                  +${dashboard?.growthMetrics?.revenueGrowth?.toLocaleString() || '0'}
                </dd>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Network Leaderboard</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Broker
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboard?.networkOverview?.leaderboard?.length > 0 ? (
                      dashboard.networkOverview.leaderboard.map((entry: any) => (
                        <tr key={entry.brokerId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.rank}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.brokerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.networkScore}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${entry.totalRevenue?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                          No leaderboard data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}