"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-semibold tracking-wide text-gold-600 dark:text-gold-400">TIASAS</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Back to Home
            </Link>
            <Link href="/signin" className="text-sm font-medium px-4 py-2 rounded-xl bg-gold-600 hover:bg-gold-700 text-white transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-semibold">Security & Privacy</h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-slate-300">
            How we protect your data, secure your credentials, and use AI ethically
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Data Encryption */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Encryption at Rest</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              All sensitive credentials, including API keys for broker connections and AI providers, are encrypted using <strong>AES-256 encryption</strong> before being stored in our database. This industry-standard encryption ensures that even if someone gains unauthorized access to our database, they cannot read your credentials without the encryption keys.
            </p>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>What we encrypt:</strong> Broker API keys, AI provider API keys, OAuth tokens, and any other authentication credentials</li>
              <li><strong>Encryption method:</strong> AES-256-GCM with per-record unique initialization vectors</li>
              <li><strong>Key management:</strong> Encryption keys are stored separately from the database using secure key management services</li>
              <li><strong>Access control:</strong> Only encrypted values are stored; no plain-text credentials ever touch our database</li>
            </ul>
          </div>
        </section>

        {/* Data in Transit */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Encryption in Transit</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              All data transmitted between your browser and our servers is protected using <strong>TLS 1.3</strong> (Transport Layer Security), the latest and most secure encryption protocol. This ensures that no one can intercept or read your data while it travels across the internet.
            </p>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>TLS 1.3:</strong> State-of-the-art encryption for all web traffic</li>
              <li><strong>HTTPS everywhere:</strong> All pages, API calls, and resources are served over HTTPS</li>
              <li><strong>Certificate validation:</strong> We use industry-standard SSL/TLS certificates from trusted certificate authorities</li>
              <li><strong>Perfect forward secrecy:</strong> Each session uses unique encryption keys that cannot be compromised retroactively</li>
            </ul>
          </div>
        </section>

        {/* API Key Handling */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">API Key Security</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              Your broker and AI provider API keys are among your most sensitive credentials. We treat them with the highest level of security and never use them for any purpose other than what you explicitly authorize.
            </p>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Encrypted storage:</strong> All API keys are encrypted with AES-256 before storage</li>
              <li><strong>Read-only access:</strong> Broker API keys are configured for read-only access whenever possible</li>
              <li><strong>No sharing:</strong> Your API keys are never shared with third parties or used for purposes beyond your account</li>
              <li><strong>Secure transmission:</strong> API keys are only transmitted over encrypted HTTPS connections</li>
              <li><strong>User control:</strong> You can delete or rotate your API keys at any time from your settings</li>
            </ul>
          </div>
        </section>

        {/* Ethical AI Use */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Ethical AI Use</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              We use AI to help you analyze your trading performance and gain insights, but we do so with strict ethical guidelines and respect for your privacy.
            </p>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>No training on your data:</strong> Your private financial data is never used to train AI models. Requests are processed ephemerally.</li>
              <li><strong>Provider privacy:</strong> When using AI providers (OpenAI, Anthropic, etc.), we follow their data usage policies, which typically include no data retention for API requests.</li>
              <li><strong>User control:</strong> You choose which AI provider to use and can opt out of AI features entirely.</li>
              <li><strong>Transparency:</strong> We clearly indicate when AI is being used and what data is being analyzed.</li>
              <li><strong>Data minimization:</strong> We only send the minimum necessary data to AI providers to answer your questions.</li>
            </ul>
          </div>
        </section>

        {/* Data Privacy */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Your Data Privacy</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              Your financial data belongs to you. We design TIASAS with privacy as a core principle, not an afterthought.
            </p>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Your data stays yours:</strong> You own your data. We never sell or share your financial information.</li>
              <li><strong>Account isolation:</strong> Your data is isolated to your organization. Other users cannot access it.</li>
              <li><strong>Export anytime:</strong> Export your data in multiple formats (CSV, Excel, JSON) at any time.</li>
              <li><strong>Delete anytime:</strong> You can delete your account and all associated data at any time.</li>
              <li><strong>Minimal collection:</strong> We only collect data necessary to provide the service.</li>
            </ul>
          </div>
        </section>

        {/* Infrastructure Security */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Infrastructure Security</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              Beyond encryption, we implement industry-standard security practices across our infrastructure.
            </p>
            <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
              <li><strong>Secure hosting:</strong> Hosted on trusted cloud infrastructure with robust security measures</li>
              <li><strong>Regular updates:</strong> We keep all systems and dependencies up to date with security patches</li>
              <li><strong>Access controls:</strong> Strict authentication and authorization controls for all system access</li>
              <li><strong>Monitoring:</strong> Continuous monitoring for security threats and anomalies</li>
              <li><strong>Backups:</strong> Regular encrypted backups to protect against data loss</li>
            </ul>
          </div>
        </section>

        {/* Responsible Disclosure */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Responsible Disclosure</h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
              If you discover a security vulnerability in TIASAS, we encourage responsible disclosure. Please report security issues privately so we can address them promptly before public disclosure.
            </p>
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-gray-700 dark:text-slate-300">
                <strong>Report security issues to: </strong>
                security@tiasas.com
              </p>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                We commit to acknowledging reports within 48 hours and providing regular updates on remediation progress.
              </p>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="mb-12">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-8 bg-gray-50 dark:bg-slate-800 text-center">
            <h2 className="text-2xl font-semibold mb-4">Questions about Security?</h2>
            <p className="text-gray-700 dark:text-slate-300 mb-6">
              We believe in transparency. If you have questions about our security practices, data handling, or privacy policies, we're here to help.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/" className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-white dark:hover:bg-slate-700 transition-colors">
                Back to Home
              </Link>
              <a href="mailto:security@tiasas.com" className="px-5 py-3 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-medium transition-colors">
                Contact Security Team
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm text-gold-600 dark:text-gold-400">TIASAS</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-400">© {new Date().getFullYear()} TIASAS. All rights reserved.</p>
          <div className="text-sm text-gray-600 dark:text-slate-400">Privacy | Terms</div>
        </div>
      </footer>
    </div>
  );
}
