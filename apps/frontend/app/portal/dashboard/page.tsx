'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { customerPortalService } from '../../../services/customer-portal.service';
import { FileText, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await customerPortalService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    customerPortalService.logout();
    router.push('/portal/login');
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
            <h1 className="text-2xl font-bold text-gray-900">Customer Portal</h1>
            <p className="text-sm text-gray-500">
              Welcome, {dashboard?.customer?.lead?.firstName}{' '}
              {dashboard?.customer?.lead?.lastName}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Application Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Application Status</h3>
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900 capitalize">
                {dashboard?.lead?.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Last updated: {new Date(dashboard?.lead?.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Pending Documents */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Pending Documents</h3>
              <FileText className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.pendingDocuments || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Documents awaiting your upload
            </p>
          </div>

          {/* Unread Messages */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Unread Messages</h3>
              <MessageSquare className="h-5 w-5 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {dashboard?.unreadMessages || 0}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              New messages from agents
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
              href="/portal/documents"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 mr-2" />
              Upload Documents
            </Link>
            <Link
              href="/portal/messages"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              View Messages
            </Link>
            <Link
              href="/portal/profile"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Update Profile
            </Link>
          </div>
        </div>

        {/* Lead Information */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Lead Information</h2>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Insurance Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {dashboard?.lead?.insuranceType}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dashboard?.lead?.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dashboard?.lead?.phone}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dashboard?.lead?.city}, {dashboard?.lead?.state}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Quality Score</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dashboard?.lead?.qualityScore}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(dashboard?.lead?.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
