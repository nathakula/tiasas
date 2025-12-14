"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Page() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const chartPathRef = useRef<SVGPathElement>(null);
  const areaPathRef = useRef<SVGPathElement>(null);
  const principleCardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Chart drawing animation on scroll
  useEffect(() => {
    if (!chartPathRef.current || !areaPathRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            chartPathRef.current?.classList.add('animate-draw-line');
            areaPathRef.current?.classList.add('animate-fade-in-delayed');
          }
        });
      },
      { threshold: 0.5 }
    );

    if (previewCardRef.current) {
      observer.observe(previewCardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Principle cards staggered reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll('.principle-card');
            cards.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add('reveal');
              }, index * 150);
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (principleCardsRef.current) {
      observer.observe(principleCardsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Calculate parallax offset for preview card
  const previewCardOffset = Math.min(scrollY * 0.15, 50);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-semibold tracking-wide text-gold-600 dark:text-gold-400">TIASAS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors" href="#vision">Vision</a>
            <a className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors" href="#suite">Products</a>
            <a className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors" href="#market-desk">Market Desk</a>
            <a className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors" href="#security">Security</a>
            <a className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors" href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="#signup" className="hidden sm:inline-block text-sm font-medium px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Join waitlist</a>
            <Link href="/signin" className="text-sm font-medium px-4 py-2 rounded-xl bg-gold-600 hover:bg-gold-700 text-white transition-colors">Sign in</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight">A disciplined home for family finance</h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-300">TIASAS brings your investing work into one place. Start with notes and daily P&L. Grow into secure aggregation, clean charts, and thoughtful analysis.</p>
            <div className="mt-8 flex gap-3">
              <a href="#market-desk" className="px-5 py-3 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-medium transition-colors">Explore Market Desk</a>
              <a href="#suite" className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">See the suite</a>
            </div>
          </div>
          <div className="lg:pl-8">
            <div
              ref={previewCardRef}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 transition-transform duration-300 ease-out"
              style={{ transform: `translateY(-${previewCardOffset}px)` }}
            >
              <div className="bg-gray-50 dark:bg-slate-900 p-3 text-sm text-gray-600 dark:text-slate-400">Preview</div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-sm font-medium">Monthly Performance</div>
                    <div className="mt-3 h-32 w-full">
                      <svg viewBox="0 0 300 100" className="w-full h-full" aria-hidden="true">
                        {/* Grid lines */}
                        <line x1="0" y1="25" x2="300" y2="25" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-slate-700" />
                        <line x1="0" y1="50" x2="300" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-slate-700" />
                        <line x1="0" y1="75" x2="300" y2="75" stroke="currentColor" strokeWidth="0.5" className="text-gray-200 dark:text-slate-700" />

                        {/* Area fill */}
                        <path
                          ref={areaPathRef}
                          d="M 0 80 L 30 70 L 60 75 L 90 55 L 120 60 L 150 45 L 180 50 L 210 35 L 240 40 L 270 25 L 300 30 L 300 100 L 0 100 Z"
                          fill="url(#gradient)"
                          className="opacity-0"
                        />

                        {/* Line chart */}
                        <path
                          ref={chartPathRef}
                          d="M 0 80 L 30 70 L 60 75 L 90 55 L 120 60 L 150 45 L 180 50 L 210 35 L 240 40 L 270 25 L 300 30"
                          fill="none"
                          stroke="url(#lineGradient)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="chart-line"
                        />

                        {/* Gradients */}
                        <defs>
                          <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" className="text-gold-400" stopColor="currentColor" />
                            <stop offset="100%" className="text-gold-600" stopColor="currentColor" />
                          </linearGradient>
                          <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0%" className="text-gold-500" stopColor="currentColor" />
                            <stop offset="100%" className="text-gold-600" stopColor="currentColor" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-sm font-medium">Positions</div>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li className="flex justify-between"><span>SPY</span><span className="text-green-600 dark:text-green-400">+1.8%</span></li>
                      <li className="flex justify-between"><span>UNH</span><span className="text-red-600 dark:text-red-400">-0.7%</span></li>
                      <li className="flex justify-between"><span>APP</span><span className="text-green-600 dark:text-green-400">+3.2%</span></li>
                    </ul>
                  </div>
                  <div className="col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-sm font-medium">Journal</div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">Booked profits on covered calls. Watch UNH gap at 540. Note CPI on Wednesday.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section id="vision" className="border-t dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold">Principles</h2>
          <div ref={principleCardsRef} className="mt-6 grid md:grid-cols-3 gap-6">
            <div className="principle-card rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 opacity-0 translate-y-8 transition-all duration-700 ease-out">
              <div className="text-lg font-medium">Clarity over noise</div>
              <p className="mt-2 text-gray-600 dark:text-slate-300">Keep records clean. Let charts speak. Decisions follow from evidence.</p>
            </div>
            <div className="principle-card rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 opacity-0 translate-y-8 transition-all duration-700 ease-out">
              <div className="text-lg font-medium">Privacy first</div>
              <p className="mt-2 text-gray-600 dark:text-slate-300">Read-only aggregation and careful data handling as a default posture.</p>
            </div>
            <div className="principle-card rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 opacity-0 translate-y-8 transition-all duration-700 ease-out">
              <div className="text-lg font-medium">Steady craft</div>
              <p className="mt-2 text-gray-600 dark:text-slate-300">Daily notes. Monthly reviews. Yearly perspective. A quiet routine that compounds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Suite */}
      <section id="suite" className="border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-semibold">The TIASAS suite</h2>
          <p className="mt-2 text-gray-600 dark:text-slate-300">Start with Market Desk. Add tools as your needs grow.</p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <FeatureCard title="Market Desk" text="Journal, P&L, charts, and broker aggregation in one place." tag="Available" />
            <FeatureCard title="Research Notes" text="Capture theses, risks, and updates with tidy templates." tag="Planned" />
            <FeatureCard title="Capital Ledger" text="Track contributions, withdrawals, and fees with auditability." tag="Planned" />
          </div>
        </div>
      </section>

      {/* Market Desk spotlight */}
      <section id="market-desk" className="border-t dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl font-semibold">TIASAS Market Desk</h2>
            <ul className="mt-4 space-y-3 text-gray-700 dark:text-slate-300 text-base list-disc list-inside">
              <li>Daily trade log with notes and tags</li>
              <li>Monthly and yearly performance views</li>
              <li>Read-only broker connections when you are ready</li>
              <li>Benchmarks against broad market indices</li>
              <li>Calm summaries that highlight what changed</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <a href="#signup" className="px-5 py-3 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-medium transition-colors">Join waitlist</a>
              <Link href="/signin" className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Sign in</Link>
            </div>
          </div>
          <div className="lg:pl-8">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800">
              <h3 className="text-lg font-medium">What you can expect</h3>
              <ol className="mt-3 list-decimal list-inside text-gray-700 dark:text-slate-300 space-y-2">
                <li>Start with a journal. Log trades and observations.</li>
                <li>Connect brokers in read-only mode.</li>
                <li>Review clear charts and simple summaries.</li>
                <li>Ask questions in plain language.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section id="security" className="border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold">Security & Privacy</h2>
            <p className="mt-2 text-gray-600 dark:text-slate-300">Built with trust, transparency, and ethical AI use at the core</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Encryption at Rest */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Encrypted at Rest</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-300">All API keys and sensitive credentials are encrypted using AES-256 encryption before being stored in our database. Your secrets are never stored in plain text.</p>
            </div>

            {/* Encryption in Transit */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Secured in Transit</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-300">All data transmission uses TLS 1.3 encryption. Your information is protected end-to-end from your browser to our servers and back.</p>
            </div>

            {/* Ethical AI */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium">Ethical AI Use</h3>
              </div>
              <p className="text-gray-600 dark:text-slate-300">We use AI to enhance your analysis, not to train on your private data. Your financial information stays yours. AI providers process requests ephemerally with no data retention.</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Questions about security? Read our detailed <a href="/security" className="text-gold-600 dark:text-gold-400 hover:underline font-medium">security documentation</a>
            </p>
          </div>
        </div>
      </section>

      {/* Signup */}
      <section id="signup" className="border-t dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl font-semibold">Join the early list</h2>
            <p className="mt-2 text-gray-600 dark:text-slate-300">Add your email to hear when Market Desk is ready for testing.</p>
            <form onSubmit={handleSubmit} className="mt-6 flex max-w-md gap-3">
              <input
                aria-label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <button type="submit" className="px-5 py-3 rounded-xl bg-gold-600 hover:bg-gold-700 text-white font-medium transition-colors">Notify me</button>
            </form>
            {submitted && (
              <p className="mt-3 text-sm text-green-700 dark:text-green-400">Thanks. You are on the list.</p>
            )}
          </div>
          <div className="lg:pl-8">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800">
              <h3 className="text-lg font-medium">Privacy note</h3>
              <p className="mt-2 text-gray-600 dark:text-slate-300">Aggregation is designed for read-only access. Your data stays within your account. We will publish a short, plain policy before launch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t dark:border-slate-700">
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

function FeatureCard({ title, text, tag }: { title: string; text: string; tag: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <span className="text-xs px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">{tag}</span>
      </div>
      <p className="mt-2 text-gray-600 dark:text-slate-300">{text}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6 bg-white dark:bg-slate-800">
      <div className="font-medium">{q}</div>
      <p className="mt-2 text-gray-600 dark:text-slate-300">{a}</p>
    </div>
  );
}
