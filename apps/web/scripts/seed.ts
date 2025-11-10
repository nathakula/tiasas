/*
  Seed script for TIASAS v0.1
  - Org: TIASAS Family
  - User placeholder
  - Membership OWNER
  - One month of sample trades and daily P&L
  - Benchmarks SPY & QQQ
*/
import { prisma } from "@/lib/db";
import { addDays, eachDayOfInterval, endOfMonth, startOfMonth } from "date-fns";

async function main() {
  const email = process.env.SEED_EMAIL ?? "sri@example.com";
  const existingUser = await prisma.user.upsert({
    where: { email },
    update: { name: "Sri" },
    create: { email, name: "Sri" },
  });
  const org = await prisma.org.upsert({
    where: { id: "seed-org" },
    update: { name: "TIASAS Family" },
    create: { id: "seed-org", name: "TIASAS Family" },
  });
  await prisma.membership.upsert({
    where: { userId_orgId: { userId: existingUser.id, orgId: org.id } },
    update: { role: "OWNER" as any },
    create: { userId: existingUser.id, orgId: org.id, role: "OWNER" as any },
  });

  // Sample month data
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });
  let nav = 100000;
  for (const d of days) {
    const realized = rand(-500, 700);
    const unreal = rand(-200, 200);
    nav += realized + unreal * 0.1;
    await prisma.dailyPnl.upsert({
      where: { orgId_date: { orgId: org.id, date: d } },
      update: { realizedPnl: realized.toFixed(2) as any, unrealizedPnl: unreal.toFixed(2) as any, navEnd: nav.toFixed(2) as any },
      create: { orgId: org.id, date: d, realizedPnl: realized.toFixed(2) as any, unrealizedPnl: unreal.toFixed(2) as any, navEnd: nav.toFixed(2) as any },
    });
  }

  // Sample trades
  for (let i = 0; i < 15; i++) {
    const d = addDays(start, i * 2);
    await prisma.trade.create({
      data: {
        orgId: org.id,
        userId: existingUser.id,
        date: d,
        symbol: i % 2 === 0 ? "SPY" : "QQQ",
        side: i % 3 === 0 ? ("SELL" as any) : ("BUY" as any),
        qty: (Math.random() * 3 + 1).toFixed(0) as any,
        price: (Math.random() * 300 + 100).toFixed(2) as any,
        fees: (Math.random() * 2).toFixed(2) as any,
        strategyTag: "discretionary",
        notes: "seed",
      },
    });
  }

  // Benchmarks SPY & QQQ
  let spy = 500;
  let qqq = 440;
  for (const d of days) {
    spy += rand(-2, 3);
    qqq += rand(-2, 3);
    await prisma.benchmarkSnapshot.create({ data: { date: d, symbol: "SPY", price: spy.toFixed(2) as any } });
    await prisma.benchmarkSnapshot.create({ data: { date: d, symbol: "QQQ", price: qqq.toFixed(2) as any } });
  }

  console.log("Seed complete", { org: org.name, user: existingUser.email });
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

