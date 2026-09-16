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
import { AssessmentRecord } from '../types';

interface RiskChartProps {
  assessments: AssessmentRecord[];
  height?: number;
  showThresholds?: boolean;
}

export const RiskChart: React.FC<RiskChartProps> = ({
  assessments,
  height = 280,
  showThresholds = true,
}) => {
  // Format data points chronologically
  const chartData = [...assessments]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((asm) => ({
      timestamp: asm.timestamp,
      timeLabel: asm.timeLabel,
      riskScore: asm.riskScore,
      riskLevel: asm.riskLevel,
      trend: asm.trend,
      delta: asm.riskDelta,
      factors: asm.contributingFactors,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0f172a] text-white p-3 rounded-[4px] shadow-lg border border-slate-700 text-xs font-mono max-w-xs">
          <div className="text-slate-400 text-[11px] mb-1">{data.timestamp}</div>
          <div className="flex items-center justify-between gap-3 my-1">
            <span className="font-sans text-slate-300">Sepsis Risk Score:</span>
            <span className="font-bold text-sm text-white">
              {data.riskScore} <span className="text-slate-400 text-[10px]">/100</span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-700 text-[11px]">
            <span
              className={`px-1.5 py-0.5 rounded-[2px] font-semibold uppercase ${
                data.riskLevel === 'HIGH'
                  ? 'bg-red-950 text-red-300 border border-red-800'
                  : data.riskLevel === 'MODERATE'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {data.riskLevel}
            </span>
            <span className="text-slate-300 font-sans">
              Delta: {data.delta > 0 ? `+${data.delta}` : data.delta}
            </span>
          </div>
          {data.factors && data.factors.length > 0 && (
            <div className="text-[10px] text-slate-400 font-sans mt-1.5 line-clamp-2">
              • {data.factors[0]}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-xs font-mono text-[#64748b]">
        <div className="flex items-center gap-4">
          <span>Y: Sepsis Risk Score (0–100)</span>
          {showThresholds && (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-red-500 inline-block"></span>
                <span className="text-red-700">High Risk (≥65)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-amber-500 inline-block"></span>
                <span className="text-amber-700">Mod Risk (≥35)</span>
              </span>
            </div>
          )}
        </div>
        <span>X: Timeline</span>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: -15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 20, 35, 50, 65, 80, 100]}
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
              tickLine={{ stroke: '#cbd5e1' }}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {showThresholds && (
              <>
                <ReferenceLine
                  y={65}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'High Risk (65)',
                    fill: '#dc2626',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                    position: 'insideTopRight',
                  }}
                />
                <ReferenceLine
                  y={35}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Moderate (35)',
                    fill: '#d97706',
                    fontSize: 10,
                    fontFamily: 'IBM Plex Mono',
                    position: 'insideTopRight',
                  }}
                />
              </>
            )}

            <Line
              type="monotone"
              dataKey="riskScore"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: '#0284c7',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: '#0369a1',
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
