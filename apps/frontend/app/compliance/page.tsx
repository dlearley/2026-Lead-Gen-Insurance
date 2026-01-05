'use client';

import React, { useState, useEffect } from 'react';

export default function CompliancePage() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    // Mock fetching compliance status
    setStatus({
      overallStatus: 'Compliant',
      activeLicenses: 124,
      pendingVerifications: 3,
      openViolations: 0,
      disparateImpactRatio: 0.94,
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Insurance Compliance Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Overall Status</h2>
          <p className="text-2xl font-bold text-green-600">{status?.overallStatus}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Active Licenses</h2>
          <p className="text-2xl font-bold">{status?.activeLicenses}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Open Violations</h2>
          <p className="text-2xl font-bold text-red-600">{status?.openViolations}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500 text-sm">Disparate Impact Ratio</h2>
          <p className="text-2xl font-bold">{status?.disparateImpactRatio}</p>
        </div>
      </div>

      <div className="bg-white rounded shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Compliance Activity</h2>
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Event</th>
              <th className="text-left py-2">Agent/Lead</th>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">License Verified</td>
              <td className="py-2">John Smith</td>
              <td className="py-2">2023-10-27</td>
              <td className="py-2 text-green-600">Active</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Disclosure Delivered</td>
              <td className="py-2">Lead #4412</td>
              <td className="py-2">2023-10-27</td>
              <td className="py-2 text-blue-600">Sent</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
