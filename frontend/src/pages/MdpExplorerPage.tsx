import React, { useState, useEffect } from 'react';
import {
  Network,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calculator,
  Compass,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  Info,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  fetchMdpDefinition,
  calculateReward,
  fetchMdpTransitions,
  fetchMdpState,
} from '../services/api';
import { MdpDefinition, RewardResult, TransitionSummary } from '../types';

export const MdpExplorerPage: React.FC = () => {
  const [definition, setDefinition] = useState<MdpDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  // State Space Interactive Decoder State
  const [phase, setPhase] = useState<number>(0);
  const [nsQ, setNsQ] = useState<number>(1);
  const [ewQ, setEwQ] = useState<number>(2);
  const [greenTime, setGreenTime] = useState<number>(1);
  const [waitUrgency, setWaitUrgency] = useState<number>(1);

  // Computed discrete state index: phase*144 + ns*36 + ew*9 + gt*3 + wait
  const computedStateIdx =
    phase * (4 * 4 * 3 * 3) +
    nsQ * (4 * 3 * 3) +
    ewQ * (3 * 3) +
    greenTime * 3 +
    waitUrgency;

  // Reward Calculator State
  const [totalQueue, setTotalQueue] = useState<number>(8);
  const [incrementalWait, setIncrementalWait] = useState<number>(12);
  const [switchTriggered, setSwitchTriggered] = useState<boolean>(false);
  const [departures, setDepartures] = useState<number>(2);
  const [wq, setWq] = useState<number>(0.5);
  const [ww, setWw] = useState<number>(0.5);
  const [ws, setWs] = useState<number>(1.0);
  const [wth, setWth] = useState<number>(2.0);
  const [rewardResult, setRewardResult] = useState<RewardResult | null>(null);

  // Returns horizon simulator
  const [gamma, setGamma] = useState<number>(0.95);

  // Transitions from simulator
  const [transitions, setTransitions] = useState<TransitionSummary | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [def, trans] = await Promise.all([
        fetchMdpDefinition(),
        fetchMdpTransitions(15),
      ]);
      setDefinition(def);
      setTransitions(trans);
    } catch (err) {
      console.error('Failed to load MDP definition', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate reward whenever inputs change
  useEffect(() => {
    const runRewardCalc = async () => {
      try {
        const res = await calculateReward({
          total_queue: totalQueue,
          incremental_wait: incrementalWait,
          switch_triggered: switchTriggered,
          departures: departures,
          queue_weight: wq,
          waiting_weight: ww,
          switch_weight: ws,
          throughput_weight: wth,
        });
        setRewardResult(res);
      } catch (err) {
        console.error('Failed reward calculation', err);
      }
    };
    runRewardCalc();
  }, [totalQueue, incrementalWait, switchTriggered, departures, wq, ww, ws, wth]);

  // Discounted returns horizon curve data
  const horizonData = Array.from({ length: 12 }, (_, k) => {
    const discount = Math.pow(gamma, k);
    const nominalStepReward = -1.5; // illustrative step penalty
    const discountedReward = nominalStepReward * discount;
    return {
      step: `t+${k + 1}`,
      k,
      discountWeight: Number(discount.toFixed(3)),
      discountedReward: Number(discountedReward.toFixed(2)),
    };
  });

  const cumulativeReturnSum = horizonData.reduce((acc, curr) => acc + curr.discountedReward, 0);

  // Deconstruction labels for 288-state
  const phaseLabels = ['North-South Green (Phase 0)', 'East-West Green (Phase 1)'];
  const queueLabels = ['0-2 veh (Low)', '3-6 veh (Moderate)', '7-11 veh (High)', '12+ veh (Saturated)'];
  const gtLabels = ['<15s (Initial Green)', '15-30s (Mature Green)', '>30s (Extended Green)'];
  const waitLabels = ['NS Urgency Higher (>15s)', 'EW Urgency Higher (>15s)', 'Balanced (\u226415s disparity)'];

  // Normalized continuous 10-D vector sample
  const simulatedContinuousVec = [
    (nsQ * 3.5 / 15.0).toFixed(2),
    (nsQ * 3.0 / 15.0).toFixed(2),
    (ewQ * 3.5 / 15.0).toFixed(2),
    (ewQ * 3.0 / 15.0).toFixed(2),
    ((nsQ * 12.0) / 60.0).toFixed(2),
    ((nsQ * 10.0) / 60.0).toFixed(2),
    ((ewQ * 18.0) / 60.0).toFixed(2),
    ((ewQ * 16.0) / 60.0).toFixed(2),
    phase.toFixed(1),
    (greenTime === 0 ? 0.15 : greenTime === 1 ? 0.4 : 0.75).toFixed(2),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-sm font-medium">Loading Finite MDP Specifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/30 border border-white/10 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Network size={14} /> Task 3: Markov Decision Process Architecture
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Finite MDP Formulation: <span className="font-mono text-emerald-400">M = (S, A, P, R, &gamma;)</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Formulating the real-world traffic signal problem into a formal finite sequential decision process.
            Connect mathematical abstractions directly with the running physical intersection simulator.
          </p>
        </div>
      </div>

      {/* 5-Tuple Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Tuple Element 1</span>
            <div className="font-mono text-xl font-bold text-white mt-1">S &bull; State Space</div>
            <p className="text-xs text-slate-400 mt-2">
              <strong className="text-slate-200">288 Discrete States</strong> (Tabular) &amp; <strong className="text-slate-200">10-D Vector</strong> (DQN).
            </p>
          </div>
          <div className="mt-3 text-[11px] text-blue-400/80 font-mono">2 &times; 4 &times; 4 &times; 3 &times; 3 = 288</div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Tuple Element 2</span>
            <div className="font-mono text-xl font-bold text-white mt-1">A &bull; Action Space</div>
            <p className="text-xs text-slate-400 mt-2">
              <strong className="text-slate-200">Action 0: KEEP</strong> (continue green) vs <strong className="text-slate-200">Action 1: SWITCH</strong> (trigger clearance).
            </p>
          </div>
          <div className="mt-3 text-[11px] text-emerald-400/80 font-mono">|A| = 2 with Safety Checks</div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Tuple Element 3</span>
            <div className="font-mono text-xl font-bold text-white mt-1">P &bull; Transition Prob</div>
            <p className="text-xs text-slate-400 mt-2">
              Stochastic transition distribution <strong className="text-slate-200">P(s' | s, a)</strong> governed by Poisson arrivals and car-following physics.
            </p>
          </div>
          <div className="mt-3 text-[11px] text-amber-400/80 font-mono">Markov Property Enforced</div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Tuple Element 4</span>
            <div className="font-mono text-xl font-bold text-white mt-1">R &bull; Reward Function</div>
            <p className="text-xs text-slate-400 mt-2">
              Penalizes queues, wait increments, and signal oscillations while rewarding throughput departures.
            </p>
          </div>
          <div className="mt-3 text-[11px] text-rose-400/80 font-mono">-[w_q Q + w_w &Delta;W + w_s I] + w_th D</div>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Tuple Element 5</span>
            <div className="font-mono text-xl font-bold text-white mt-1">&gamma; &bull; Discount Factor</div>
            <p className="text-xs text-slate-400 mt-2">
              Balances immediate delay reduction against sustainable multi-step queue clearance (<strong className="text-slate-200">&gamma; = 0.95</strong>).
            </p>
          </div>
          <div className="mt-3 text-[11px] text-purple-400/80 font-mono">G_t = &sum; &gamma;^k R_(t+k+1)</div>
        </div>
      </div>

      {/* MDP Architecture Workflow Diagram */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-blue-400" size={20} />
              End-to-End MDP Sequential Decision-Making Workflow
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              The continuous feedback control loop executing at each discrete time step (&Delta;t = 1.0s)
            </p>
          </div>
          <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-white/5 font-mono">
            Agent &harr; Environment Control Loop
          </div>
        </div>

        {/* Workflow Diagram Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { step: '01', title: 'Traffic Environment', desc: 'Vehicles arrive on N, S, E, W approaches; queue physics update.' },
            { step: '02', title: 'State Observation', desc: 'Discretized into 288-state index (s) and 10-D continuous vector.' },
            { step: '03', title: 'RL Agent Policy', desc: 'Evaluates Q(s, KEEP) vs Q(s, SWITCH) using learned policy &pi;(a|s).' },
            { step: '04', title: 'Action Selection', desc: 'Chooses a &isin; {0: KEEP, 1: SWITCH} via &epsilon;-greedy or greedy rule.' },
            { step: '05', title: 'Safety Controller', desc: 'Enforces min-green (10s), max-green (60s), yellow & red clearance.' },
            { step: '06', title: 'Signal Execution', desc: 'Physical signal phases respond; vehicles advance or halt.' },
            { step: '07', title: 'State Transition', desc: 'Intersection evolves to next state s\' according to P(s\' | s, a).' },
            { step: '08', title: 'Reward Calculation', desc: 'Computes R(s, a, s\') from queues, incremental delay, and departures.' },
            { step: '09', title: 'Bellman TD Update', desc: 'Temporal difference error updates Q-value: Q &larr; Q + &alpha; [r + &gamma; max Q\' - Q].' },
            { step: '10', title: 'Next Decision', desc: 'Agent advances to step t+1 ready for next sequential control decision.' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                idx === 2 || idx === 8
                  ? 'bg-blue-950/40 border-blue-500/40 shadow-sm shadow-blue-500/10'
                  : idx === 4
                  ? 'bg-emerald-950/40 border-emerald-500/40'
                  : 'bg-slate-950/50 border-white/5 hover:border-white/20'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500">{item.step}</span>
                <div className="text-xs font-bold text-white mt-1">{item.title}</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
              </div>
              <div className="mt-3 flex items-center text-[10px] font-semibold text-blue-400">
                Next <ArrowRight size={10} className="ml-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: State Space Explorer & Reward Function Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: 288-State Interactive Explorer */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="text-indigo-400" size={18} />
                  288-State Discretization &amp; Encoding
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Index formula: <code className="text-indigo-300">s = p&times;144 + q_NS&times;36 + q_EW&times;9 + g_t&times;3 + u_w</code>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">State Index</span>
                <div className="text-2xl font-mono font-extrabold text-indigo-400">
                  {computedStateIdx} <span className="text-xs font-normal text-slate-500">/ 287</span>
                </div>
              </div>
            </div>

            {/* Interactive Inputs */}
            <div className="space-y-4 mt-6">
              {/* Phase */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>1. Signal Phase (p &isin; &#123;0, 1&#125;)</span>
                  <span className="font-semibold text-indigo-400">{phaseLabels[phase]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPhase(0)}
                    className={`py-2 px-3 text-xs rounded-lg font-medium border transition-all ${
                      phase === 0
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                    }`}
                  >
                    Phase 0: North-South Green
                  </button>
                  <button
                    onClick={() => setPhase(1)}
                    className={`py-2 px-3 text-xs rounded-lg font-medium border transition-all ${
                      phase === 1
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                    }`}
                  >
                    Phase 1: East-West Green
                  </button>
                </div>
              </div>

              {/* North-South Queue */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>2. North-South Queue Bin (q_NS &isin; [0, 3])</span>
                  <span className="font-semibold text-blue-400">{queueLabels[nsQ]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={nsQ}
                  onChange={(e) => setNsQ(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* East-West Queue */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>3. East-West Queue Bin (q_EW &isin; [0, 3])</span>
                  <span className="font-semibold text-amber-400">{queueLabels[ewQ]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={ewQ}
                  onChange={(e) => setEwQ(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Green Time Maturity */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>4. Green Time Maturity (g_t &isin; [0, 2])</span>
                  <span className="font-semibold text-emerald-400">{gtLabels[greenTime]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={greenTime}
                  onChange={(e) => setGreenTime(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Waiting Urgency Disparity */}
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>5. Waiting-Time Urgency (u_w &isin; [0, 2])</span>
                  <span className="font-semibold text-rose-400">{waitLabels[waitUrgency]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  value={waitUrgency}
                  onChange={(e) => setWaitUrgency(parseInt(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Corresponding 10-D Continuous Vector */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
              <Info size={14} className="text-indigo-400" /> Corresponding 10-D Normalized Continuous DQN State Vector:
            </span>
            <div className="grid grid-cols-5 gap-1.5 font-mono text-[10px] text-center">
              {simulatedContinuousVec.map((val, idx) => (
                <div key={idx} className="p-1.5 rounded bg-slate-950 border border-white/5">
                  <div className="text-slate-500 text-[9px]">x_{idx}</div>
                  <div className="text-indigo-300 font-semibold">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Interactive Reward Function Calculator */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calculator className="text-rose-400" size={18} />
                  Interactive Reward Function Calculator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Using actual backend formulation: <code className="text-rose-300">R = -[w_q(Q/10) + w_w(&Delta;W/10) + w_s I] + w_th D</code>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Step Reward R</span>
                <div className={`text-2xl font-mono font-extrabold ${rewardResult && rewardResult.total_reward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {rewardResult ? rewardResult.total_reward.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>

            {/* Reward Sliders */}
            <div className="space-y-3.5 mt-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Total Queued Vehicles (Q_total)</span>
                  <span className="font-mono text-slate-200">{totalQueue} vehicles</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={totalQueue}
                  onChange={(e) => setTotalQueue(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Incremental Waiting Time (&Delta;W_total)</span>
                  <span className="font-mono text-slate-200">{incrementalWait} seconds</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={incrementalWait}
                  onChange={(e) => setIncrementalWait(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-y border-white/5">
                <div>
                  <div className="text-xs font-medium text-slate-200">Signal Switch Triggered (I_switch)</div>
                  <div className="text-[11px] text-slate-400">Applies clearance penalty w_s</div>
                </div>
                <button
                  onClick={() => setSwitchTriggered(!switchTriggered)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    switchTriggered
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-400 border border-white/5'
                  }`}
                >
                  {switchTriggered ? 'YES (1.0 Penalty)' : 'NO (0.0)'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Vehicle Departures Throughput (D)</span>
                  <span className="font-mono text-emerald-400 font-semibold">{departures} departures</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={departures}
                  onChange={(e) => setDepartures(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Breakdown Cards */}
          {rewardResult && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <span className="text-xs font-semibold text-slate-300 block mb-2">Itemized Reward Arithmetic:</span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-slate-950 border border-white/5">
                  <div className="text-[10px] text-slate-400">Queue Penalty</div>
                  <div className="font-mono text-rose-400 font-semibold">-{rewardResult.breakdown.queue_penalty.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-white/5">
                  <div className="text-[10px] text-slate-400">Wait Penalty</div>
                  <div className="font-mono text-rose-400 font-semibold">-{rewardResult.breakdown.waiting_penalty.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-white/5">
                  <div className="text-[10px] text-slate-400">Switch Penalty</div>
                  <div className="font-mono text-rose-400 font-semibold">-{rewardResult.breakdown.switch_penalty.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-white/5">
                  <div className="text-[10px] text-slate-400">Depart Bonus</div>
                  <div className="font-mono text-emerald-400 font-semibold">+{rewardResult.breakdown.throughput_bonus.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded border border-white/5 truncate">
                {rewardResult.equation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discounted Cumulative Returns Simulator G_t */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown className="text-purple-400" size={20} />
              Discounted Cumulative Return Horizon: <span className="font-mono text-purple-300">G_t = &sum; &gamma;^k R_(t+k+1)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Demonstrates how discount factor &gamma; weights immediate vs far-future traffic congestion relief.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300">Discount Factor &gamma;:</span>
            <input
              type="range"
              min="0.0"
              max="0.99"
              step="0.01"
              value={gamma}
              onChange={(e) => setGamma(parseFloat(e.target.value))}
              className="w-32 accent-purple-500 cursor-pointer"
            />
            <span className="font-mono font-bold text-purple-400 text-sm">{gamma.toFixed(2)}</span>
          </div>
        </div>

        {/* Chart of discount curve */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horizonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="discountWeight" name="Discount Weight (&gamma;^k)" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-950/60 border border-white/5 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">Sequential Planning Implications</h4>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                <strong>When &gamma; &rarr; 0 (Myopic Agent):</strong> The controller acts purely on immediate step throughput, ignoring oncoming platoons and queue build-up on cross streets.
              </p>
              <p>
                <strong>When &gamma; = 0.95 (Balanced Traffic RL):</strong> Future queue dissipation carries significant weight (&gamma;^10 &approx; 0.60), teaching the agent to clear saturated queues before total intersection gridlock occurs.
              </p>
              <div className="pt-2 border-t border-white/10 text-slate-400">
                12-Step Cumulative Return Weight: <span className="font-mono text-white font-bold">{cumulativeReturnSum.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empirical Transition Probabilities P(s' | s, a) */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="text-amber-400" size={20} />
              Empirical Transition Probability P(s' | s, a)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sample empirical state transition distributions observed in the live traffic simulation environment.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Total Unique (s, a) Observed: <span className="text-amber-400 font-bold">{transitions?.total_unique_state_actions || 0}</span>
          </div>
        </div>

        {transitions && transitions.sample_transitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {transitions.sample_transitions.slice(0, 6).map((item, idx) => (
              <div key={idx} className="bg-slate-950/70 border border-white/10 rounded-xl p-4 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-slate-400">State s={item.state}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.action === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    Action: {item.action_name}
                  </span>
                </div>
                <div className="text-slate-300 mb-3 text-[11px]">
                  {item.decoded_state.phase} &bull; {item.decoded_state.ns_queue} NS &bull; {item.decoded_state.ew_queue} EW
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Observed Next States s':</span>
                  {item.next_state_distribution.map((dist, dIdx) => (
                    <div key={dIdx} className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">s' = {dist.next_state}</span>
                      <span className="text-emerald-400 font-semibold">P = {(dist.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-950/50 border border-white/5 text-center text-xs text-slate-400">
            Start or step the live simulation to record empirical state transitions P(s' | s, a) in real time.
          </div>
        )}
      </div>
    </div>
  );
};

