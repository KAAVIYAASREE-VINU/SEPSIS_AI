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
import { TemperaturePoint, Patient } from '../types';

interface TemperatureTrendProps {
  data: TemperaturePoint[];
  patient: Patient;
}

export const TemperatureTrend: React.FC<TemperatureTrendProps> = ({ data, patient }) => {
  const chartData = data && data.length > 0 ? data : [
    { time: '06:00', temperature: 37.0 },
    { time: '12:00', temperature: 37.2 },
    { time: '18:00', temperature: patient.currentVitals.temperature },
  ];

  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];
  const latestTemp = latestPoint.temperature;
  const delta = Number((latestTemp - firstPoint.temperature).toFixed(1));

  // Determine clinical status
  const isHighPyrexia = latestTemp >= 38.5;
  const isFever = latestTemp >= 38.0 && latestTemp < 38.5;
  const isHypothermia = latestTemp < 36.0;
  const isNormal = latestTemp >= 36.5 && latestTemp <= 37.5;

  let statusBadgeColor = 'text-teal-700 bg-teal-50 border-teal-200';
  let statusText = 'Normal Range';

  if (isHighPyrexia) {
    statusBadgeColor = 'text-red-700 bg-red-50 border-red-200';
    statusText = 'High Pyrexia';
  } else if (isFever) {
    statusBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
    statusText = 'Elevated / Pyrexia';
  } else if (isHypothermia) {
    statusBadgeColor = 'text-red-700 bg-red-50 border-red-200';
    statusText = 'Hypothermia';
  } else if (!isNormal) {
    statusBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
    statusText = 'Subfebrile';
  }

  // Generate clinical trend summary
  let trendSummary = 'Stable within physiologic range over the last 12 hours';
  if (isHighPyrexia && delta > 0.8) {
    trendSummary = `Marked upward pyrexic spike (+${delta}°C) over the observation window`;
  } else if (isHighPyrexia) {
    trendSummary = 'Sustained hyperpyrexia without defervescence; requires cooling protocol';
  } else if (delta >= 0.5) {
    trendSummary = `Progressive temperature rise (+${delta}°C) compared with previous baseline`;
  } else if (delta <= -0.6) {
    trendSummary = `Defervescing downward (${delta}°C) resolving toward normal clinical baseline`;
  } else if (Math.abs(delta) < 0.3 && isNormal) {
    trendSummary = 'Stable normothermic trajectory maintained across the last 24 hours';
  } else if (Math.abs(delta) < 0.3) {
    trendSummary = 'Plateaued reading with minimal 24-hour baseline variation';
  }

  // Custom Dot component to emphasize abnormal points without gradients
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;
    const temp = payload.temperature;
    const isAbnormal = temp >= 38.2 || temp < 36.0;
    const isSevere = temp >= 38.6;

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
      const t = p.temperature;
      let flag = 'Normal';
      let flagColor = 'text-teal-400';
      if (t >= 38.5) {
        flag = 'High Pyrexia';
        flagColor = 'text-red-400';
      } else if (t >= 38.0) {
        flag = 'Fever';
        flagColor = 'text-amber-400';
      } else if (t < 36.0) {
        flag = 'Hypothermia';
        flagColor = 'text-red-400';
      } else if (t > 37.5) {
        flag = 'Borderline Elevated';
        flagColor = 'text-amber-400';
      }

      return (
        <div className="bg-[#0f172a] text-white p-2.5 rounded-[4px] border border-slate-700 shadow-md text-xs font-mono">
          <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
            Observation Time: {p.time}
          </div>
          <div className="flex items-center justify-between gap-4 mt-1.5">
            <span className="text-slate-300 font-sans">Core Temp:</span>
            <span className="font-bold text-sm text-white">
              {t.toFixed(1)} <span className="text-slate-400 text-xs">°C</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1 text-[10px]">
            <span className="text-slate-400">Status:</span>
            <span className={`font-semibold ${flagColor}`}>{flag}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Reference range: 36.5–37.5 °C
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="temperature-trend-card"
      className="bg-white rounded-[6px] border border-[#e2e8f0] p-4 flex flex-col justify-between"
    >
      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748b] block">
              Core Body Temperature
            </span>
            <h4 className="text-sm font-semibold text-[#0f172a] mt-0.5">
              Temperature Trend (24h)
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
                isHighPyrexia
                  ? 'text-red-700'
                  : isFever || !isNormal
                  ? 'text-amber-700'
                  : 'text-[#0f172a]'
              }`}
            >
              {latestTemp.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-[#64748b]">°C</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#64748b] block">
              Latest: {latestPoint.time}
            </span>
            <span className="text-[10px] font-mono text-[#94a3b8]">
              Target: 36.5–37.5 °C
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
            
            {/* Normal reference range boundaries (36.5 - 37.5 °C) */}
            <ReferenceLine
              y={37.5}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Upper Ref (37.5)',
                fill: '#64748b',
                fontSize: 9,
                fontFamily: 'IBM Plex Mono',
                position: 'insideTopLeft',
              }}
            />
            <ReferenceLine
              y={36.5}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Lower Ref (36.5)',
                fill: '#64748b',
                fontSize: 9,
                fontFamily: 'IBM Plex Mono',
                position: 'insideBottomLeft',
              }}
            />

            {/* Threshold Line at 38.0 °C Pyrexia */}
            <ReferenceLine
              y={38.0}
              stroke="#d97706"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Fever (38.0)',
                fill: '#b45309',
                fontSize: 9,
                fontFamily: 'IBM Plex Mono',
                position: 'insideTopRight',
              }}
            />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[35.5, 40.0]}
              ticks={[36.0, 37.0, 38.0, 39.0, 40.0]}
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="temperature"
              stroke={isHighPyrexia ? '#dc2626' : isFever ? '#d97706' : '#0f766e'}
              strokeWidth={2}
              dot={<CustomizedDot />}
              activeDot={{
                r: 6,
                fill: isHighPyrexia ? '#dc2626' : '#0f766e',
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
