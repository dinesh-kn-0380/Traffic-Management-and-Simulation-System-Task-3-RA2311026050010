import React from 'react';
import {
  Activity,
  Cpu,
  BarChart3,
  Clock,
  Car,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { NavTab } from '../components/Navbar';
import { Experiment } from '../types';

interface OverviewPageProps {
  onNavigate: (tab: NavTab) => void;
  experiments: Experiment[];
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate, experiments }) => {
  const latestExp = experiments[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden glass-card p-8 border border-white/10 bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900/60">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            End-to-End Reinforcement Learning System Active
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Intelligent Traffic Signal Optimization Using Reinforcement Learning
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            An adaptive microscopic traffic management simulation engineered to replace conventional
            rigid fixed-time signal cycles with intelligent decision-making agents trained via Tabular
            Q-Learning and PyTorch Deep Q-Networks (DQN).
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('simulation')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <Activity size={18} />
              Open Live Simulation
            </button>
            <button
              onClick={() => onNavigate('training')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-white/10 transition-all hover:scale-[1.02]"
            >
              <Cpu size={18} />
              Train RL Agent
            </button>
            <button
              onClick={() => onNavigate('comparison')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-white/10 transition-all hover:scale-[1.02]"
            >
              <BarChart3 size={18} />
              Benchmark Comparison
            </button>
            <button
              onClick={() => onNavigate('mdp')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 font-semibold text-sm border border-indigo-500/40 transition-all hover:scale-[1.02]"
            >
              <Layers size={18} />
              MDP Explorer
            </button>
            <button
              onClick={() => onNavigate('bellman')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 font-semibold text-sm border border-emerald-500/40 transition-all hover:scale-[1.02]"
            >
              <ShieldCheck size={18} />
              Bellman Simulator
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl glass-card-hover space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Policy</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Cpu size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">Q-Learning</div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 size={13} />
              288 Discretized States
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl glass-card-hover space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Benchmark Waiting Time</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {latestExp ? `${latestExp.mean_waiting_time}s` : '18.0s'}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Per vehicle average</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl glass-card-hover space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Mean Queue Length</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Car size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {latestExp ? `${latestExp.mean_queue_length} veh` : '3.8 veh'}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span>Across all 4 approaches</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-5 rounded-2xl glass-card-hover space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Recorded Experiments</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {experiments.length} Runs
            </div>
            <div className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
              <span>SQLite Persistent Storage</span>
            </div>
          </div>
        </div>
      </div>

      {/* RL Feedback Loop Diagram Card */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Closed-Loop Reinforcement Learning Architecture</h2>
            <p className="text-xs text-slate-400">Continuous observation, safety interlocks, and policy optimization</p>
          </div>
          <button
            onClick={() => onNavigate('laboratory')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
            Algorithm Theory <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2">
          {/* Step 1 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Step 1</div>
            <div className="font-semibold text-sm text-white">Observe State</div>
            <p className="text-xs text-slate-400">
              Queue counts, waiting times, current phase, and elapsed green duration.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Step 2</div>
            <div className="font-semibold text-sm text-white">Select Action</div>
            <p className="text-xs text-slate-400">
              Action 0 (Keep current phase) or Action 1 (Request phase switch) via $\epsilon$-greedy.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Step 3</div>
            <div className="font-semibold text-sm text-white">Safety Interlock</div>
            <p className="text-xs text-slate-400">
              Enforces min green, yellow clearance, and all-red safety buffer without conflicting greens.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Step 4</div>
            <div className="font-semibold text-sm text-white">Step Physics</div>
            <p className="text-xs text-slate-400">
              Car-following model advances vehicles, accounts for arrivals, stops, and departures.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Step 5</div>
            <div className="font-semibold text-sm text-white">Compute Reward</div>
            <p className="text-xs text-slate-400">
              Congestion penalty (queues + wait times + switch penalty) + throughput bonus.
            </p>
          </div>

          {/* Step 6 */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Step 6</div>
            <div className="font-semibold text-sm text-white">Update Agent</div>
            <p className="text-xs text-slate-400">
              Bellman temporal difference update for Q-table or Experience Replay mini-batch for DQN.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Experiments Preview */}
      <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Evaluation Runs</h2>
            <p className="text-xs text-slate-400">Benchmark results saved to SQLite database</p>
          </div>
          <button
            onClick={() => onNavigate('experiments')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
          >
            View All ({experiments.length}) <ArrowRight size={14} />
          </button>
        </div>

        {experiments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No experiments recorded yet. Start training or run a benchmark to log results!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Algorithm</th>
                  <th className="p-3">Scenario</th>
                  <th className="p-3">Episodes</th>
                  <th className="p-3">Mean Wait Time</th>
                  <th className="p-3">Mean Queue</th>
                  <th className="p-3">Throughput</th>
                  <th className="p-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {experiments.slice(0, 4).map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-blue-400 font-bold">{exp.experiment_id}</td>
                    <td className="p-3 font-semibold text-white">{exp.name}</td>
                    <td className="p-3 uppercase font-mono text-[11px]">{exp.algorithm}</td>
                    <td className="p-3">{exp.scenario}</td>
                    <td className="p-3 font-mono">{exp.episodes}</td>
                    <td className="p-3 font-mono text-emerald-400">{exp.mean_waiting_time}s</td>
                    <td className="p-3 font-mono">{exp.mean_queue_length} veh</td>
                    <td className="p-3 font-mono font-bold text-white">{exp.throughput}</td>
                    <td className="p-3 text-slate-400">{new Date(exp.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
