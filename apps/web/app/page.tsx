"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function Page() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-semibold tracking-wide">TIASAS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a className="hover:text-gray-700" href="#vision">Vision</a>
            <a className="hover:text-gray-700" href="#suite">Products</a>
            <a className="hover:text-gray-700" href="#market-desk">Market Desk</a>
            <a className="hover:text-gray-700" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#signup" className="hidden sm:inline-block text-sm font-medium px-4 py-2 rounded-xl border hover:bg-gray-50">Join waitlist</a>
            <Link href="/signin" className="text-sm font-medium px-4 py-2 rounded-xl bg-gray-900 text-white hover:opacity-90">Sign in</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">A disciplined home for family finance</h1>
            <p className="mt-5 text-lg text-gray-600">TIASAS brings your investing work into one place. Start with notes and daily P&L. Grow into secure aggregation, clean charts, and thoughtful analysis.</p>
            <div className="mt-8 flex gap-3">
              <a href="#market-desk" className="px-5 py-3 rounded-xl bg-gray-900 text-white font-medium hover:opacity-90">Explore Market Desk</a>
              <a href="#suite" className="px-5 py-3 rounded-xl border font-medium hover:bg-gray-50">See the suite</a>
            </div>
          </div>
          <div className="lg:pl-8">
            <div className="rounded-2xl border shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-3 text-sm text-gray-600">Preview</div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 rounded-xl border p-4">
                    <div className="text-sm font-medium">Monthly Performance</div>
                    <div className="mt-3 h-32 w-full rounded-lg bg-gradient-to-r from-gray-100 to-gray-200" aria-hidden="true" />
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-medium">Positions</div>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li className="flex justify-between"><span>SPY</span><span className="text-green-600">+1.8%</span></li>
                      <li className="flex justify-between"><span>UNH</span><span className="text-red-600">-0.7%</span></li>
                      <li className="flex justify-between"><span>APP</span><span className="text-green-600">+3.2%</span></li>
                    </ul>
                  </div>
                  <div className="col-span-3 rounded-xl border p-4">
                    <div className="text-sm font-medium">Journal</div>
                    <p className="mt-2 text-sm text-gray-600">Booked profits on covered calls. Watch UNH gap at 540. Note CPI on Wednesday.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section id="vision" className="border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold">Principles</h2>
          <div className="mt-6 grid md:grid-cols-3 gap-6">
            <div className="rounded-2xl border p-6">
              <div className="text-lg font-medium">Clarity over noise</div>
              <p className="mt-2 text-gray-600">Keep records clean. Let charts speak. Decisions follow from evidence.</p>
            </div>
            <div className="rounded-2xl border p-6">
              <div className="text-lg font-medium">Privacy first</div>
              <p className="mt-2 text-gray-600">Read-only aggregation and careful data handling as a default posture.</p>
            </div>
            <div className="rounded-2xl border p-6">
              <div className="text-lg font-medium">Steady craft</div>
              <p className="mt-2 text-gray-600">Daily notes. Monthly reviews. Yearly perspective. A quiet routine that compounds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Suite */}
      <section id="suite" className="border-t bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold">The TIASAS suite</h2>
          <p className="mt-2 text-gray-600">Start with Market Desk. Add tools as your needs grow.</p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <FeatureCard title="Market Desk" text="Journal, P&L, charts, and broker aggregation in one place." tag="Available" />
            <FeatureCard title="Research Notes" text="Capture theses, risks, and updates with tidy templates." tag="Planned" />
            <FeatureCard title="Capital Ledger" text="Track contributions, withdrawals, and fees with auditability." tag="Planned" />
          </div>
        </div>
      </section>

      {/* Market Desk spotlight */}
      <section id="market-desk" className="border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl font-semibold">TIASAS Market Desk</h2>
            <ul className="mt-4 space-y-3 text-gray-700 text-base list-disc list-inside">
              <li>Daily trade log with notes and tags</li>
              <li>Monthly and yearly performance views</li>
              <li>Read-only broker connections when you are ready</li>
              <li>Benchmarks against broad market indices</li>
              <li>Calm summaries that highlight what changed</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <a href="#signup" className="px-5 py-3 rounded-xl bg-gray-900 text-white font-medium hover:opacity-90">Join waitlist</a>
              <Link href="/signin" className="px-5 py-3 rounded-xl border font-medium hover:bg-gray-50">Sign in</Link>
            </div>
          </div>
          <div className="lg:pl-8">
            <div className="rounded-2xl border p-6">
              <h3 className="text-lg font-medium">What you can expect</h3>
              <ol className="mt-3 list-decimal list-inside text-gray-700 space-y-2">
                <li>Start with a journal. Log trades and observations.</li>
                <li>Connect brokers in read-only mode.</li>
                <li>Review clear charts and simple summaries.</li>
                <li>Ask questions in plain language.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Signup */}
      <section id="signup" className="border-t bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-semibold">Join the early list</h2>
            <p className="mt-2 text-gray-600">Add your email to hear when Market Desk is ready for testing.</p>
            <form onSubmit={handleSubmit} className="mt-6 flex max-w-md gap-3">
              <input
                aria-label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-xl border px-3 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button type="submit" className="px-5 py-3 rounded-xl bg-gray-900 text-white font-medium hover:opacity-90">Notify me</button>
            </form>
            {submitted && (
              <p className="mt-3 text-sm text-green-700">Thanks. You are on the list.</p>
            )}
          </div>
          <div className="lg:pl-8">
            <div className="rounded-2xl border p-6">
              <h3 className="text-lg font-medium">Privacy note</h3>
              <p className="mt-2 text-gray-600">Aggregation is designed for read-only access. Your data stays within your account. We will publish a short, plain policy before launch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold">Questions</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <FAQ q="Is this for personal use only?" a="We begin with family investors. If the tool matures, we may invite a small circle to test." />
            <FAQ q="Do you support real trading?" a="No. The first versions focus on record keeping, analysis, and read-only aggregation." />
            <FAQ q="Which brokers will you support?" a="We will prioritize the ones you use most. Read-only connections come first." />
            <FAQ q="How do you price it?" a="Early testers will use it at no cost. Pricing comes later when the suite expands." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm">TIASAS</span>
          </div>
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} TIASAS. All rights reserved.</p>
          <div className="text-sm text-gray-600">Privacy | Terms</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, text, tag }: { title: string; text: string; tag: string }) {
  return (
    <div className="rounded-2xl border p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <span className="text-xs px-2 py-1 rounded-full border">{tag}</span>
      </div>
      <p className="mt-2 text-gray-600">{text}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border p-6">
      <div className="font-medium">{q}</div>
      <p className="mt-2 text-gray-600">{a}</p>
    </div>
  );
}
