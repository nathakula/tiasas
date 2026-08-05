
"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtCompact = new Intl.NumberFormat(undefined, { notation: "compact", compactDisplay: "short" });

function formatMonthLabel(monthStr: string) {
    const [, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1] || monthStr;
}

function PnlTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{formatMonthLabel(label)}</p>
            {payload.map((entry: any, index: number) => (
                <p key={index} className="text-sm text-slate-600 dark:text-slate-400">
                    Realized P&L:{' '}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{fmt.format(entry.value)}</span>
                </p>
            ))}
        </div>
    );
}

function NavTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const withdrawal: number | undefined = payload[0]?.payload?.withdrawal;
    const deposit: number | undefined = payload[0]?.payload?.deposit;
    return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{formatMonthLabel(label)}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
                NAV: <span className="font-medium text-slate-900 dark:text-slate-100">{fmt.format(payload[0].value)}</span>
            </p>
            {withdrawal ? (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                    ▼ Capital withdrawn: {fmt.format(withdrawal)}
                </p>
            ) : null}
            {deposit ? (
                <p className="text-sm text-sky-600 dark:text-sky-400 mt-1">
                    ▲ Capital deposited: {fmt.format(deposit)}
                </p>
            ) : null}
        </div>
    );
}

function WithdrawalDot(props: any) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    if (payload?.withdrawal) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={7} fill="#f59e0b" stroke="white" strokeWidth={2} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">▼</text>
            </g>
        );
    }
    if (payload?.deposit) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={7} fill="#0ea5e9" stroke="white" strokeWidth={2} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">▲</text>
            </g>
        );
    }
    return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
}

export function MonthlyPnlChart({ monthly }: { monthly: { month: string; realized: number }[] }) {
    return (
        <div className="h-64">
            <ResponsiveContainer>
                <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
                    <YAxis tickFormatter={(v) => fmtCompact.format(v)} />
                    <Tooltip content={<PnlTooltip />} />
                    <Bar dataKey="realized" fill="#0ea5e9" radius={[6, 6, 0, 0]} animationDuration={3000} animationEasing="ease-out" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

interface NavDataPoint {
    month: string;
    navEnd: number;
    withdrawal?: number;
    deposit?: number;
}

export function NavByMonthChart({
    monthly,
    withdrawalsByMonth = {},
    depositsByMonth = {},
}: {
    monthly: { month: string; navEnd: number | null }[];
    withdrawalsByMonth?: Record<string, number>;
    depositsByMonth?: Record<string, number>;
}) {
    const dataWithCarryForward: NavDataPoint[] = [];
    let lastKnownNav: number | null = null;

    for (const m of monthly) {
        const hasValidNav = m.navEnd != null && m.navEnd !== 0;
        const point: NavDataPoint = { month: m.month, navEnd: 0 };

        if (hasValidNav) {
            lastKnownNav = m.navEnd!;
            point.navEnd = m.navEnd!;
        } else if (lastKnownNav != null) {
            point.navEnd = lastKnownNav;
        } else {
            continue;
        }

        if (withdrawalsByMonth[m.month]) point.withdrawal = withdrawalsByMonth[m.month];
        if (depositsByMonth[m.month]) point.deposit = depositsByMonth[m.month];

        dataWithCarryForward.push(point);
    }

    const hasData = dataWithCarryForward.length > 0;
    const hasTransferMarkers = dataWithCarryForward.some(d => d.withdrawal || d.deposit);

    return (
        <div className="h-64">
            {hasData ? (
                <>
                    <ResponsiveContainer>
                        <LineChart data={dataWithCarryForward}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tickFormatter={formatMonthLabel} />
                            <YAxis
                                domain={['auto', 'auto']}
                                tickFormatter={(v) => fmtCompact.format(v)}
                            />
                            <Tooltip content={<NavTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="navEnd"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={<WithdrawalDot />}
                                activeDot={{ r: 5 }}
                                animationDuration={3000}
                                animationEasing="ease-out"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    {hasTransferMarkers && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                            <span className="text-amber-500">▼</span> capital withdrawn &nbsp;
                            <span className="text-sky-500">▲</span> capital deposited
                        </p>
                    )}
                </>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">No month-end NAV data</div>
            )}
        </div>
    );
}
