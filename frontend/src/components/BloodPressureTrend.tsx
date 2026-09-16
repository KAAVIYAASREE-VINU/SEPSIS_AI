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
import { BloodPressurePoint, Patient } from '../types';

interface BloodPressureTrendProps {
  data: BloodPressurePoint[];
  patient: Patient;
}

export const BloodPressureTrend: React.FC<BloodPressureTrendProps> = ({ data, patient }) => {
  const chartData = data && data.length > 0 ? data : [
    { time: '06:00', systolic: 120, diastolic: 76 },
    { time: '12:00', systolic: 114, diastolic: 72 },
    {
      time: '18:00',
      systolic: patient.currentVitals.systolicBp,
      diastolic: Math.round(patient.currentVitals.systolicBp * 0.62),
    },
  ];

  const latestPoint = chartData[chartData.length - 1];
  const firstPoint = chartData[0];
  const latestSys = latestPoint.systolic;
  const latestDia = latestPoint.diastolic;
  const sysDelta = latestSys - firstPoint.systolic;

  // MAP (Mean Arterial Pressure) = (2 * diastolic + systolic) / 3
  const latestMap = Math.round((2 * latestDia + latestSys) / 3);

  const isSevereHypotension = latestSys < 90 || latestMap < 65;
  const isBorderlineHypotension = latestSys >= 90 && latestSys < 100;
  const isNormotensive = latestSys >= 100 && latestSys <= 135;

  let statusBadgeColor = 'text-teal-700 bg-teal-50 border-teal-200';
  let statusText = 'Normotensive';

  if (isSevereHypotension) {
    statusBadgeColor = 'text-red-700 bg-red-50 border-red-200';
    statusText = 'Hypotension (Sepsis)';
  } else if (isBorderlineHypotension) {
    statusBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
    statusText = 'Borderline Low';
  } else if (!isNormotensive) {
    statusBadgeColor = 'text-amber-800 bg-amber-50 border-amber-200';
    statusText = 'Elevated BP';
  }

  // Generate clinical trend summary
  let trendSummary = 'Stable normotensive hemodynamics over the last 12 hours';
  if (isSevereHypotension && sysDelta < -15) {
    trendSummary = `Systolic pressure trending downward (${sysDelta} mmHg drop); inadequate perfusion`;
  } else if (isSevereHypotension) {
    trendSummary = 'Persistent arterial hypotension (MAP < 65 mmHg) requiring fluid resuscitation';
  } else if (sysDelta <= -15) {
    trendSummary = `Gradual hemodynamic decline (${sysDelta} mmHg systolic drop) vs 24h baseline`;
  } else if (sysDelta >= 15 && latestSys >= 100) {
    trendSummary = `Hemodynamic recovery with progressive systolic improvement (+${sysDelta} mmHg)`;
  } else if (Math.abs(sysDelta) <= 5) {
    trendSummary = 'Minimal blood pressure volatility across the last 24-hour observation cycle';
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const s = p.systolic;
      const d = p.diastolic;
      const map = Math.round((2 * d + s) / 3);
      const isHypo = s < 90;

      return (
        <div className="bg-[#0f172a] text-white p-2.5 rounded-[4px] border border-slate-700 shadow-md text-xs font-mono">
          <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
            Observation Time: {p.time}
          </div>
          <div className="space-y-1 mt-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                Systolic BP:
              </span>
              <span className={`font-bold ${isHypo ? 'text-red-400' : 'text-white'}`}>
                {s} <span className="text-slate-400 text-[10px]">mmHg</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Diastolic BP:
              </span>
              <span className="font-bold text-white">
                {d} <span className="text-slate-400 text-[10px]">mmHg</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-800 text-[10px]">
            <span className="text-slate-400">Est. MAP:</span>
            <span className={`font-bold ${map < 65 ? 'text-red-400' : 'text-teal-400'}`}>
              {map} mmHg {map < 65 ? '(Under 65)' : ''}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="blood-pressure-trend-card"
      className="bg-white rounded-[6px] border border-[#e2e8f0] p-4 flex flex-col justify-between"
    >
      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748b] block">
              Hemodynamic Profile
            </span>
            <h4 className="text-sm font-semibold text-[#0f172a] mt-0.5">
              Blood Pressure Trend (24h)
            </h4>
          </div>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[3px] border ${statusBadgeColor}`}
          >
            {statusText}
          </span>
        </div>

        {/* Latest values & timestamp */}
        <div className="flex items-baseline justify-between mt-3 mb-2 pt-2 border-t border-[#f1f5f9]">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl font-bold tracking-tight ${
                isSevereHypotension
                  ? 'text-red-700'
                  : isBorderlineHypotension
                  ? 'text-amber-700'
                  : 'text-[#0f172a]'
              }`}
            >
              {latestSys} / {latestDia}
            </span>
            <span className="text-xs font-mono text-[#64748b]">mmHg</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#64748b] block">
              Latest: {latestPoint.time}
            </span>
            <span className="text-[10px] font-mono text-[#94a3b8]">
              MAP: {latestMap} mmHg
            </span>
          </div>
        </div>
      </div>

      {/* Line Legend */}
      <div className="flex items-center gap-4 text-[11px] font-mono text-[#64748b] mb-1">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-3 h-0.5 inline-block ${
              isSevereHypotension ? 'bg-red-600' : 'bg-teal-700'
            }`}
          ></span>
          <span className="text-[#334155]">Systolic</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-slate-500 inline-block border-t border-dashed border-slate-500"></span>
          <span className="text-[#64748b]">Diastolic</span>
        </span>
      </div>

      {/* Chart */}
      <div className="w-full h-44 my-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            {/* Hypotension threshold (90 mmHg) */}
            <ReferenceLine
              y={90}
              stroke="#dc2626"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: 'Hypotension (90)',
                fill: '#dc2626',
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
            />
            <YAxis
              domain={[40, 150]}
              ticks={[50, 70, 90, 110, 130, 150]}
              tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Systolic Line */}
            <Line
              type="monotone"
              dataKey="systolic"
              stroke={isSevereHypotension ? '#dc2626' : '#0f766e'}
              strokeWidth={2}
              dot={{
                r: 3.5,
                fill: '#ffffff',
                stroke: isSevereHypotension ? '#dc2626' : '#0f766e',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5.5,
                fill: isSevereHypotension ? '#dc2626' : '#0f766e',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />

            {/* Diastolic Line */}
            <Line
              type="monotone"
              dataKey="diastolic"
              stroke="#64748b"
              strokeWidth={1.75}
              strokeDasharray="4 3"
              dot={{
                r: 3,
                fill: '#ffffff',
                stroke: '#64748b',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 5,
                fill: '#64748b',
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
