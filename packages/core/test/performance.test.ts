
import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculatePortfolioRatios } from "../src/services/performance";
import { db } from "@tiasas/database";

// Local Mock for Decimal to avoid import mocking issues
class MockDecimal {
    constructor(private value: number) { }
    plus(other: MockDecimal) {
        return new MockDecimal(this.value + other.value);
    }
    toNumber() {
        return this.value;
    }
}

// Mock the database
vi.mock("@tiasas/database", () => ({
    db: {
        dailyPnl: {
            findMany: vi.fn(),
        },
    },
}));

describe("calculatePortfolioRatios", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("should return nulls for empty data", async () => {
        vi.mocked(db.dailyPnl.findMany).mockResolvedValue([]);
        const result = await calculatePortfolioRatios("org1");
        expect(result.sharpeRatio).toBeNull();
        expect(result.daysAnalyzed).toBe(0);
    });

    it("should calculate Correct Ratios for stable returns", async () => {
        // 5 Days of 1% return exactly. 
        // Risk Free Daily ~= 0.0425/252 ~= 0.000168 (0.016%)
        // Mean = 0.01
        // StdDev = 0 (Variance is 0 for identical values) -> Infinite Sharpe if logic didn't handle 0 div
        // Let's vary it slightly: 1%, 2%, 1%, 2%

        // Equity: 1000
        // Day 1: PnL 10. Return 0.01
        // Day 2: PnL 20. Return 0.02
        // Day 3: PnL 10. Return 0.01
        // Day 4: PnL 20. Return 0.02

        // Mean = 0.015
        // Variance = [(0.005)^2 + (-0.005)^2 + (0.005)^2 + (-0.005)^2] / 3 = 0.0001 / 3 = 0.0000333
        // StdDev = 0.00577

        const mockData = [
            { date: new Date(), realizedPnl: new MockDecimal(10), unrealizedPnl: new MockDecimal(0), totalEquity: new MockDecimal(1000) },
            { date: new Date(), realizedPnl: new MockDecimal(20), unrealizedPnl: new MockDecimal(0), totalEquity: new MockDecimal(1000) },
            { date: new Date(), realizedPnl: new MockDecimal(10), unrealizedPnl: new MockDecimal(0), totalEquity: new MockDecimal(1000) },
            { date: new Date(), realizedPnl: new MockDecimal(20), unrealizedPnl: new MockDecimal(0), totalEquity: new MockDecimal(1000) },
        ];

        vi.mocked(db.dailyPnl.findMany).mockResolvedValue(mockData as any);

        const result = await calculatePortfolioRatios("org1");

        expect(result.sharpeRatio).not.toBeNull();
        expect(result.sharpeRatio).toBeGreaterThan(0);
        expect(result.daysAnalyzed).toBe(4);
    });
});
