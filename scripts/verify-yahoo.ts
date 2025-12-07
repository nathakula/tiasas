
import { fetchBenchmarkSeries } from "../packages/core/src/market/benchmarks";

async function main() {
    try {
        console.log("Fetching SPY benchmark data for YTD 2025...");
        const startDate = new Date("2025-01-01T00:00:00Z");

        // Mocking getChart if we can't import it directly? 
        // No, we are importing the higher level function which calls it.
        // Assuming the environment is set up correctly for tsx to run this.

        const series = await fetchBenchmarkSeries(["SPY"], "1y", startDate, new Date());

        if (series.length > 0) {
            const spy = series[0];
            console.log(`Symbol: ${spy.symbol}`);
            console.log(`Data Points: ${spy.data.length}`);

            if (spy.data.length > 0) {
                const first = spy.data[0];
                const last = spy.data[spy.data.length - 1];
                const mid = spy.data[Math.floor(spy.data.length / 2)];

                console.log("--- First Point ---");
                console.log(JSON.stringify(first, null, 2));

                console.log("--- Mid Point ---");
                console.log(JSON.stringify(mid, null, 2));

                console.log("--- Last Point ---");
                console.log(JSON.stringify(last, null, 2));

                console.log(`\nCalculated YTD Return: ${spy.ytdReturn.toFixed(2)}%`);

                // Check for "Daily Return" pattern (values small and oscillating)
                const isSmall = spy.data.every(d => Math.abs(d.percentReturn) < 5);
                if (isSmall && spy.ytdReturn < 5) {
                    console.warn("WARNING: Values look like they might be daily returns or flattened!");
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
