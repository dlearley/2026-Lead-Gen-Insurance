import React from 'react';
import Link from 'next/link';

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-900">
      <header className="sticky top-0 z-40 w-full border-b bg-white dark:bg-slate-900 dark:border-slate-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">Insurance Platform</span>
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link
                href="/developer"
                className="text-sm font-medium hover:text-blue-600"
              >
                Overview
              </Link>
              <Link
                href="/developer/api-reference"
                className="text-sm font-medium hover:text-blue-600"
              >
                API Reference
              </Link>
              <Link
                href="/developer/guides"
                className="text-sm font-medium hover:text-blue-600"
              >
                Guides
              </Link>
              <Link
                href="/developer/sdks"
                className="text-sm font-medium hover:text-blue-600"
              >
                SDKs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Get API Key
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-12 dark:border-slate-800">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          © 2024 Insurance Platform Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
