import React from 'react';

export default function QuickstartGuide() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Quickstart Guide</h1>
      <p className="mb-4">
        This guide will help you get started with the Insurance Lead Generation API in just a few minutes.
      </p>
      
      <h2 className="text-2xl font-bold mt-8 mb-4">1. Get your API Key</h2>
      <p className="mb-4">
        Log in to your account, go to Settings &gt; Developers, and create a new API Key. Keep this key secure.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">2. Make your first request</h2>
      <p className="mb-4">
        Use your favorite tool to call the API. Here's an example using <code>curl</code>:
      </p>
      <pre className="bg-slate-900 text-white p-4 rounded-md overflow-x-auto mb-4">
{`curl -X GET "http://localhost:3000/api/v1/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4">3. Create a lead</h2>
      <p className="mb-4">
        To send a new lead to the platform:
      </p>
      <pre className="bg-slate-900 text-white p-4 rounded-md overflow-x-auto mb-4">
{`curl -X POST "http://localhost:3000/api/v1/leads" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "my_website",
    "email": "customer@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "insuranceType": "AUTO"
  }'`}
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4">Next Steps</h2>
      <ul className="list-disc ml-6 space-y-2">
        <li>Read the <a href="/developer/api-reference" className="text-blue-600 hover:underline">API Reference</a></li>
        <li>Check out our <a href="/developer/sdks" className="text-blue-600 hover:underline">SDKs</a></li>
        <li>Set up <a href="/developer/guides/webhooks" className="text-blue-600 hover:underline">Webhooks</a></li>
      </ul>
    </div>
  );
}
