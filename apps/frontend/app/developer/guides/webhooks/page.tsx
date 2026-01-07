import React from 'react';

export default function WebhooksGuide() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Webhooks Guide</h1>
      <p className="mb-4">
        Webhooks allow your application to receive real-time notifications when events happen on our platform.
      </p>
      
      <h2 className="text-2xl font-bold mt-8 mb-4">Supported Events</h2>
      <ul className="list-disc ml-6 space-y-2 mb-4">
        <li><code>lead.created</code>: Triggered when a new lead is added.</li>
        <li><code>lead.updated</code>: Triggered when lead information changes.</li>
        <li><code>lead.status_changed</code>: Triggered when a lead moves to a new status.</li>
        <li><code>task.assigned</code>: Triggered when a task is assigned to a user.</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4">Setting up a Webhook</h2>
      <p className="mb-4">
        1. Go to the Developer Portal &gt; Webhooks.
        2. Click "Add Webhook".
        3. Enter your destination URL (must be HTTPS).
        4. Select the events you want to subscribe to.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">Security</h2>
      <p className="mb-4">
        We sign every webhook request with a secret key. You should verify this signature to ensure the request came from us.
      </p>
      <pre className="bg-slate-900 text-white p-4 rounded-md overflow-x-auto mb-4">
{`// Node.js example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === digest;
}`}
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4">Testing</h2>
      <p className="mb-4">
        You can use tools like <a href="https://webhook.site" className="text-blue-600">webhook.site</a> to test your webhooks during development.
      </p>
    </div>
  );
}
