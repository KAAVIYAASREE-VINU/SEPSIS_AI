import React from 'react';
import { NavigationPage } from '../types';
import {
  LayoutDashboard,
  Users,
  Activity,
  AlertOctagon,
  History,
  ShieldAlert,
  Radio
} from 'lucide-react';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  alertCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'patients' as NavigationPage,
      label: 'Patients',
      icon: Users,
      badge: null,
    },
    {
      id: 'monitor' as NavigationPage,
      label: 'Monitor Patient',
      icon: Activity,
      badge: null,
    },
    {
      id: 'alerts' as NavigationPage,
      label: 'Alerts',
      icon: AlertOctagon,
      badge: alertCount > 0 ? alertCount : null,
    },
    {
      id: 'history' as NavigationPage,
      label: 'Patient History',
      icon: History,
      badge: null,
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className="w-64 bg-[#0c1427] text-slate-200 border-r border-[#19233c] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30"
    >
      {/* Brand & Command Centre Header */}
      <div>
        <div className="p-4 border-b border-[#1b2642]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[4px] bg-[#1a2d52] border border-[#2b4478] flex items-center justify-center text-teal-400">
              <ShieldAlert className="w-4 h-4 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold tracking-wider text-sm text-white">
                  SEPSIS-AI
                </span>
                <span className="text-[10px] px-1 py-0.2 font-mono bg-teal-950 text-teal-300 border border-teal-800 rounded-[3px]">
                  CDS
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400 font-mono">
                Trajectory Monitor
              </p>
            </div>
          </div>
        </div>

        {/* Hospital Telemetry Status Bar */}
        <div className="px-4 py-2.5 bg-[#090f1e] border-b border-[#18233a] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono uppercase text-[10px] tracking-wider text-emerald-400">Telemetry Live</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">ICU & Wards</span>
        </div>

        {/* Navigation List - EXACTLY 5 Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1.5 text-[10px] uppercase font-mono tracking-widest text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.id ||
              (item.id === 'patients' && currentPage === 'profile');

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-medium tracking-wide transition-colors ${
                  isActive
                    ? 'bg-[#1b2b4e] text-white border-l-2 border-l-teal-400 font-semibold'
                    : 'text-slate-300 hover:bg-[#131d35] hover:text-white border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-teal-300' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className="px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Context / Clinical Guardrail */}
      <div className="p-3 border-t border-[#1b2642] bg-[#090f1e] space-y-2">
        <div className="p-2 rounded-[4px] bg-[#0f172a] border border-[#1e293b]">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
            <Radio className="w-3 h-3 text-teal-400" />
            <span>Unit Telemetry</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            Coverage: 5 Wards / 64 Beds
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Model: Sepsis-Trajectory v2.4
          </div>
        </div>

        <div className="px-1 py-0.5 text-[10px] text-slate-400 leading-tight">
          Research prototype for clinical decision-support only.
        </div>
      </div>
    </aside>
  );
};
