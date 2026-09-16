import React from 'react';

interface VitalCardProps {
  label: string;
  value: string | number;
  unit?: string;
  reference?: string;
  status?: 'normal' | 'warning' | 'critical';
  subtext?: string;
}

export const VitalCard: React.FC<VitalCardProps> = ({
  label,
  value,
  unit,
  reference,
  status = 'normal',
  subtext,
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'critical':
        return {
          container: 'bg-[#fff5f5] border-red-300',
          value: 'text-red-700',
          indicator: 'bg-red-600',
          tag: 'text-red-700 bg-red-100',
        };
      case 'warning':
        return {
          container: 'bg-[#fffdf5] border-amber-300',
          value: 'text-amber-800',
          indicator: 'bg-amber-600',
          tag: 'text-amber-800 bg-amber-100',
        };
      case 'normal':
      default:
        return {
          container: 'bg-white border-[#e2e8f0]',
          value: 'text-[#0f172a]',
          indicator: 'bg-emerald-600',
          tag: 'text-slate-600 bg-slate-100',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      className={`p-3 rounded-[6px] border ${styles.container} transition-colors flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#475569] font-medium truncate">
          {label}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`}></span>
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className={`text-xl font-bold font-mono tracking-tight ${styles.value}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono text-[#64748b] font-normal">
            {unit}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#64748b] font-mono pt-1 border-t border-[#f1f5f9]">
        <span>{reference ? `Ref: ${reference}` : (subtext || 'Normal range')}</span>
        {status !== 'normal' && (
          <span className={`px-1 py-0.2 rounded text-[10px] uppercase font-semibold ${styles.tag}`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
};
