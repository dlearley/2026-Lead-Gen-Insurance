'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { brokerPortalService } from '../../../services/broker-portal.service';
import { Users, UserPlus, Link as LinkIcon, X, Check, Search, Plus } from 'lucide-react';

export default function BrokerNetworkPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [newConnection, setNewConnection] = useState({
    connectedBrokerId: '',
    relationshipType: 'cross_referral',
    message: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!brokerPortalService.isAuthenticated()) {
      router.push('/broker-portal/login');
      return;
    }

    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      // For demo purposes, we'll use a mock broker ID
      const mockBrokerId = 'broker_12345';
      const data = await brokerPortalService.getConnections(mockBrokerId);
      setConnections(data);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = async () => {
    try {
      setLoading(true);
      const mockBrokerId = 'broker_12345';
      const connectionData = {
        brokerId: mockBrokerId,
        ...newConnection,
      };
      
      await brokerPortalService.createConnection(connectionData);
      await loadConnections();
      setShowAddConnection(false);
      setNewConnection({
        connectedBrokerId: '',
        relationshipType: 'cross_referral',
        message: '',
      });
    } catch (error) {
      console.error('Failed to create connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConnection = async (connectionId: string, isActive: boolean) => {
    try {
      setLoading(true);
      await brokerPortalService.updateConnection(connectionId, { isActive });
      await loadConnections();
    } catch (error) {
      console.error('Failed to update connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = connections.filter(connection =>
    connection.connectedBrokerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    connection.relationshipType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !connections.length) {
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
            <h1 className="text-2xl font-bold text-gray-900">Network Management</h1>
            <p className="text-sm text-gray-500">Manage your professional connections</p>
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
        {/* Search and Add */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-auto flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search connections..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddConnection(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add Connection
          </button>
        </div>

        {/* Network Stats */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Connections</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">{connections.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Active Connections</dt>
              <dd className="mt-1 text-2xl font-bold text-green-600">
                {connections.filter(c => c.isActive).length}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Referrals</dt>
              <dd className="mt-1 text-2xl font-bold text-blue-600">
                {connections.reduce((sum, c) => sum + (c.referralCount || 0), 0)}
              </dd>
            </div>
          </div>
        </div>

        {/* Connections List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your Connections</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broker ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Relationship Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Strength
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Referrals
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((connection) => (
                    <tr key={connection.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {connection.connectedBrokerId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {connection.relationshipType.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${connection.strength * 20}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">
                            {connection.strength}/5
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {connection.referralCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          connection.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {connection.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleUpdateConnection(connection.id, !connection.isActive)}
                          className={`text-xs font-medium rounded-md px-3 py-1 ${
                            connection.isActive 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {connection.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No connections found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Connection Modal */}
        {showAddConnection && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New Connection</h3>
                <button
                  onClick={() => setShowAddConnection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="connectedBrokerId" className="block text-sm font-medium text-gray-700 mb-1">
                    Broker ID
                  </label>
                  <input
                    type="text"
                    id="connectedBrokerId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newConnection.connectedBrokerId}
                    onChange={(e) => setNewConnection({...newConnection, connectedBrokerId: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="relationshipType" className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship Type
                  </label>
                  <select
                    id="relationshipType"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newConnection.relationshipType}
                    onChange={(e) => setNewConnection({...newConnection, relationshipType: e.target.value as any})}
                  >
                    <option value="cross_referral">Cross Referral</option>
                    <option value="mentorship">Mentorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="team_member">Team Member</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message (optional)
                  </label>
                  <textarea
                    id="message"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={newConnection.message}
                    onChange={(e) => setNewConnection({...newConnection, message: e.target.value})}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddConnection(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddConnection}
                    disabled={!newConnection.connectedBrokerId}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Connection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}