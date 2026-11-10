import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  Layers,
  Clock,
  Car,
  ToggleLeft,
  ChevronRight,
  Sliders,
  Sparkles,
  Network,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { IntersectionCanvas } from '../components/IntersectionCanvas';
import { SimulationState, Scenario, DecisionRecord } from '../types';
import {
  fetchSimulationState,
  startSimulation,
  pauseSimulation,
  stepSimulation,
  resetSimulation,
  setSimulationController,
  setSimulationSpeed,
  fetchDecisionHistory,
} from '../services/api';

interface LiveSimulationPageProps {
  scenarios: Scenario[];
}

export const LiveSimulationPage: React.FC<LiveSimulationPageProps> = ({ scenarios }) => {
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [controllerType, setControllerType] = useState<string>('baseline');
  const [selectedScenario, setSelectedScenario] = useState<string>('balanced');
  const [isStepping, setIsStepping] = useState<boolean>(false);
  const [decisionLog, setDecisionLog] = useState<DecisionRecord[]>([]);

  // Poll state or connect WebSocket
  useEffect(() => {
    let intervalId: any = null;

    const update = async () => {
      try {
        const state = await fetchSimulationState();
        setSimState(state);
        setIsRunning(!!state.is_running);
        if (state.controller_type) setControllerType(state.controller_type);

        // Fetch decision log periodically
        const hist = await fetchDecisionHistory(12);
        setDecisionLog(hist.history || []);
      } catch (err) {
        console.error('Failed to fetch sim state', err);
      }
    };

    update();
    // Fast polling for smooth vehicle movement
    intervalId = setInterval(update, 200);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleTogglePlay = async () => {
    try {
      if (isRunning) {
        await pauseSimulation();
        setIsRunning(false);
      } else {
        await startSimulation();
        setIsRunning(true);
      }
      const state = await fetchSimulationState();
      setSimState(state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStep = async (action: number = 0) => {
    setIsStepping(true);
    try {
      const state = await stepSimulation(action, controllerType);
      setSimState(state);
    } catch (err) {
      console.error(err);
    } finally {
      setIsStepping(false);
    }
  };

  const handleReset = async () => {
    try {
      const state = await resetSimulation(selectedScenario);
      setSimState(state);
      setIsRunning(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed);
    try {
      await setSimulationSpeed(newSpeed);
    } catch (err) {
      console.error(err);
    }
  };

  const handleControllerChange = async (newController: string) => {
    setControllerType(newController);
    try {
      await setSimulationController(newController);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScenarioChange = async (newScenario: string) => {
    setSelectedScenario(newScenario);
    try {
      const state = await resetSimulation(newScenario);
      setSimState(state);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-blue-500" size={24} />
            Live Intersection Microscopic Simulation
          </h1>
          <p className="text-xs text-slate-400">
            Real-time microscopic vehicle car-following dynamics, clearance safety interlocks, and RL policy execution.
          </p>
        </div>

        {/* Quick Scenario Selector */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-white/10">
          <span className="text-xs font-semibold text-slate-400 px-2">Scenario:</span>
          <select
            value={selectedScenario}
            onChange={(e) => handleScenarioChange(e.target.value)}
            className="bg-slate-800 text-xs font-semibold text-white px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Canvas & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Center: Intersection Canvas */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <IntersectionCanvas simulationState={simState} />
        </div>

        {/* Right Sidebar: Control Deck & Telemetry */}
        <div className="space-y-5">
          {/* Simulation Controls Panel */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sliders size={14} className="text-blue-400" />
              Simulation Controls
            </h2>

            {/* Play / Step / Reset Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleTogglePlay}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-lg ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                {isRunning ? 'Pause' : 'Start'}
              </button>

              <button
                onClick={() => handleStep(0)}
                disabled={isRunning || isStepping}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs border border-white/10 transition-all"
              >
                <FastForward size={15} />
                Step
              </button>

              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-semibold text-xs border border-white/10 transition-all"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </div>

            {/* Speed Multipliers */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">Simulation Speed:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.5, 1.0, 2.0, 5.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      speed === s
                        ? 'bg-blue-600 text-white border border-blue-400/50 shadow'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-white/5'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Active Controller Switcher */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400">Active Controller:</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'baseline', label: 'Fixed-Time (30s)' },
                  { id: 'q_learning', label: 'Tabular Q-Learning' },
                  { id: 'dqn', label: 'Deep Q-Network' },
                  { id: 'manual', label: 'Manual Control' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleControllerChange(c.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      controllerType === c.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold'
                        : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs">{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Action Button (Only if manual mode is chosen) */}
            {controllerType === 'manual' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="text-xs font-semibold text-amber-400">Manual Signal Request</div>
                <button
                  onClick={() => handleStep(1)}
                  disabled={simState?.is_transitioning}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all"
                >
                  Request Phase Switch
                </button>
                <p className="text-[10px] text-slate-400">
                  Respects safety constraints: Minimum green (10s), yellow clearance (3s), and all-red (2s).
                </p>
              </div>
            )}
          </div>

          {/* Telemetry Metrics */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Clock size={14} className="text-emerald-400" />
              Live Simulation Telemetry
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] font-medium text-slate-400">Simulation Clock</span>
                <div className="text-lg font-bold font-mono text-white">
                  {simState ? `${simState.sim_time}s` : '0.0s'}
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] font-medium text-slate-400">Departures (Throughput)</span>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {simState ? simState.completed_count : 0}
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] font-medium text-slate-400">Total In-Queue</span>
                <div className="text-lg font-bold font-mono text-amber-400">
                  {simState ? simState.total_queue : 0} veh
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[10px] font-medium text-slate-400">Signal Switches</span>
                <div className="text-lg font-bold font-mono text-blue-400">
                  {simState ? simState.switch_count : 0}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 flex justify-between items-center text-xs">
              <span className="text-slate-400">Cumulative Episode Reward:</span>
              <span className={`font-mono font-bold ${
                (simState?.cumulative_reward || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {simState ? simState.cumulative_reward : 0.0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Task 3: Live MDP Decision Inspector & Transition Tracker */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Network className="text-blue-400" size={20} />
              Live MDP Decision Inspector &amp; Step-by-Step Transition Log
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Observes the active MDP state observation s &isin; S, agent policy evaluation Q(s, a), immediate reward R(s, a, s'), and safety interlocks in real time.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-white/5">
            <span>MDP State:</span>
            <span className="text-indigo-400 font-bold">
              {(simState as any)?.discrete_state !== undefined ? `State ${(simState as any).discrete_state} / 287` : 'Initialized'}
            </span>
          </div>
        </div>

        {/* Live State Breakdown & Active Action Q-Values */}
        {(simState as any)?.latest_decision && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">Current Observation (s &isin; S)</span>
              <div className="font-semibold text-white">
                {(simState as any).latest_decision.decoded_state?.readable?.phase || 'North-South Active'}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
                <div>NS: <span className="text-blue-400">{(simState as any).latest_decision.decoded_state?.readable?.ns_queue}</span></div>
                <div>EW: <span className="text-amber-400">{(simState as any).latest_decision.decoded_state?.readable?.ew_queue}</span></div>
                <div>Green: <span className="text-emerald-400">{(simState as any).latest_decision.decoded_state?.readable?.green_time}</span></div>
                <div>Urgency: <span className="text-rose-400">{(simState as any).latest_decision.decoded_state?.readable?.wait_urgency}</span></div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">Q-Values &amp; Action Selection</span>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Q(s, KEEP): <strong className="font-mono text-blue-400">{(simState as any).latest_decision.q_values?.keep?.toFixed(2)}</strong></span>
                <span className="text-slate-300">Q(s, SWITCH): <strong className="font-mono text-amber-400">{(simState as any).latest_decision.q_values?.switch?.toFixed(2)}</strong></span>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Selected Action:</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${(simState as any).latest_decision.action === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {(simState as any).latest_decision.action_name}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-500">Immediate Reward &amp; Safety</span>
              <div className="flex justify-between">
                <span className="text-slate-400">Step Reward R:</span>
                <span className={`font-mono font-bold ${(simState as any).latest_decision.reward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(simState as any).latest_decision.reward?.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                {(simState as any).latest_decision.safety_override ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <ShieldCheck size={12} /> {(simState as any).latest_decision.safety_override}
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle size={12} /> Safety clearance verified; unconstrained RL action executed.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Step-by-Step Sequential Decision Log Table */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Recent Sequential Decision History Log
          </span>
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] sticky top-0 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Sim Time</th>
                  <th className="py-2.5 px-3">Observed State</th>
                  <th className="py-2.5 px-3">Selected Action</th>
                  <th className="py-2.5 px-3">Policy Justification &amp; Reasoning</th>
                  <th className="py-2.5 px-3 text-right">Reward</th>
                  <th className="py-2.5 px-3 text-center">Safety Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {decisionLog.length > 0 ? (
                  decisionLog.slice().reverse().map((rec) => (
                    <tr key={rec.decision_id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-mono text-slate-500">{rec.decision_id}</td>
                      <td className="py-2 px-3 font-mono text-white">{rec.sim_time}s</td>
                      <td className="py-2 px-3 font-mono text-indigo-400">s={rec.discrete_state}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rec.action === 1 ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {rec.action_name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300 max-w-md truncate" title={rec.reason}>
                        {rec.reason}
                      </td>
                      <td className={`py-2 px-3 font-mono text-right font-semibold ${rec.reward >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {rec.reward > 0 ? `+${rec.reward.toFixed(2)}` : rec.reward.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {rec.safety_override ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Override
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Step the simulation or click 'Start' to begin logging real-time MDP decisions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
