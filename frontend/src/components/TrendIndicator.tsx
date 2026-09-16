import React from 'react';
import { TrendDirection } from '../types';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

interface TrendIndicatorProps {
  trend: TrendDirection;
  delta?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend, delta, size = 'md' }) => {
  const getTrendData = () => {
    switch (trend) {
      case 'RAPID_DETERIORATION':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600 animate-pulse" />,
          symbol: '⚠',
          label: 'Rapid deterioration',
          className: 'text-red-700 bg-red-50 border-red-200 font-semibold',
          deltaColor: 'text-red-700 font-bold',
        };
      case 'RISING':
        return {
          icon: <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-amber-700" />,
          symbol: '↑',
          label: 'Rising',
          className: 'text-amber-800 bg-amber-50 border-amber-200 font-medium',
          deltaColor: 'text-amber-800',
        };
      case 'IMPROVING':
        return {
          icon: <ArrowDownRight className="w-3.5 h-3.5 shrink-0 text-emerald-700" />,
          symbol: '↓',
          label: 'Improving',
          className: 'text-emerald-800 bg-emerald-50 border-emerald-200 font-medium',
          deltaColor: 'text-emerald-800',
        };
      case 'STABLE':
      default:
        return {
          icon: <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-500" />,
          symbol: '→',
          label: 'Stable',
          className: 'text-slate-700 bg-slate-100 border-slate-200 font-medium',
          deltaColor: 'text-slate-600',
        };
    }
  };

  const data = getTrendData();

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-2.5 py-1 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-[4px] border border-solid ${data.className} ${sizeClasses}`}
      title={`Trend: ${data.label}${delta !== undefined ? ` (Delta: ${delta > 0 ? `+${delta}` : delta})` : ''}`}
    >
      <span className="font-mono text-sm leading-none">{data.symbol}</span>
      <span className="whitespace-nowrap">{data.label}</span>
      {delta !== undefined && delta !== 0 && (
        <span className={`font-mono ml-0.5 text-[11px] ${data.deltaColor}`}>
          ({delta > 0 ? `+${delta}` : delta})
        </span>
      )}
    </span>
  );
};
