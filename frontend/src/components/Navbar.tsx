import React from 'react';
import {
  Activity,
  Cpu,
  BarChart3,
  Sliders,
  History,
  BookOpen,
  LayoutDashboard,
  Zap,
  Network,
  Calculator,
  Compass,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'simulation'
  | 'training'
  | 'laboratory'
  | 'mdp'
  | 'bellman'
  | 'policy-value'
  | 'comparison'
  | 'experiments'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isTraining?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, isTraining }) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'simulation', label: 'Live Simulation', icon: <Activity size={18} /> },
    { id: 'training', label: 'Agent Training', icon: <Cpu size={18} /> },
    { id: 'laboratory', label: 'Algorithm Lab', icon: <BookOpen size={18} /> },
    { id: 'mdp', label: 'MDP Explorer', icon: <Network size={18} /> },
    { id: 'bellman', label: 'Bellman Simulator', icon: <Calculator size={18} /> },
    { id: 'policy-value', label: 'Policy & Value', icon: <Compass size={18} /> },
    { id: 'comparison', label: 'Comparison', icon: <BarChart3 size={18} /> },
    { id: 'experiments', label: 'Experiments', icon: <History size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Sliders size={18} /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md border-b border-white/10 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('overview')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="text-emerald-400" size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">TrafficRL</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v1.0 Adaptive AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Intelligent Traffic Signal Optimization</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span className="hidden md:inline">{item.label}</span>
                {item.id === 'training' && isTraining && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
