import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Patient } from '../types';

interface RiskDistributionProps {
  patients: Patient[];
}

export const RiskDistribution: React.FC<RiskDistributionProps> = ({ patients }) => {
  const total = patients.length;
  const highCount = patients.filter((p) => p.latestRiskLevel === 'HIGH').length;
  const modCount = patients.filter((p) => p.latestRiskLevel === 'MODERATE').length;
  const lowCount = patients.filter((p) => p.latestRiskLevel === 'LOW').length;

  const highPct = total > 0 ? Math.round((highCount / total) * 100) : 0;
  const modPct = total > 0 ? Math.round((modCount / total) * 100) : 0;
  const lowPct = total > 0 ? 100 - highPct - modPct : 0;

  const data = [
    { name: 'High Risk', value: highCount, percentage: highPct, color: '#dc2626' },
    { name: 'Moderate Risk', value: modCount, percentage: modPct, color: '#d97706' },
    { name: 'Low Risk', value: lowCount, percentage: lowPct, color: '#059669' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-[#0f172a] text-white px-3 py-2 rounded-[4px] text-xs font-mono shadow-md border border-slate-700">
          <div className="font-semibold">{item.name}</div>
          <div className="text-slate-300">
            {item.value} patients ({item.percentage}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="risk-distribution-panel"
      className="bg-white rounded-[6px] border border-[#e2e8f0] p-5 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#475569]">
            Hospital Risk Distribution
          </h2>
          <p className="text-xs text-[#64748b] mt-0.5">
            Active patient population categorization
          </p>
        </div>
        <span className="text-xs font-mono text-[#334155] bg-[#f1f5f9] px-2 py-0.5 rounded-[4px] border border-[#e2e8f0]">
          N = {total} Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Donut Chart */}
        <div className="md:col-span-6 h-48 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold font-mono text-[#0f172a] leading-none">
              {total}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b]">
              Patients
            </span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="md:col-span-6 space-y-3">
          {data.map((item) => (
            <div
              key={item.name}
              className="p-2.5 rounded-[4px] bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-xs font-semibold text-[#1e293b]">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#475569]">
                    {item.value} / {total}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#0f172a]">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Visual mini progress bar */}
              <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
