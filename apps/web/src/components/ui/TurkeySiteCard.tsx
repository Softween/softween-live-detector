import { useTranslation } from 'react-i18next';

interface Props {
  name: string;
  url: string;
  status: 'up' | 'down' | 'unknown';
  responseTime: number | null;
  uptimePercentage: number;
}

function getResponseTimeColor(ms: number | null): string {
  if (ms === null) return 'text-zinc-500';
  if (ms < 200) return 'text-green-400';
  if (ms <= 500) return 'text-yellow-400';
  return 'text-red-400';
}

function getStatusDot(status: 'up' | 'down' | 'unknown') {
  if (status === 'up') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
    );
  }
  if (status === 'down') {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
      </span>
    );
  }
  return <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-500" />;
}

export default function TurkeySiteCard({ name, url, status, responseTime, uptimePercentage }: Props) {
  const { t } = useTranslation();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {getStatusDot(status)}
          <span className="text-sm font-medium text-zinc-200 truncate">{name}</span>
        </div>
        {responseTime !== null && (
          <span className={`text-xs font-mono tabular-nums ${getResponseTimeColor(responseTime)}`}>
            {responseTime}ms
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500">{t('turkey.uptime30d')}</span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                uptimePercentage >= 99 ? 'bg-emerald-500' : uptimePercentage >= 95 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(uptimePercentage, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-zinc-400">{uptimePercentage.toFixed(1)}%</span>
        </div>
      </div>
    </a>
  );
}
