import React, { useState, useEffect } from 'react';
import {
  Compass,
  Target,
  Layers,
  Award,
  Zap,
  CheckCircle,
  HelpCircle,
  Filter,
  Search,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  fetchMdpPolicy,
  fetchMdpValues,
} from '../services/api';
import { MdpPolicy, MdpStateValueItem } from '../types';

export const PolicyValuePage: React.FC = () => {
  const [selectedState, setSelectedState] = useState<number>(0);
  const [epsilon, setEpsilon] = useState<number>(0.1);
  const [policyData, setPolicyData] = useState<MdpPolicy | null>(null);

  // Q-table and Value function table state
  const [phaseFilter, setPhaseFilter] = useState<number | undefined>(undefined);
  const [stateValues, setStateValues] = useState<MdpStateValueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadValues();
  }, [phaseFilter]);

  const loadValues = async () => {
    setLoading(true);
    try {
      const data = await fetchMdpValues(phaseFilter, 80);
      setStateValues(data.states);
      if (data.states.length > 0 && selectedState === 0) {
        setSelectedState(data.states[0].state_index);
      }
    } catch (err) {
      console.error('Failed to load state values', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy(selectedState, epsilon);
  }, [selectedState, epsilon]);

  const loadPolicy = async (stateIdx: number, eps: number) => {
    try {
      const pol = await fetchMdpPolicy(stateIdx, eps);
      setPolicyData(pol);
    } catch (err) {
      console.error('Failed to load policy for state', err);
    }
  };

  const filteredStates = stateValues.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.state_index.toString().includes(term) ||
      s.readable.phase.toLowerCase().includes(term) ||
      s.readable.ns_queue.toLowerCase().includes(term) ||
      s.readable.ew_queue.toLowerCase().includes(term) ||
      s.optimal_action_name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 border border-white/10 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Compass size={14} /> Mathematical Formulation &amp; Analysis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Policy &pi;(a|s) &amp; Value Function Analysis: <span className="font-mono text-indigo-400">V(s) &amp; Q(s, a)</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
            Inspect the agent's learned decision policy, examine derived state values across the 288-state space,
            and explore the trade-off between greedy exploitation and &epsilon;-greedy exploration.
          </p>
        </div>
      </div>

      {/* Formal Definitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Concept 1</span>
            <h3 className="text-sm font-bold text-white mt-1">Policy &pi;(a | s)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Defines the agent's decision mapping: probability of choosing action a in state s.
            </p>
            <div className="mt-3 p-2.5 rounded bg-slate-950 font-mono text-xs text-indigo-300 border border-white/5">
              &pi;(a | s) = P(A<sub>t</sub> = a | S<sub>t</sub> = s)
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            For deterministic greedy execution: &pi;(s) = argmax<sub>a</sub> Q(s, a).
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Concept 2</span>
            <h3 className="text-sm font-bold text-white mt-1">State-Value Function V<sup>&pi;</sup>(s)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Expected cumulative discounted return starting from state s following policy &pi;:
            </p>
            <div className="mt-3 p-2.5 rounded bg-slate-950 font-mono text-xs text-blue-300 border border-white/5">
              V<sup>&pi;</sup>(s) = E<sub>&pi;</sub> [G<sub>t</sub> | S<sub>t</sub> = s]
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Measures the inherent long-term desirability of an intersection configuration.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-white/10 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Concept 3</span>
            <h3 className="text-sm font-bold text-white mt-1">Action-Value Function Q<sup>&pi;</sup>(s, a)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Expected return taking action a from state s, then subsequently following policy &pi;:
            </p>
            <div className="mt-3 p-2.5 rounded bg-slate-950 font-mono text-xs text-purple-300 border border-white/5">
              Q<sup>&pi;</sup>(s, a) = E<sub>&pi;</sub> [G<sub>t</sub> | S<sub>t</sub> = s, A<sub>t</sub> = a]
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Stored in the 288 &times; 2 tabular matrix trained by the Q-learning agent.
          </p>
        </div>
      </div>

      {/* Policy Evaluation Laboratory */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="text-indigo-400" size={20} />
              Policy Action Selection &amp; Justification Explorer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Inspect how the trained agent chooses between KEEP and SWITCH for any specific traffic state.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Exploration &epsilon;:</span>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value))}
              className="w-28 accent-indigo-500 cursor-pointer"
            />
            <span className="font-mono text-xs font-bold text-indigo-400">{epsilon.toFixed(2)}</span>
          </div>
        </div>

        {policyData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: State Breakdown */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target State</span>
                <span className="font-mono text-lg font-extrabold text-indigo-400">
                  State {policyData.state_index} <span className="text-xs font-normal text-slate-500">/ 287</span>
                </span>
              </div>
              <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Phase:</span>
                  <span className="font-medium text-white">{policyData.decoded_state.readable.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">North-South Queue:</span>
                  <span className="font-medium text-blue-400">{policyData.decoded_state.readable.ns_queue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">East-West Queue:</span>
                  <span className="font-medium text-amber-400">{policyData.decoded_state.readable.ew_queue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Green Time Elapsed:</span>
                  <span className="font-medium text-emerald-400">{policyData.decoded_state.readable.green_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waiting Urgency:</span>
                  <span className="font-medium text-rose-400">{policyData.decoded_state.readable.wait_urgency}</span>
                </div>
              </div>
            </div>

            {/* Middle: Q-Values & Action Probabilities */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-white/5 space-y-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Action Value Comparison Q(s, a)
              </span>

              {/* Action 0: KEEP */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">Action 0: KEEP Current Green</span>
                  <span className="font-mono text-blue-400 font-bold">{policyData.q_values.keep.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, (policyData.action_probabilities.keep * 100)))}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Selection Prob: {(policyData.action_probabilities.keep * 100).toFixed(1)}%</span>
                  {policyData.greedy_action === 0 && <span className="text-emerald-400 font-semibold">&bull; Greedy Best</span>}
                </div>
              </div>

              {/* Action 1: SWITCH */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-200">Action 1: SWITCH Corridors</span>
                  <span className="font-mono text-amber-400 font-bold">{policyData.q_values.switch.toFixed(3)}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, (policyData.action_probabilities.switch * 100)))}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Selection Prob: {(policyData.action_probabilities.switch * 100).toFixed(1)}%</span>
                  {policyData.greedy_action === 1 && <span className="text-emerald-400 font-semibold">&bull; Greedy Best</span>}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-between text-xs">
                <span className="text-slate-400">Derived State Value V(s):</span>
                <span className="font-mono font-bold text-emerald-400">{policyData.state_value_v.toFixed(3)}</span>
              </div>
            </div>

            {/* Right: Policy Decision Explanation */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-indigo-500/20 flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-2">
                  Natural Language Decision Justification
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {policyData.explanation}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Optimal Action:</span>
                <span className={`px-2.5 py-1 rounded font-bold ${policyData.greedy_action === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {policyData.greedy_action_name}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trained Q-Table & Value Function Table */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="text-blue-400" size={20} />
              Learned Q-Table &amp; State Value Function V*(s)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Actual Q-values loaded from trained model checkpoint across the finite state space.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/5 text-xs">
              <button
                onClick={() => setPhaseFilter(undefined)}
                className={`px-2.5 py-1 rounded font-medium ${phaseFilter === undefined ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                All Phases
              </button>
              <button
                onClick={() => setPhaseFilter(0)}
                className={`px-2.5 py-1 rounded font-medium ${phaseFilter === 0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                NS Green
              </button>
              <button
                onClick={() => setPhaseFilter(1)}
                className={`px-2.5 py-1 rounded font-medium ${phaseFilter === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                EW Green
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search state or condition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-lg px-3 py-1 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none w-48"
              />
            </div>
          </div>
        </div>

        {/* State Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">State (s)</th>
                <th className="py-3 px-4">Active Phase</th>
                <th className="py-3 px-4">NS Queue</th>
                <th className="py-3 px-4">EW Queue</th>
                <th className="py-3 px-4">Green Time</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4 text-right">Q(s, KEEP)</th>
                <th className="py-3 px-4 text-right">Q(s, SWITCH)</th>
                <th className="py-3 px-4 text-right">V*(s)</th>
                <th className="py-3 px-4 text-center">Optimal &pi;*(s)</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStates.map((row) => {
                const isSelected = selectedState === row.state_index;
                return (
                  <tr
                    key={row.state_index}
                    onClick={() => setSelectedState(row.state_index)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-950/40 hover:bg-blue-950/50'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-white">{row.state_index}</td>
                    <td className="py-2.5 px-4">{row.readable.phase}</td>
                    <td className="py-2.5 px-4 font-medium text-blue-400">{row.readable.ns_queue}</td>
                    <td className="py-2.5 px-4 font-medium text-amber-400">{row.readable.ew_queue}</td>
                    <td className="py-2.5 px-4 text-slate-400">{row.readable.green_time}</td>
                    <td className="py-2.5 px-4 text-slate-400">{row.readable.wait_urgency}</td>
                    <td className="py-2.5 px-4 font-mono text-right text-blue-300">{row.q_keep.toFixed(2)}</td>
                    <td className="py-2.5 px-4 font-mono text-right text-amber-300">{row.q_switch.toFixed(2)}</td>
                    <td className="py-2.5 px-4 font-mono text-right font-bold text-emerald-400">{row.v_value.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.optimal_action === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {row.optimal_action_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedState(row.state_index);
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

