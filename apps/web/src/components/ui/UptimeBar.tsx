import type { DailyUptime } from 'shared';

interface UptimeBarProps {
  data: DailyUptime[];
  days?: number;
}

export default function UptimeBar({ data, days = 90 }: UptimeBarProps) {
  // Create a map for quick lookup
  const map = new Map(data.map((d) => [d.date, d]));

  // Generate all days
  const bars: { date: string; pct: number; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = map.get(dateStr);
    bars.push({
      date: dateStr,
      pct: entry ? entry.uptime_pct : -1, // -1 = no data
      total: entry ? entry.total : 0,
    });
  }

  return (
    <div className="flex gap-px items-end" style={{ height: 32 }}>
      {bars.map((bar) => {
        const color =
          bar.total === 0
            ? 'bg-zinc-800'
            : bar.pct >= 99
              ? 'bg-emerald-500'
              : bar.pct >= 95
                ? 'bg-yellow-500'
                : 'bg-red-500';

        return (
          <div
            key={bar.date}
            className={`flex-1 min-w-[2px] rounded-sm ${color} transition-all hover:opacity-80`}
            style={{ height: bar.total === 0 ? 8 : 32 }}
            title={`${bar.date}: ${bar.total === 0 ? 'No data' : `${bar.pct}%`}`}
          />
        );
      })}
    </div>
  );
}
