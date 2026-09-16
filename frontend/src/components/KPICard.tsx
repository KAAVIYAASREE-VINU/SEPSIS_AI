import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  id: string;
  label: string;
  value: number | string;
  context: string;
  icon?: LucideIcon;
  variant?: 'default' | 'high-risk' | 'moderate-risk' | 'deteriorating';
}

export const KPICard: React.FC<KPICardProps> = ({
  id,
  label,
  value,
  context,
  icon: Icon,
  variant = 'default',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'high-risk':
        return {
          card: 'border-red-300 bg-white hover:border-red-400',
          number: 'text-red-700',
          label: 'text-red-900',
          iconBg: 'bg-red-50 text-red-700 border-red-200',
          indicator: 'bg-red-600',
        };
      case 'deteriorating':
        return {
          card: 'border-red-300 bg-white hover:border-red-400',
          number: 'text-red-700',
          label: 'text-red-900',
          iconBg: 'bg-red-50 text-red-700 border-red-200',
          indicator: 'bg-red-600 animate-pulse',
        };
      case 'moderate-risk':
        return {
          card: 'border-amber-300 bg-white hover:border-amber-400',
          number: 'text-amber-800',
          label: 'text-amber-900',
          iconBg: 'bg-amber-50 text-amber-800 border-amber-200',
          indicator: 'bg-amber-600',
        };
      case 'default':
      default:
        return {
          card: 'border-[#e2e8f0] bg-white hover:border-slate-300',
          number: 'text-[#0f172a]',
          label: 'text-[#475569]',
          iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
          indicator: 'bg-teal-600',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      id={id}
      className={`p-4 rounded-[6px] border ${styles.card} transition-colors flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`}></span>
          <span
            className={`text-[11px] font-mono font-semibold uppercase tracking-wider ${styles.label}`}
          >
            {label}
          </span>
        </div>
        {Icon && (
          <div
            className={`w-7 h-7 rounded-[4px] border flex items-center justify-center ${styles.iconBg}`}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="my-1">
        <div className={`text-3xl font-bold font-mono tracking-tight ${styles.number}`}>
          {value}
        </div>
      </div>

      <div className="text-xs text-[#64748b] font-sans mt-1 pt-2 border-t border-[#f1f5f9] flex items-center justify-between">
        <span>{context}</span>
      </div>
    </div>
  );
};
