import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { WBCPoint, Patient } from '../types';

interface WBCTrendProps {
  data: WBCPoint[];
  patient: Patient;
}

export const WBCTrend: React.FC<WBCTrendProps> = ({ data, patient }) => {
  const chartData = data && data.length > 0 ? data : [
    { time: '14 Sep 08:00', wbc: 9.5 },
    { time: '14 Sep 18:00', wbc: 11.0 },
    { time: '15 Sep 04:00', wbc: patient.currentLabs.wbc || 12.0 },
  ];

  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];
  const latestWbc = latestPoint.wbc;
  const wbcDelta = Number((latestWbc - firstPoint.wbc).toFixed(1));

  // Clinical ranges: Normal 4.0 - 11.0 ×10⁹/L
  const isSevereLeukocytosis = latestWbc >= 16.0;
  const isLeukocytosis = latestWbc > 11.0 && latestWbc < 16.0;
  const isLeukopenia = latestWbc < 4.0;
  const isNormal = latestWbc >= 4.0 && latestWbc <= 11.0;

  let statusBadgeColor = 'text-teal-700 bg-teal-50 border-teal-200';
  let statusText = 'Normal Limits';

  if (isSevereLeukocytosis) {
    statusBadgeColor = 'text-red-700 bg-red-50 border-red-200';
    statusText = 'Marked Leukocytosis';
  } else if (isLeukocytosis) {
    statusBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
    statusText = 'Leukocytosis';
  } else if (isLeukopenia) {
    statusBadgeColor = 'text-red-700 bg-red-50 border-red-200';
    statusText = 'Leukopenia';
  }

  // Generate clinical trend summary
  let trendSummary = 'WBC count stable within normal physiologic boundaries';
  if (isSevereLeukocytosis && wbcDelta > 3.0) {
    trendSummary = `WBC count escalating sharply (+${wbcDelta} ×10⁹/L) reflecting aggressive bacteremia`;
  } else if (isSevereLeukocytosis) {
    trendSummary = 'Persistent severe leukocytosis indicative of unresolved systemic infection';
  } else if (wbcDelta > 1.5) {
    trendSummary = `WBC count increasing compared with previous measurement (+${wbcDelta} ×10⁹/L)`;
  } else if (wbcDelta <= -2.5) {
    trendSummary = `Inflammatory response resolving downward (${wbcDelta} ×10⁹/L) toward normal limits`;
  } else if (Math.abs(wbcDelta) <= 0.5 && isNormal) {
    trendSummary = 'Normal baseline leukocyte concentration maintained without elevation';
  } else if (Math.abs(wbcDelta) <= 0.5) {
    trendSummary = 'Plateaued leukocyte trajectory with stable inflammatory marker activity';
  }

  // Custom Dot component to emphasize abnormal points without gradients
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const val = payload.wbc;
    const isAbnormal = val > 11.0 || val < 4.0;
    const isSevere = val >= 15.0 || val < 3.0;

    if (isSevere) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#ffffff" stroke="#dc2626" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={2.5} fill="#dc2626" />
        </g>
      );
    }

    if (isAbnormal) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke="#d97706" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={2} fill="#d97706" />
        </g>
      );
    }

    return (
      <circle cx={cx} cy={cy} r={3.5} fill="#ffffff" stroke="#0f766e" strokeWidth={1.75} />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const w = p.wbc;
      let interp = 'Normal';
      let interpColor = 'text-teal-400';
      if (w >= 16.0) {
        interp = 'Marked Leukocytosis';
        interpColor = 'text-red-400';
      } else if (w > 11.0) {
        interp = 'Elevated (Leukocytosis)';
        interpColor = 'text-amber-400';
      } else if (w < 4.0) {
        interp = 'Low (Leukopenia)';
        interpColor = 'text-red-400';
      }

      return (
        <div className="bg-[#0f172a] text-white p-2.5 rounded-[4px] border border-slate-700 shadow-md text-xs font-mono">
          <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
            Specimen Time: {p.time}
          </div>
          <div className="flex items-center justify-between gap-4 mt-1.5">
            <span className="text-slate-300 font-sans">White Cell Count:</span>
            <span className="font-bold text-sm text-white">
              {w.toFixed(1)} <span className="text-slate-400 text-xs">×10⁹/L</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1 text-[10px]">
            <span className="text-slate-400">Interpretation:</span>
            <span className={`font-semibold ${interpColor}`}>{interp}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Normal reference: 4.0–11.0 ×10⁹/L
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="wbc-trend-card"
      className="bg-white rounded-[6px] border border-[#e2e8f0] p-4 flex flex-col justify-between"
    >
      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748b] block">
              Hematology Biomarker
            </span>
            <h4 className="text-sm font-semibold text-[#0f172a] mt-0.5">
              WBC Count Trend
            </h4>
          </div>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[3px] border ${statusBadgeColor}`}
          >
            {statusText}
          </span>
        </div>

        {/* Latest value & timestamp */}
        <div className="flex items-baseline justify-between mt-3 mb-2 pt-2 border-t border-[#f1f5f9]">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl font-bold tracking-tight ${
                isSevereLeukocytosis
                  ? 'text-red-700'
                  : isLeukocytosis || isLeukopenia
                  ? 'text-amber-700'
                  : 'text-[#0f172a]'
              }`}
            >
              {latestWbc.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-[#64748b]">×10⁹/L</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#64748b] block">
              Latest: {latestPoint.time}
            </span>
            <span className="text-[10px] font-mono text-[#94a3b8]">
              Normal: 4.0–11.0 ×10⁹/L
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-44 my-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -22, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            {/* Normal reference range boundaries (4.0 - 11.0 ×10⁹/L) */}
            <ReferenceLine
              y={11.0}
              stroke="#d97706"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Upper Ref (11.0)',
                fill: '#b45309',
                fontSize: 9,
                fontFamily: 'IBM Plex Mono',
                position: 'insideTopRight',
              }}
            />
            <ReferenceLine
              y={4.0}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Lower Ref (4.0)',
                fill: '#64748b',
                fontSize: 9,
                fontFamily: 'IBM Plex Mono',
                position: 'insideBottomRight',
              }}
            />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(val: string) => {
                // Shorten timestamp if formatted like "14 Sep 12:00" to "12:00" or similar
                const parts = val.split(' ');
                return parts.length > 2 ? parts[2] : val;
              }}
            />
            <YAxis
              domain={[0, 22]}
              ticks={[0, 4, 8, 11, 15, 20]}
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="wbc"
              stroke={isSevereLeukocytosis ? '#dc2626' : isLeukocytosis ? '#d97706' : '#0f766e'}
              strokeWidth={2}
              dot={<CustomizedDot />}
              activeDot={{
                r: 6,
                fill: isSevereLeukocytosis ? '#dc2626' : '#0f766e',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Clinical Trend summary footer */}
      <div className="pt-2 border-t border-[#f1f5f9] mt-2">
        <div className="flex items-start gap-1.5 text-[11px] text-[#475569]">
          <span className="font-mono text-[#64748b] font-medium shrink-0">Summary:</span>
          <span className="font-medium text-[#1e293b] leading-tight">{trendSummary}</span>
        </div>
      </div>
    </div>
  );
};
