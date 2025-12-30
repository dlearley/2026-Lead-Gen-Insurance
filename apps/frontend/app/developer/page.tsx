import React from 'react';
import Link from 'next/link';
import { Book, Code, Terminal, Zap } from 'lucide-react';

export default function DeveloperOverview() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          Developer Portal
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Everything you need to integrate with the Insurance Lead Generation
          platform. Build powerful insurance applications with our APIs and
          SDKs.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Zap size={24} />
          </div>
          <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
            Quickstart
          </h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Get up and running with our API in under 5 minutes.
          </p>
          <Link
            href="/developer/guides/quickstart"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Start building →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Book size={24} />
          </div>
          <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
            API Reference
          </h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Comprehensive documentation for every endpoint and parameter.
          </p>
          <Link
            href="/developer/api-reference"
            className="text-sm font-medium text-green-600 hover:underline"
          >
            Explore endpoints →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Code size={24} />
          </div>
          <h3 className="mb-2 font-bold text-slate-900 dark:text-white">SDKs</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Client libraries for TypeScript, Python, and Go.
          </p>
          <Link
            href="/developer/sdks"
            className="text-sm font-medium text-purple-600 hover:underline"
          >
            Download SDKs →
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Terminal size={24} />
          </div>
          <h3 className="mb-2 font-bold text-slate-900 dark:text-white">
            CLI Tool
          </h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Manage your leads and integrations from the command line.
          </p>
          <Link
            href="/developer/guides/cli"
            className="text-sm font-medium text-amber-600 hover:underline"
          >
            View CLI docs →
          </Link>
        </div>
      </div>

      <div className="mt-20">
        <h2 className="mb-8 text-2xl font-bold text-slate-900 dark:text-white">
          Popular Guides
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/developer/guides/authentication"
            className="group block rounded-lg border border-slate-200 p-6 hover:border-blue-600 dark:border-slate-800"
          >
            <h4 className="mb-2 font-bold group-hover:text-blue-600 dark:text-white">
              Authentication
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Learn how to securely authenticate your API requests using API
              keys or OAuth tokens.
            </p>
          </Link>
          <Link
            href="/developer/guides/webhooks"
            className="group block rounded-lg border border-slate-200 p-6 hover:border-blue-600 dark:border-slate-800"
          >
            <h4 className="mb-2 font-bold group-hover:text-blue-600 dark:text-white">
              Webhooks
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Set up real-time notifications for lead status changes and other
              platform events.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
