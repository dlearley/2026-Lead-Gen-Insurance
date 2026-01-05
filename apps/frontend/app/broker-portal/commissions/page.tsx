'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { brokerPortalService } from '../../../services/broker-portal.service';
import { DollarSign, Clock, CheckCircle, XCircle, Search, BarChart2 } from 'lucide-react';

export default function BrokerCommissionsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!brokerPortalService.isAuthenticated()) {
      router.push('/broker-portal/login');
      return;
    }

    loadCommissionData();
  }, []);

  const loadCommissionData = async () => {
    try {
      // For demo purposes, we'll use a mock broker ID
      const mockBrokerId = 'broker_12345';
      const [networkMetrics, networkValue] = await Promise.all([
        brokerPortalService.getNetworkMetrics(mockBrokerId),
        brokerPortalService.getNetworkValue(mockBrokerId),
      ]);
      
      setMetrics({
        ...networkMetrics,
        networkValue,
      });
    } catch (error) {
      console.error('Failed to load commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock commission data for demonstration
  const mockCommissions = [
    {
      id: 'comm_1',
      referralId: 'ref_123',
      brokerId: 'broker_678',
      amount: 250.00,
      status: 'pending',
      date: new Date(Date.now() - 86400000 * 2),
      leadId: 'lead_456',
    },
    {
      id: 'comm_2',
      referralId: 'ref_124',
      brokerId: 'broker_679',
      amount: 180.50,
      status: 'processed',
      date: new Date(Date.now() - 86400000 * 5),
      leadId: 'lead_457',
    },
    {
      id: 'comm_3',
      referralId: 'ref_125',
      brokerId: 'broker_680',
      amount: 325.75,
      status: 'paid',
      date: new Date(Date.now() - 86400000 * 10),
      leadId: 'lead_458',
    },
  ];

  const filteredCommissions = mockCommissions.filter(commission =>
    commission.brokerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    commission.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'paid': return <DollarSign className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processed': return 'Processed';
      case 'paid': return 'Paid';
      default: return status;
    }
  };

  if (loading && !metrics) {
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
            <h1 className="text-2xl font-bold text-gray-900">Commission Tracking</h1>
            <p className="text-sm text-gray-500">Monitor your earnings and payouts</p>
          </div>
          <button
            onClick={() => router.push('/broker-portal/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search commissions..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Commission Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                ${metrics?.totalRevenue?.toLocaleString() || '0'}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Lifetime earnings
            </p>
          </div>

          {/* Pending Commissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Pending</h3>
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                ${mockCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Awaiting processing
            </p>
          </div>

          {/* Processed Commissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Processed</h3>
              <CheckCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                ${mockCommissions.filter(c => c.status === 'processed').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Ready for payout
            </p>
          </div>

          {/* Paid Commissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Paid</h3>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                ${mockCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Successfully paid
            </p>
          </div>
        </div>

        {/* Network Value */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Network Value & Performance</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Network Value</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ${metrics?.networkValue?.totalValue?.toLocaleString() || '0'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Network Multiplier</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {metrics?.networkValue?.networkMultiplier || 1.0}x
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Direct Connections</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {metrics?.networkValue?.connectionBreakdown?.direct || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Indirect Connections</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {metrics?.networkValue?.connectionBreakdown?.secondLevel || 0}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {metrics?.averageConversionRate ? `${(metrics.averageConversionRate * 100).toFixed(1)}%` : '0%'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Referral Multiplier</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {metrics?.referralMultiplier || 1.0}x
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Commissions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Commission History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referral ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broker ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCommissions.length > 0 ? (
                  filteredCommissions.map((commission) => (
                    <tr key={commission.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {commission.referralId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commission.brokerId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${commission.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {getStatusIcon(commission.status)}
                          <span className="ml-2">{getStatusText(commission.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {commission.date.toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No commissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}