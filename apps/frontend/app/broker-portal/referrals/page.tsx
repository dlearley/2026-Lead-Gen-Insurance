'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { brokerPortalService } from '../../../services/broker-portal.service';
import { Gift, Clock, CheckCircle, XCircle, DollarSign, Search, Plus } from 'lucide-react';

export default function BrokerReferralsPage() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<{ sent: any[]; received: any[] }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!brokerPortalService.isAuthenticated()) {
      router.push('/broker-portal/login');
      return;
    }

    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      // For demo purposes, we'll use a mock broker ID
      const mockBrokerId = 'broker_12345';
      const data = await brokerPortalService.getReferrals(mockBrokerId);
      setReferrals(data);
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (referralId: string, status: 'accepted' | 'converted' | 'declined') => {
    try {
      setLoading(true);
      await brokerPortalService.updateReferralStatus(referralId, status);
      await loadReferrals();
    } catch (error) {
      console.error('Failed to update referral status:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferrals = activeTab === 'received' 
    ? referrals.received.filter(referral =>
        referral.referringBrokerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.status.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : referrals.sent.filter(referral =>
        referral.receivingBrokerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.status.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'converted': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'declined': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expired': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'converted': return 'Converted';
      case 'declined': return 'Declined';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  if (loading && !referrals.sent.length && !referrals.received.length) {
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
            <h1 className="text-2xl font-bold text-gray-900">Referral Management</h1>
            <p className="text-sm text-gray-500">Track and manage your referrals</p>
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
        {/* Tabs and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex space-x-1 rounded-md bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                activeTab === 'received' 
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Gift className="h-4 w-4 mr-2" />
              Received ({referrals.received.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                activeTab === 'sent' 
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Sent ({referrals.sent.length})
            </button>
          </div>

          <div className="relative w-full sm:w-auto flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab} referrals...`}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Referral Stats */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Received</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">{referrals.received.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Sent</dt>
              <dd className="mt-1 text-2xl font-bold text-blue-600">{referrals.sent.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Pending Action</dt>
              <dd className="mt-1 text-2xl font-bold text-yellow-600">
                {referrals.received.filter(r => r.status === 'pending').length}
              </dd>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {activeTab === 'received' ? 'Received Referrals' : 'Sent Referrals'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'received' ? 'From Broker' : 'To Broker'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  {activeTab === 'received' && (
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReferrals.length > 0 ? (
                  filteredReferrals.map((referral) => (
                    <tr key={referral.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {activeTab === 'received' ? referral.referringBrokerId : referral.receivingBrokerId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {referral.leadId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {getStatusIcon(referral.status)}
                          <span className="ml-2">{getStatusText(referral.status)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {referral.commissionAmount ? `$${referral.commissionAmount}` : `${referral.commissionRate}%`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </td>
                      {activeTab === 'received' && referral.status === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleUpdateStatus(referral.id, 'accepted')}
                              className="text-xs font-medium rounded-md px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(referral.id, 'declined')}
                              className="text-xs font-medium rounded-md px-3 py-1 bg-red-100 text-red-800 hover:bg-red-200"
                            >
                              Decline
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeTab === 'received' ? 6 : 5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No {activeTab} referrals found
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