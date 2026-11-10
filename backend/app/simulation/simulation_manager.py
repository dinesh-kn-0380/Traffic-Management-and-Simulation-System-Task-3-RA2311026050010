"""
Simulation Manager for interactive live simulation sessions.
Handles play/pause/reset/speed, multiple controller modes (manual, baseline, Q-learning, DQN),
MDP state tracking, decision justifications, and empirical transition recording.
"""
from typing import Dict, Any, Optional, List
from collections import deque, defaultdict
import threading
import time
import os
import torch
import numpy as np

from app.simulation.environment import TrafficEnvironment
from app.simulation.signal_controller import SignalPhase
from app.simulation.mdp import TrafficMDP
from app.training.baseline import FixedTimeController
from app.agents.q_learning import QLearningAgent
from app.agents.dqn import DQNAgent

class LiveSimulationManager:
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.env = TrafficEnvironment(scenario_id="balanced", episode_duration=3600.0)
        self.controller_type: str = "baseline"  # 'baseline', 'q_learning', 'dqn', 'manual'
        self.baseline_controller = FixedTimeController(fixed_green=30.0)

        self.q_agent: Optional[QLearningAgent] = None
        self.dqn_agent: Optional[DQNAgent] = None

        self.is_running: bool = False
        self.speed_multiplier: float = 1.0  # 1x, 2x, 5x
        self.tick_interval: float = 0.5  # real-time seconds per simulation step

        self.sim_thread: Optional[threading.Thread] = None
        self.lock = threading.RLock()

        # Decision logging and MDP transition tracking
        self.decision_history: deque = deque(maxlen=100)
        self.transition_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.latest_decision: Optional[Dict[str, Any]] = None
        self.decision_counter: int = 0

        # Try loading latest trained models if available
        self._load_default_models()

    def _load_default_models(self):
        q_path = os.path.join(self.models_dir, "q_learning_latest.json")
        if os.path.exists(q_path):
            try:
                self.q_agent = QLearningAgent()
                self.q_agent.load(q_path)
            except Exception:
                self.q_agent = None

        dqn_path = os.path.join(self.models_dir, "dqn_latest.pt")
        if os.path.exists(dqn_path):
            try:
                self.dqn_agent = DQNAgent()
                self.dqn_agent.load(dqn_path)
            except Exception:
                self.dqn_agent = None

    def reset(self, scenario_id: Optional[str] = None, seed: Optional[int] = None) -> Dict[str, Any]:
        with self.lock:
            if scenario_id:
                self.env.set_scenario(scenario_id)
            self.env.reset(seed=seed)
            self.decision_history.clear()
            self.decision_counter = 0
            self.latest_decision = None
            return self.get_state()

    def set_controller(self, controller_type: str, model_path: Optional[str] = None):
        with self.lock:
            self.controller_type = controller_type
            if controller_type == "q_learning" and model_path:
                self.q_agent = QLearningAgent()
                self.q_agent.load(model_path)
            elif controller_type == "dqn" and model_path:
                self.dqn_agent = DQNAgent()
                self.dqn_agent.load(model_path)

    def set_speed(self, speed: float):
        with self.lock:
            self.speed_multiplier = max(0.2, min(10.0, speed))

    def step(self, manual_action: int = 0) -> Dict[str, Any]:
        """Single simulation step under current controller with full MDP trace."""
        with self.lock:
            disc_state = self.env.get_discrete_state()
            cont_state = self.env.get_continuous_state()
            decoded_state = TrafficMDP.decode_state(disc_state)

            q_values = {"keep": 0.0, "switch": 0.0}
            reason = ""
            action = 0
            safety_override = None

            elapsed = self.env.signal_controller.phase_elapsed_time
            is_trans = self.env.signal_controller.is_transitioning

            # Evaluate Q-values if agents are loaded
            if self.q_agent is not None:
                q_values["keep"] = float(self.q_agent.q_table[disc_state, 0])
                q_values["switch"] = float(self.q_agent.q_table[disc_state, 1])
            elif self.dqn_agent is not None:
                try:
                    with torch.no_grad():
                        tensor_s = torch.tensor(cont_state, dtype=torch.float32).unsqueeze(0)
                        dqn_q = self.dqn_agent.q_network(tensor_s).squeeze(0).cpu().numpy()
                        q_values["keep"] = float(dqn_q[0])
                        q_values["switch"] = float(dqn_q[1])
                except Exception:
                    pass

            # Determine proposed action
            if self.controller_type == "manual":
                action = manual_action
                reason = f"Manual Operator Intervention: Selected {'SWITCH' if action == 1 else 'KEEP'}."
            elif self.controller_type == "baseline":
                action = self.baseline_controller.select_action(
                    phase_elapsed=elapsed,
                    is_transitioning=is_trans,
                )
                reason = (
                    f"Fixed-Time Rule: Active phase timer ({elapsed:.1f}s) "
                    + (f"exceeded fixed green duration (30.0s) -> SWITCH triggered." if action == 1 else f"within green interval -> KEEP maintained.")
                )
            elif self.controller_type == "q_learning":
                if self.q_agent:
                    action = self.q_agent.select_action(disc_state, deterministic=True)
                    best_q = q_values["switch"] if action == 1 else q_values["keep"]
                    alt_q = q_values["keep"] if action == 1 else q_values["switch"]
                    diff = best_q - alt_q
                    if action == 1:
                        reason = (
                            f"Q-Learning Policy: SWITCH selected (Q={best_q:.2f} > Q_keep={alt_q:.2f}, \u0394={diff:+.2f}). "
                            f"Opposing corridor demand ({decoded_state['readable']['opposing_corridor']}) warrants phase transition."
                        )
                    else:
                        reason = (
                            f"Q-Learning Policy: KEEP selected (Q={best_q:.2f} \u2265 Q_switch={alt_q:.2f}, \u0394={diff:+.2f}). "
                            f"Current active corridor ({decoded_state['readable']['active_corridor']}) retains higher flow utility."
                        )
                else:
                    action = self.baseline_controller.select_action(phase_elapsed=elapsed, is_transitioning=is_trans)
                    reason = "Default Fixed Controller (Q-Learning agent checkpoint not loaded)."
            elif self.controller_type == "dqn":
                if self.dqn_agent:
                    action = self.dqn_agent.select_action(cont_state, deterministic=True)
                    best_q = q_values["switch"] if action == 1 else q_values["keep"]
                    alt_q = q_values["keep"] if action == 1 else q_values["switch"]
                    reason = (
                        f"DQN Neural Policy: Selected {'SWITCH' if action == 1 else 'KEEP'} "
                        f"(Q={best_q:.2f} vs alternative Q={alt_q:.2f}) from 10-D continuous traffic state observation."
                    )
                else:
                    action = self.baseline_controller.select_action(phase_elapsed=elapsed, is_transitioning=is_trans)
                    reason = "Default Fixed Controller (DQN model checkpoint not loaded)."

            # Safety Controller constraints check
            if is_trans:
                safety_override = "Clearance Phase Active: Intersection currently serving Yellow or All-Red clearance; phase change buffered."
            elif action == 1 and elapsed < self.env.signal_controller.min_green:
                safety_override = f"Safety Controller Minimum Green: Elapsed green ({elapsed:.1f}s) < Min Green (10.0s); switch request held."
            elif elapsed >= self.env.signal_controller.max_green:
                safety_override = f"Safety Controller Maximum Green: Elapsed green ({elapsed:.1f}s) >= Max Green (60.0s); switch forced to avoid starvation."

            # Step the environment
            next_disc_state, next_cont_state, step_reward, done, info = self.env.step(action)
            next_decoded = TrafficMDP.decode_state(next_disc_state)

            # Record transition
            trans_key = f"{disc_state}_{action}"
            self.transition_counts[trans_key][str(next_disc_state)] += 1

            self.decision_counter += 1
            decision_record = {
                "decision_id": self.decision_counter,
                "sim_time": round(self.env.sim_time, 1),
                "discrete_state": disc_state,
                "decoded_state": decoded_state,
                "continuous_state": [round(float(x), 3) for x in cont_state],
                "action": action,
                "action_name": "SWITCH" if action == 1 else "KEEP",
                "q_values": {k: round(v, 3) for k, v in q_values.items()},
                "reward": round(step_reward, 3),
                "next_discrete_state": next_disc_state,
                "next_decoded_state": next_decoded,
                "reason": reason,
                "safety_override": safety_override,
                "departures": info["departed_this_step"],
                "total_queue": info["total_queue"],
                "active_corridor": decoded_state["readable"]["active_corridor"],
                "current_phase": info["current_phase"],
            }

            self.latest_decision = decision_record
            self.decision_history.append(decision_record)

            return self.get_state()

    def start(self):
        with self.lock:
            if self.is_running:
                return
            self.is_running = True
            self.sim_thread = threading.Thread(target=self._loop, daemon=True)
            self.sim_thread.start()

    def pause(self):
        with self.lock:
            self.is_running = False

    def _loop(self):
        while self.is_running:
            self.step()
            sleep_time = max(0.01, (self.tick_interval / max(0.1, self.speed_multiplier)))
            time.sleep(sleep_time)

    def get_state(self) -> Dict[str, Any]:
        with self.lock:
            state = self.env.render_dict()
            state["controller_type"] = self.controller_type
            state["is_running"] = self.is_running
            state["speed_multiplier"] = self.speed_multiplier
            state["latest_decision"] = self.latest_decision
            state["discrete_state"] = self.env.get_discrete_state()
            state["decoded_state"] = TrafficMDP.decode_state(state["discrete_state"])
            state["continuous_state"] = [round(float(x), 3) for x in self.env.get_continuous_state()]
            return state

    def get_decision_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self.lock:
            history = list(self.decision_history)
            return history[-limit:] if limit > 0 else history

    def get_transition_summary(self, limit: int = 50) -> Dict[str, Any]:
        with self.lock:
            transitions = []
            for sa_key, next_states in list(self.transition_counts.items())[-limit:]:
                parts = sa_key.split("_")
                s = int(parts[0])
                a = int(parts[1])
                total_obs = sum(next_states.values())
                dist = [
                    {
                        "next_state": int(s_prime),
                        "count": count,
                        "probability": round(count / total_obs, 4) if total_obs > 0 else 0.0,
                        "decoded": TrafficMDP.decode_state(int(s_prime))["readable"]
                    }
                    for s_prime, count in sorted(next_states.items(), key=lambda x: x[1], reverse=True)[:5]
                ]
                transitions.append({
                    "state": s,
                    "action": a,
                    "action_name": "SWITCH" if a == 1 else "KEEP",
                    "decoded_state": TrafficMDP.decode_state(s)["readable"],
                    "total_samples": total_obs,
                    "next_state_distribution": dist,
                })
            return {
                "total_unique_state_actions": len(self.transition_counts),
                "sample_transitions": transitions[:limit],
            }
