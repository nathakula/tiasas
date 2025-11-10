import Link from "next/link";

export default function Page() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <section className="text-center mb-16">
        <h1 className="text-4xl font-semibold mb-4">TIASAS</h1>
        <p className="text-slate-600">A family studio for craft and markets.</p>
      </section>
      <section className="grid md:grid-cols-3 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-medium mb-2">Vision</h2>
          <p className="text-slate-600 mb-4">Build lasting systems for learning and compounding.</p>
          <Link className="text-blue-600" href="#vision">Learn more</Link>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-medium mb-2">Suite</h2>
          <p className="text-slate-600 mb-4">Apps under one auth and design system.</p>
          <Link className="text-blue-600" href="#suite">Explore</Link>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-medium mb-2">Market Desk</h2>
          <p className="text-slate-600 mb-4">Journal, trades, and charts.</p>
          <Link className="text-blue-600" href="/app/market-desk">Open app</Link>
        </div>
      </section>
    </main>
  );
}
