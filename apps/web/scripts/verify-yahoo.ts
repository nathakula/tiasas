
import { fetchBenchmarkSeries } from "../../../packages/core/src/market/benchmarks";

async function main() {
    try {
        console.log("Fetching SPY benchmark data for YTD 2025...");
        // Use a fixed start date for testing
        const startDate = new Date("2025-01-01T00:00:00Z");

        const series = await fetchBenchmarkSeries(["SPY", "QQQ"], "1y", startDate, new Date());

        if (series.length > 0) {
            for (const spy of series) {
                console.log(`\nSymbol: ${spy.symbol}`);
                console.log(`Data Points: ${spy.data.length}`);

                if (spy.data.length > 0) {
                    const first = spy.data[0];
                    const last = spy.data[spy.data.length - 1];
                    const mid = spy.data[Math.floor(spy.data.length / 2)];

                    console.log("--- First Point ---");
                    console.log(`Date: ${first.date}, Close: ${first.close}, Return: ${first.percentReturn}%`);

                    console.log("--- Mid Point ---");
                    console.log(`Date: ${mid.date}, Close: ${mid.close}, Return: ${mid.percentReturn}%`);

                    console.log("--- Last Point ---");
                    console.log(`Date: ${last.date}, Close: ${last.close}, Return: ${last.percentReturn}%`);

                    console.log(`Calculated YTD Return: ${spy.ytdReturn.toFixed(2)}%`);

                    // Check for "Daily Return" pattern (values small and oscillating)
                    // If all absolute values are < 5% (unlikely for YTD QQQ/SPY which should grow), valid concern.
                    const isSmall = spy.data.every(d => Math.abs(d.percentReturn) < 5);
                    if (isSmall && Math.abs(spy.ytdReturn) < 5) {
                        console.warn("WARNING: Values look like they might be daily returns or flattened!");
                    } else {
                        console.log("PASS: Values show significant movement consistent with cumulative returns.");
                    }
                }
            }
        } else {
            console.error("No series returned.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
