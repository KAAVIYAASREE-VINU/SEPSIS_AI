import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showScore?: number;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showScore }) => {
  const getStyles = () => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-50 text-red-800 border-red-300 font-semibold';
      case 'MODERATE':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
      case 'LOW':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs tracking-wider';
      case 'lg':
        return 'px-3 py-1.5 text-sm tracking-wide';
      case 'md':
      default:
        return 'px-2.5 py-1 text-xs tracking-wider';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border uppercase font-mono ${getStyles()} ${getSizeClasses()}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          level === 'HIGH' ? 'bg-red-600' : level === 'MODERATE' ? 'bg-amber-600' : 'bg-emerald-600'
        }`}
      />
      <span>{level} RISK</span>
      {showScore !== undefined && (
        <span className="font-mono opacity-85">({showScore})</span>
      )}
    </span>
  );
};
