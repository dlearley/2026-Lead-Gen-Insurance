import React from 'react';
import { Download } from 'lucide-react';

export default function SdksPage() {
  const sdks = [
    { name: 'TypeScript', version: '1.2.0', lang: 'typescript' },
    { name: 'Python', version: '1.1.5', lang: 'python' },
    { name: 'Go', version: '1.0.2', lang: 'go' },
    { name: 'Ruby', version: '1.0.0', lang: 'ruby', status: 'Beta' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Client SDKs</h1>
      <p className="mb-12 text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
        Accelerate your integration with our official client libraries. We provide SDKs for the most popular programming languages.
      </p>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {sdks.map((sdk) => (
          <div key={sdk.lang} className="rounded-xl border border-slate-200 p-6 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold dark:text-white">{sdk.name}</h3>
                {sdk.status && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full dark:bg-blue-900/40 dark:text-blue-300">
                    {sdk.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-4">Version {sdk.version}</p>
              <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs mb-6 overflow-x-auto">
                {sdk.lang === 'typescript' && `npm install @insurance-platform/sdk`}
                {sdk.lang === 'python' && `pip install insurance-platform-sdk`}
                {sdk.lang === 'go' && `go get github.com/insurance-platform/sdk-go`}
                {sdk.lang === 'ruby' && `gem install insurance-platform-sdk`}
              </code>
            </div>
            <button className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 py-2 rounded-lg hover:opacity-90 transition-opacity">
              <Download size={18} />
              Documentation
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">Community Libraries</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Can't find an official SDK for your language? Check out these community-maintained libraries or generate your own using our OpenAPI spec.
        </p>
        <div className="flex gap-4">
          <a href="/openapi.json" className="text-blue-600 hover:underline font-medium">Download OpenAPI Spec (JSON)</a>
          <span className="text-slate-300">|</span>
          <a href="https://openapi-generator.tech/" className="text-blue-600 hover:underline font-medium">OpenAPI Generator</a>
        </div>
      </div>
    </div>
  );
}
