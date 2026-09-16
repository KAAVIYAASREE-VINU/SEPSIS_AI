import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: 15 Sep 2026, 05:04:12 UTC (or local)
      const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setCurrentTime(now.toLocaleString('en-GB', options));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      id="top-header"
      className="bg-white border-b border-[#e2e8f0] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20"
    >
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[#0f172a] font-sans">
            {title}
          </h1>
          {/* Mandatory Prototype Simulated Data Badge */}
          <span
            id="prototype-tag"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300 rounded-[4px]"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            Prototype — Simulated Data
          </span>
        </div>
        <p className="text-xs text-[#475569] mt-0.5 max-w-2xl font-sans">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {/* Current Timestamp */}
        <div
          id="system-timestamp"
          className="flex items-center gap-2 px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-[4px] text-xs font-mono text-[#334155]"
        >
          <Clock className="w-3.5 h-3.5 text-[#64748b]" />
          <span>{currentTime || '15 Sep 2026, 05:04:00'}</span>
        </div>

        {/* Clinical Guardrail Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[#64748b] border-l border-[#e2e8f0] pl-4">
          <span className="w-2 h-2 rounded-full bg-teal-600"></span>
          <span className="font-mono uppercase tracking-wider">CDS Decision Support Only</span>
        </div>
      </div>
    </header>
  );
};
