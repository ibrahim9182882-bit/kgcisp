import React from 'react';
import { AccountsSummary, ScanProgress } from '../types';

interface StatsCardsProps {
  summary: AccountsSummary;
  progress: ScanProgress;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ summary, progress }) => {
  const cards = [
    {
      label: 'TOTAL',
      value: summary.total,
      subtext: `${summary.pending} PENDING`,
      valueColor: 'text-white',
      labelColor: 'text-white/40',
      bg: 'bg-white/[0.02]',
    },
    {
      label: 'ONLINE',
      value: summary.online,
      subtext: summary.total > 0 ? `${Math.round((summary.online / summary.total) * 100)}% ACTIVE` : '0%',
      valueColor: 'text-green-500',
      labelColor: 'text-green-500/60',
      bg: 'bg-green-500/[0.02]',
    },
    {
      label: 'OFFLINE',
      value: summary.offline,
      subtext: summary.total > 0 ? `${Math.round((summary.offline / summary.total) * 100)}% DOWN` : '0%',
      valueColor: 'text-red-500',
      labelColor: 'text-red-500/60',
      bg: 'bg-red-500/[0.02]',
    },
    {
      label: 'CHECKING',
      value: progress.isScanning ? (progress.isPaused ? 'PAUSED' : 'ACTIVE') : 'IDLE',
      subtext: progress.currentCheckingUsername ? progress.currentCheckingUsername : 'QUEUE READY',
      valueColor: 'text-yellow-500',
      labelColor: 'text-yellow-500/60',
      bg: 'bg-yellow-500/[0.03]',
    },
    {
      label: 'FAILED',
      value: summary.failed,
      subtext: 'AUTH / ERRORS',
      valueColor: 'text-gray-400',
      labelColor: 'text-white/40',
      bg: 'bg-white/[0.02]',
    },
    {
      label: 'PROGRESS',
      value: `${progress.percentage}%`,
      subtext: progress.completed > 0 ? `${progress.completed}/${summary.total} CHECKED` : 'SCAN READY',
      valueColor: 'text-blue-400',
      labelColor: 'text-blue-400/60',
      bg: 'bg-blue-500/[0.03]',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-white/10 rounded-2xl overflow-hidden bg-[#0C0C0E] shadow-2xl divide-x divide-y lg:divide-y-0 divide-white/5">
      {cards.map((card, idx) => (
        <div key={idx} className={`p-6 flex flex-col justify-between ${card.bg}`}>
          <div>
            <p className={`text-[11px] font-black uppercase tracking-wider mb-1 ${card.labelColor}`}>
              {card.label}
            </p>
            <p className={`text-4xl font-black tracking-tight ${card.valueColor}`}>
              {card.value}
            </p>
          </div>
          <p className="text-[10px] font-mono font-bold text-white/30 uppercase mt-3 truncate">
            {card.subtext}
          </p>
        </div>
      ))}
    </div>
  );
};
