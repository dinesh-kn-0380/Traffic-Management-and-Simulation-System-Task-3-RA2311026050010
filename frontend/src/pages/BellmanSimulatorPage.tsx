import React, { useState, useEffect } from 'react';
import {
  Calculator,
  ArrowRight,
  TrendingUp,
  Cpu,
  Info,
  RotateCcw,
  Sparkles,
  Zap,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { calculateBellman } from '../services/api';
import { BellmanResult } from '../types';

export const BellmanSimulatorPage: React.FC = () => {
  // Input parameters for interactive calculation
  const [qCurrent, setQCurrent] = useState<number>(5.0);
  const [alpha, setAlpha] = useState<number>(0.1);
  const [reward, setReward] = useState<number>(2.0);
  const [gamma, setGamma] = useState<number>(0.9);
  const [nextMaxQ, setNextMaxQ] = useState<number>(8.0);

  // Result from backend calculation
  const [result, setResult] = useState<BellmanResult | null>(null);

  // Iterative convergence simulator state
  const [iterations, setIterations] = useState<number>(10);
  const [convergenceData, setConvergenceData] = useState<any[]>([]);

  // Presets
  const applyPreset = (presetName: string) => {
    if (presetName === 'prompt_benchmark') {
      setQCurrent(5.0);
      setAlpha(0.1);
      setReward(2.0);
      setGamma(0.9);
      setNextMaxQ(8.0);
    } else if (presetName === 'congestion_penalty') {
      setQCurrent(3.5);
      setAlpha(0.15);
      setReward(-6.0);
      setGamma(0.95);
      setNextMaxQ(2.0);
    } else if (presetName === 'throughput_rush') {
      setQCurrent(1.2);
      setAlpha(0.2);
      setReward(4.5);
      setGamma(0.95);
      setNextMaxQ(10.5);
    } else if (presetName === 'myopic_agent') {
      setQCurrent(5.0);
      setAlpha(0.1);
      setReward(2.0);
      setGamma(0.0);
      setNextMaxQ(8.0);
    }
  };

  // Run calculation whenever inputs change
  useEffect(() => {
    const runCalc = async () => {
      try {
        const res = await calculateBellman({
          q_current: qCurrent,
          alpha: alpha,
          reward: reward,
          gamma: gamma,
          next_max_q: nextMaxQ,
        });
        setResult(res);
      } catch (err) {
        console.error('Failed Bellman calculation', err);
      }
    };
    runCalc();
  }, [qCurrent, alpha, reward, gamma, nextMaxQ]);

  // Compute multi-step convergence simulation
  useEffect(() => {
    let current = qCurrent;
    const history = [];
    // Fixed target for convergence illustration
    const fixedTarget = reward + gamma * nextMaxQ;

    for (let i = 0; i <= iterations; i++) {
      const error = fixedTarget - current;
      history.push({
        iteration: i,
        qValue: Number(current.toFixed(3)),
        tdTarget: Number(fixedTarget.toFixed(3)),
        tdError: Number(Math.abs(error).toFixed(3)),
      });
      current = current + alpha * error;
    }
    setConvergenceData(history);
  }, [qCurrent, alpha, reward, gamma, nextMaxQ, iterations]);

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-white/10 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Calculator size={14} /> Core Mathematical Assessment Requirement
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bellman Equation Simulator &amp; Temporal Difference Analysis
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Interactively simulate Bellman expectation, optimality, and Q-learning temporal difference updates.
            Observe how future value bootstrapping enables adaptive sequential decisions across traffic phases.
          </p>
        </div>
      </div>

      {/* Equations Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Equation 1</span>
            <h3 className="text-sm font-bold text-white mt-1">Bellman Expectation Equation</h3>
            <p className="text-xs text-slate-400 mt-1">Expected return under policy &pi;:</p>
            <div className="mt-3 p-2.5 rounded bg-slate-950 font-mono text-xs text-blue-300 overflow-x-auto border border-white/5">
              V<sup>&pi;</sup>(s) = &sum;<sub>a</sub> &pi;(a|s) &sum;<sub>s'</sub> P(s'|s,a) [R(s,a,s') + &gamma; V<sup>&pi;</sup>(s')]
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Averages across stochastic action selection and transition dynamics.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Equation 2</span>
            <h3 className="text-sm font-bold text-white mt-1">Bellman Optimality Equation</h3>
            <p className="text-xs text-slate-400 mt-1">Maximum achievable value under optimal policy &pi;*:</p>
            <div className="mt-3 p-2.5 rounded bg-slate-950 font-mono text-xs text-emerald-300 overflow-x-auto border border-white/5">
              V*(s) = max<sub>a</sub> &sum;<sub>s'</sub> P(s'|s,a) [R(s,a,s') + &gamma; V*(s')]
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Identifies the optimal action maximizing immediate reward plus discounted future value.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Equation 3</span>
            <h3 className="text-sm font-bold text-white mt-1">Q-Learning TD Update Rule</h3>
            <p className="text-xs text-slate-400 mt-1">Model-free temporal difference action-value update:</p>
            <div className="mt-3 p-2.5 rounded bg-slate-950 font-mono text-xs text-amber-300 overflow-x-auto border border-white/5">
              Q(s,a) &larr; Q(s,a) + &alpha; [r + &gamma; max<sub>a'</sub> Q(s',a') - Q(s,a)]
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Updates state-action utilities directly from experience without requiring transition probabilities P.
          </p>
        </div>
      </div>

      {/* Main Interactive Numerical Simulator */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="text-emerald-400" size={20} />
              Interactive Bellman Numerical Calculator
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Test custom parameter sets or execute the benchmark numerical example specified in the RL Challenge prompt.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Presets:</span>
            <button
              onClick={() => applyPreset('prompt_benchmark')}
              className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all font-medium"
            >
              Benchmark (Q=5, r=2, &gamma;=0.9, Q'=8)
            </button>
            <button
              onClick={() => applyPreset('congestion_penalty')}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700 transition-all"
            >
              Congestion Spike (r=-6)
            </button>
            <button
              onClick={() => applyPreset('throughput_rush')}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700 transition-all"
            >
              High Flow Bonus (r=+4.5)
            </button>
            <button
              onClick={() => applyPreset('myopic_agent')}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-white/5 hover:bg-slate-700 transition-all"
            >
              Myopic (&gamma;=0.0)
            </button>
          </div>
        </div>

        {/* Input Sliders & Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5 rounded-xl bg-slate-950/70 border border-white/5 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Current Q(s, a): <span className="font-mono text-blue-400">{qCurrent.toFixed(2)}</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={qCurrent}
              onChange={(e) => setQCurrent(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-blue-500 outline-none"
            />
            <input
              type="range"
              min="-10"
              max="20"
              step="0.5"
              value={qCurrent}
              onChange={(e) => setQCurrent(parseFloat(e.target.value))}
              className="w-full accent-blue-500 mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Learning Rate &alpha;: <span className="font-mono text-indigo-400">{alpha.toFixed(2)}</span>
            </label>
            <input
              type="number"
              min="0.01"
              max="1.0"
              step="0.05"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value) || 0.01)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
            />
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.01"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Immediate Reward r: <span className="font-mono text-emerald-400">{reward.toFixed(2)}</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={reward}
              onChange={(e) => setReward(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-emerald-500 outline-none"
            />
            <input
              type="range"
              min="-15"
              max="15"
              step="0.5"
              value={reward}
              onChange={(e) => setReward(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Discount Factor &gamma;: <span className="font-mono text-purple-400">{gamma.toFixed(2)}</span>
            </label>
            <input
              type="number"
              min="0.0"
              max="1.0"
              step="0.05"
              value={gamma}
              onChange={(e) => setGamma(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-purple-500 outline-none"
            />
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={gamma}
              onChange={(e) => setGamma(parseFloat(e.target.value))}
              className="w-full accent-purple-500 mt-2 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Max Next Q max<sub>a'</sub> Q(s', a'): <span className="font-mono text-amber-400">{nextMaxQ.toFixed(2)}</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={nextMaxQ}
              onChange={(e) => setNextMaxQ(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-500 outline-none"
            />
            <input
              type="range"
              min="-10"
              max="25"
              step="0.5"
              value={nextMaxQ}
              onChange={(e) => setNextMaxQ(parseFloat(e.target.value))}
              className="w-full accent-amber-500 mt-2 cursor-pointer"
            />
          </div>
        </div>

        {/* Output Cards */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-blue-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1 &bull; Discounted Future</span>
              <div className="text-xl font-mono font-bold text-blue-400 mt-1">
                {result.discounted_future.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">&gamma; &times; max Q' = {gamma} &times; {nextMaxQ}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 2 &bull; TD Target</span>
              <div className="text-xl font-mono font-bold text-indigo-400 mt-1">
                {result.td_target.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">r + &gamma; max Q' = {reward} + {result.discounted_future.toFixed(2)}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 3 &bull; TD Error (&delta;)</span>
              <div className={`text-xl font-mono font-bold mt-1 ${result.td_error >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {result.td_error > 0 ? `+${result.td_error.toFixed(4)}` : result.td_error.toFixed(4)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">Target - Current Q = {result.td_target.toFixed(2)} - {qCurrent}</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 5 &bull; Updated Q(s, a)</span>
              <div className="text-2xl font-mono font-extrabold text-emerald-300 mt-1">
                {result.updated_q.toFixed(4)}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">Q + &alpha;&delta; = {qCurrent} + {result.adjustment.toFixed(4)}</div>
            </div>
          </div>
        )}

        {/* Step-by-Step Detailed Mathematical Derivation */}
        {result && (
          <div className="p-5 rounded-xl bg-slate-950 border border-white/5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Step-by-Step Arithmetic Trace:</h4>
            {result.steps.map((st, idx) => (
              <div key={idx} className="font-mono text-xs text-slate-300 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                <span>{st}</span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-amber-300/90">
              <Info size={14} className="shrink-0" />
              <span>
                <strong>Academic Notice:</strong> The values above constitute an illustrative numerical demonstration of the Bellman equation mechanics, distinguished from trained experimental results stored in the system database.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Step Convergence Simulation Chart */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-indigo-400" size={20} />
              Iterative Bellman Contraction &amp; Convergence
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Visualizes how repeated applications of the Bellman operator contract the temporal difference error &delta; toward zero.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Iteration Steps:</span>
            <input
              type="range"
              min="5"
              max="25"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value))}
              className="w-28 accent-indigo-500 cursor-pointer"
            />
            <span className="font-mono font-bold text-indigo-400 text-xs">{iterations}</span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={convergenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="iteration" stroke="#94a3b8" fontSize={11} label={{ value: 'Bellman Update Iteration', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="qValue" name="Q(s, a) Value" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="tdTarget" name="TD Target" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="tdError" name="|TD Error &delta;|" stroke="#f43f5e" strokeWidth={1.5} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            <strong>Why the Bellman Equation Prevents Myopic Decisions:</strong> In traffic signal optimization, an agent relying solely on immediate reward would selfishly keep the green light forever as long as active vehicles were passing. By incorporating <code className="text-emerald-300">&gamma; max<sub>a'</sub> Q(s', a')</code>, the Bellman equation penalizes queue buildup on cross streets before gridlock occurs, guiding the policy toward sustainable, long-term cycle equilibrium.
          </p>
        </div>
      </div>
    </div>
  );
};

