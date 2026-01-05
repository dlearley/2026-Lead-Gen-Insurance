'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { brokerPortalService } from '../../../services/broker-portal.service';
import { Users, Network, Gift, DollarSign, BarChart2, LogOut, UserPlus, Link as LinkIcon } from 'lucide-react';

export default function BrokerDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [broker, setBroker] = useState<{ id: string; email: string; name: string } | null>(null);

  useEffect(() => {
    if (!brokerPortalService.isAuthenticated()) {
      router.push('/broker-portal/login');
      return;
    }

    loadDashboard();
    loadBrokerInfo();
  }, []);

  const loadBrokerInfo = async () => {
    try {
      const brokerData = await brokerPortalService.getCurrentBroker();
      setBroker(brokerData);
    } catch (error) {
      console.error('Failed to load broker info:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      // For demo purposes, we'll use a mock broker ID
      // In production, this would come from the authenticated broker
      const mockBrokerId = 'broker_12345';
      const data = await brokerPortalService.getDashboard(mockBrokerId);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    brokerPortalService.logout();
    router.push('/broker-portal/login');
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
            <h1 className="text-2xl font-bold text-gray-900">Broker Portal</h1>
            <p className="text-sm text-gray-500">
              Welcome, {broker?.name || 'Broker'}
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
        {/* Network Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Network Score */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Network Score</h3>
              <Network className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.profile?.networkScore || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Tier: {dashboard?.profile?.networkTier || 'Bronze'}
            </p>
          </div>

          {/* Active Connections */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Active Connections</h3>
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.activeConnections || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Total: {dashboard?.connections?.length || 0}
            </p>
          </div>

          {/* Pending Referrals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Pending Referrals</h3>
              <Gift className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.pendingReferrals || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Needs your attention
            </p>
          </div>

          {/* Referral Multiplier */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Referral Multiplier</h3>
              <BarChart2 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.profile?.referralMultiplier || 1.0}x
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Boost your earnings
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/broker-portal/network"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Users className="h-5 w-5 mr-2" />
              Manage Network
            </Link>
            <Link
              href="/broker-portal/referrals"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Gift className="h-5 w-5 mr-2" />
              View Referrals
            </Link>
            <Link
              href="/broker-portal/commissions"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Track Commissions
            </Link>
          </div>
        </div>

        {/* Network Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Network Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Network Metrics</h2>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Network Value</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ${dashboard?.profile?.networkValue?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Referrals</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.metrics?.totalReferralsSent || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Conversions</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.metrics?.totalConversions || 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Revenue Generated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ${dashboard?.metrics?.totalRevenue?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.metrics?.averageConversionRate ? `${(dashboard.metrics.averageConversionRate * 100).toFixed(1)}%` : '0%'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Network Reach</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {dashboard?.metrics?.networkReach || 0} brokers
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {dashboard?.referrals?.received?.slice(0, 5)?.map((referral: any) => (
                    <li key={referral.id}>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                              <Gift className="h-5 w-5 text-white" />
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                New referral from {referral.referringBrokerId}
                              </p>
                            </div>
                            <div className="text-right text-sm whitespace-nowrap text-gray-500">
                              <time dateTime={referral.createdAt}>{new Date(referral.createdAt).toLocaleDateString()}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  )) || (
                    <li>
                      <div className="text-center py-8">
                        <p className="text-gray-500">No recent activity</p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}