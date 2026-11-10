"""
Finite Markov Decision Process (MDP) Model and Analysis for Intelligent Traffic Signal Control.
Formulates the sequential decision-making problem as M = (S, A, P, R, gamma).
Provides state encoding/decoding, Bellman equation calculations, policy derivations,
and transition tracking.
"""
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

class TrafficMDP:
    """
    Finite Markov Decision Process formulation for the 4-way traffic intersection.
    """

    # Feature dimensionalities
    PHASE_VALUES = [0, 1]  # 0: NS Green / EW Red, 1: EW Green / NS Red
    QUEUE_BINS = [0, 1, 2, 3]  # 0: 0-2 veh, 1: 3-6 veh, 2: 7-11 veh, 3: 12+ veh
    GREEN_TIME_BINS = [0, 1, 2]  # 0: <15s, 1: 15-30s, 2: >30s
    WAIT_BINS = [0, 1, 2]  # 0: NS Urgency, 1: EW Urgency, 2: Balanced

    TOTAL_STATES = 2 * 4 * 4 * 3 * 3  # 288 states
    TOTAL_ACTIONS = 2  # 0: KEEP, 1: SWITCH

    @staticmethod
    def get_definition() -> Dict[str, Any]:
        """Returns the complete formal MDP specification."""
        return {
            "title": "Finite Markov Decision Process for Adaptive Traffic Signal Optimization",
            "tuple": "M = (S, A, P, R, \u03b3)",
            "agent": {
                "name": "Reinforcement Learning Traffic Signal Agent",
                "role": "Autonomous intersection controller",
                "objective": "Select signal phase decisions at each discrete time step to minimize network delay and maximize vehicular throughput under non-stationary traffic arrival distributions.",
                "constraints": "Strict compliance with safety clearance intervals (yellow: 3.0s, all-red: 2.0s) and green phase bounds (min green: 10.0s, max green: 60.0s)."
            },
            "environment": {
                "name": "Isolated Four-Way Orthogonal Intersection",
                "approaches": [
                    {"id": "N", "name": "Northbound", "lanes": 1, "length_m": 100.0, "corridor": "North-South"},
                    {"id": "S", "name": "Southbound", "lanes": 1, "length_m": 100.0, "corridor": "North-South"},
                    {"id": "E", "name": "Eastbound", "lanes": 1, "length_m": 100.0, "corridor": "East-West"},
                    {"id": "W", "name": "Westbound", "lanes": 1, "length_m": 100.0, "corridor": "East-West"},
                ],
                "physics": "Car-following longitudinal deceleration with headway safety limits, collision avoidance, and stop line compliance.",
                "time_step_dt": 1.0,
            },
            "state_space": {
                "tabular_discrete": {
                    "cardinality": 288,
                    "formula": "|S| = |Phase| \u00d7 |Queue_NS| \u00d7 |Queue_EW| \u00d7 |GreenTime| \u00d7 |WaitRatio| = 2 \u00d7 4 \u00d7 4 \u00d7 3 \u00d7 3 = 288",
                    "encoding_equation": "s = phase \u00d7 144 + ns_q \u00d7 36 + ew_q \u00d7 9 + gt \u00d7 3 + wait_ratio",
                    "dimensions": [
                        {
                            "name": "Signal Phase",
                            "symbol": "p",
                            "cardinality": 2,
                            "bins": [
                                {"value": 0, "label": "Phase 0 (NS Green / EW Red)", "description": "North-South corridor has green right-of-way"},
                                {"value": 1, "label": "Phase 1 (EW Green / NS Red)", "description": "East-West corridor has green right-of-way"}
                            ]
                        },
                        {
                            "name": "North-South Queue Bins",
                            "symbol": "q_NS",
                            "cardinality": 4,
                            "bins": [
                                {"value": 0, "range": "[0, 2] vehicles", "label": "Low"},
                                {"value": 1, "range": "[3, 6] vehicles", "label": "Moderate"},
                                {"value": 2, "range": "[7, 11] vehicles", "label": "High"},
                                {"value": 3, "range": "[12, \u221e) vehicles", "label": "Saturated"}
                            ]
                        },
                        {
                            "name": "East-West Queue Bins",
                            "symbol": "q_EW",
                            "cardinality": 4,
                            "bins": [
                                {"value": 0, "range": "[0, 2] vehicles", "label": "Low"},
                                {"value": 1, "range": "[3, 6] vehicles", "label": "Moderate"},
                                {"value": 2, "range": "[7, 11] vehicles", "label": "High"},
                                {"value": 3, "range": "[12, \u221e) vehicles", "label": "Saturated"}
                            ]
                        },
                        {
                            "name": "Green Time Maturity",
                            "symbol": "g_t",
                            "cardinality": 3,
                            "bins": [
                                {"value": 0, "range": "< 15 s", "label": "Initial Green"},
                                {"value": 1, "range": "[15, 30] s", "label": "Mature Green"},
                                {"value": 2, "range": "> 30 s", "label": "Extended Green"}
                            ]
                        },
                        {
                            "name": "Waiting-Time Urgency",
                            "symbol": "u_w",
                            "cardinality": 3,
                            "bins": [
                                {"value": 0, "condition": "W_NS - W_EW > 15s", "label": "NS Urgency Higher"},
                                {"value": 1, "condition": "W_EW - W_NS > 15s", "label": "EW Urgency Higher"},
                                {"value": 2, "condition": "|W_NS - W_EW| \u2264 15s", "label": "Balanced Urgency"}
                            ]
                        }
                    ]
                },
                "deep_continuous": {
                    "dimensionality": 10,
                    "description": "Continuous normalized feature vector for Deep Q-Networks",
                    "vector": [
                        "N_queue / 15.0",
                        "S_queue / 15.0",
                        "E_queue / 15.0",
                        "W_queue / 15.0",
                        "N_wait_total / 60.0",
                        "S_wait_total / 60.0",
                        "E_wait_total / 60.0",
                        "W_wait_total / 60.0",
                        "phase_id (0.0 or 1.0)",
                        "phase_elapsed / 60.0"
                    ]
                }
            },
            "action_space": {
                "cardinality": 2,
                "actions": [
                    {
                        "action_id": 0,
                        "name": "KEEP",
                        "symbol": "a_0",
                        "description": "Maintain active corridor green signal. Extends current green phase by 1 second, prioritizing continuous flow and minimizing clearance overhead.",
                        "switch_penalty_applied": False
                    },
                    {
                        "action_id": 1,
                        "name": "SWITCH",
                        "symbol": "a_1",
                        "description": "Request immediate phase transition to opposing corridor. Initiates safety clearance protocol: 3s Yellow -> 2s All-Red -> Opposite Green.",
                        "switch_penalty_applied": True
                    }
                ],
                "safety_controller_overrides": [
                    "Minimum Green (10s): If phase_elapsed < 10s, action 1 (SWITCH) is suppressed or delayed.",
                    "Maximum Green (60s): If phase_elapsed >= 60s, phase switch is enforced automatically.",
                    "Yellow & All-Red Protection: During transitions (5s total), signal switching actions are buffered until clear."
                ]
            },
            "transition_probability": {
                "symbol": "P(s' | s, a)",
                "description": "Transition probability distribution from state s to state s' under action a. Due to stochastic Poisson vehicle arrivals, non-linear car-following dynamics, and driver reaction times, transitions are inherently stochastic in the real world and estimated empirically through continuous simulation interaction.",
                "markov_property": "P(S_{t+1} = s' | S_t = s_t, A_t = a_t, S_{t-1} = s_{t-1}, ...) = P(S_{t+1} = s' | S_t = s_t, A_t = a_t)"
            },
            "reward_function": {
                "equation": "R(s, a, s') = - [w_q \u00d7 (Q_{total} / 10) + w_w \u00d7 (\u0394W_{total} / 10) + w_s \u00d7 I(switch)] + w_{th} \u00d7 D",
                "default_weights": {
                    "queue_weight (w_q)": 0.5,
                    "waiting_weight (w_w)": 0.5,
                    "switch_weight (w_s)": 1.0,
                    "throughput_weight (w_th)": 2.0
                },
                "components": [
                    {
                        "name": "Queue Penalty",
                        "term": "- w_q \u00d7 (Q_{total} / 10)",
                        "purpose": "Penalizes persistent vehicle accumulation across all four intersection approaches."
                    },
                    {
                        "name": "Incremental Waiting Time Penalty",
                        "term": "- w_w \u00d7 (\u0394W_{total} / 10)",
                        "purpose": "Penalizes aggregate waiting time incurred during the step, combating vehicle starvation."
                    },
                    {
                        "name": "Switching Cost Penalty",
                        "term": "- w_s \u00d7 I(switch)",
                        "purpose": "Penalizes frequent signal changes that waste green capacity on yellow and all-red clearance intervals."
                    },
                    {
                        "name": "Throughput Incentive Bonus",
                        "term": "+ w_{th} \u00d7 D",
                        "purpose": "Directly rewards successful vehicle departures crossing the stop line."
                    }
                ]
            },
            "returns": {
                "symbol": "G_t",
                "equation": "G_t = \u2211_{k=0}^{\u221e} \u03b3^k R_{t+k+1} = R_{t+1} + \u03b3 R_{t+2} + \u03b3^2 R_{t+3} + ...",
                "discount_factor": {
                    "symbol": "\u03b3",
                    "default": 0.95,
                    "range": "[0, 1]",
                    "interpretation": "\u03b3 = 0 induces myopic immediate-reward maximization; \u03b3 \u2192 1 values far-future queue clearing and sustainable long-term intersection balance."
                }
            },
            "episodes": {
                "definition": "One complete simulation episode starting from zero or initial traffic at t = 0 to termination at t = episode_duration (default: 200s - 300s).",
                "termination_condition": "sim_time >= episode_duration",
                "metrics_tracked": [
                    "Episode Number",
                    "Cumulative Episodic Return \u2211 R_t",
                    "Mean Vehicle Waiting Time (seconds)",
                    "Mean and Maximum Queue Lengths",
                    "Total Completed Departures (Throughput)",
                    "Total Signal Transitions (Switches)"
                ]
            },
            "goals": [
                "Minimize average vehicular waiting time and delay across all approaches.",
                "Prevent approach starvation by limiting maximum wait times on unserved red phases.",
                "Maximize total completed vehicle throughput per hour.",
                "Avoid unnecessary oscillatory signal switching that induces clearance capacity waste.",
                "Guarantee 100% adherence to traffic safety clearance and minimum green constraints."
            ]
        }

    @classmethod
    def encode_state(cls, phase: int, ns_q_bin: int, ew_q_bin: int, gt_bin: int, wait_bin: int) -> int:
        """Encode 5 dimensional discrete features into flat index in [0, 287]."""
        phase = max(0, min(1, int(phase)))
        ns_q_bin = max(0, min(3, int(ns_q_bin)))
        ew_q_bin = max(0, min(3, int(ew_q_bin)))
        gt_bin = max(0, min(2, int(gt_bin)))
        wait_bin = max(0, min(2, int(wait_bin)))

        return int(
            phase * (4 * 4 * 3 * 3)
            + ns_q_bin * (4 * 3 * 3)
            + ew_q_bin * (3 * 3)
            + gt_bin * 3
            + wait_bin
        )

    @classmethod
    def decode_state(cls, state_idx: int) -> Dict[str, Any]:
        """Decode integer state index in [0, 287] into structured components."""
        state_idx = max(0, min(cls.TOTAL_STATES - 1, int(state_idx)))

        rem = state_idx
        phase = rem // (4 * 4 * 3 * 3)
        rem %= (4 * 4 * 3 * 3)
        ns_q = rem // (4 * 3 * 3)
        rem %= (4 * 3 * 3)
        ew_q = rem // (3 * 3)
        rem %= (3 * 3)
        gt = rem // 3
        wait_bin = rem % 3

        phase_labels = ["North-South Green", "East-West Green"]
        queue_ranges = ["0-2 veh (Low)", "3-6 veh (Moderate)", "7-11 veh (High)", "12+ veh (Saturated)"]
        gt_ranges = ["<15s (Initial Green)", "15-30s (Mature Green)", ">30s (Extended Green)"]
        wait_labels = ["NS Urgency (>15s disparity)", "EW Urgency (>15s disparity)", "Balanced (\u226415s disparity)"]

        return {
            "state_index": state_idx,
            "components": {
                "phase": phase,
                "ns_q_bin": ns_q,
                "ew_q_bin": ew_q,
                "green_time_bin": gt,
                "wait_urgency_bin": wait_bin
            },
            "readable": {
                "phase": phase_labels[phase],
                "active_corridor": "North-South" if phase == 0 else "East-West",
                "opposing_corridor": "East-West" if phase == 0 else "North-South",
                "ns_queue": queue_ranges[ns_q],
                "ew_queue": queue_ranges[ew_q],
                "green_time": gt_ranges[gt],
                "wait_urgency": wait_labels[wait_bin]
            }
        }

    @staticmethod
    def calculate_reward(
        total_queue: float,
        incremental_wait: float,
        switch_triggered: bool,
        departures: int,
        queue_weight: float = 0.5,
        waiting_weight: float = 0.5,
        switch_weight: float = 1.0,
        throughput_weight: float = 2.0,
    ) -> Dict[str, Any]:
        """
        Calculates exact reward with complete arithmetic trace:
        R = -[w_q*(Q/10) + w_w*(dW/10) + w_s*I(switch)] + w_th*D
        """
        queue_penalty = queue_weight * (total_queue / 10.0)
        waiting_penalty = waiting_weight * (incremental_wait / 10.0)
        switch_penalty = switch_weight * (1.0 if switch_triggered else 0.0)
        total_cost = queue_penalty + waiting_penalty + switch_penalty

        throughput_bonus = throughput_weight * float(departures)
        reward = -total_cost + throughput_bonus

        return {
            "total_reward": round(reward, 4),
            "breakdown": {
                "queue_penalty": round(queue_penalty, 4),
                "waiting_penalty": round(waiting_penalty, 4),
                "switch_penalty": round(switch_penalty, 4),
                "throughput_bonus": round(throughput_bonus, 4),
                "total_cost": round(total_cost, 4),
            },
            "inputs": {
                "total_queue": total_queue,
                "incremental_wait": incremental_wait,
                "switch_triggered": switch_triggered,
                "departures": departures,
            },
            "weights": {
                "queue_weight": queue_weight,
                "waiting_weight": waiting_weight,
                "switch_weight": switch_weight,
                "throughput_weight": throughput_weight,
            },
            "equation": f"- [{queue_weight} \u00d7 ({total_queue}/10) + {waiting_weight} \u00d7 ({incremental_wait}/10) + {switch_weight} \u00d7 {1 if switch_triggered else 0}] + {throughput_weight} \u00d7 {departures} = {round(reward, 4)}"
        }

    @staticmethod
    def calculate_bellman_update(
        q_current: float,
        alpha: float,
        reward: float,
        gamma: float,
        next_max_q: float,
    ) -> Dict[str, Any]:
        """
        Executes a single step of the Bellman Q-Learning update:
        TD Target = r + gamma * max_a' Q(s', a')
        TD Error = TD Target - Q(s, a)
        Updated Q(s, a) = Q(s, a) + alpha * TD Error
        """
        discounted_future = gamma * next_max_q
        td_target = reward + discounted_future
        td_error = td_target - q_current
        adjustment = alpha * td_error
        updated_q = q_current + adjustment

        steps = [
            f"Step 1: Compute Discounted Future Value = \u03b3 \u00d7 max_a' Q(s', a') = {gamma:.3f} \u00d7 {next_max_q:.3f} = {discounted_future:.4f}",
            f"Step 2: Compute TD Target = r + \u03b3 \u00d7 max_a' Q(s', a') = {reward:.3f} + {discounted_future:.4f} = {td_target:.4f}",
            f"Step 3: Compute TD Error (\u03b4) = Target - Q(s,a) = {td_target:.4f} - {q_current:.4f} = {td_error:.4f}",
            f"Step 4: Compute Parameter Adjustment = \u03b1 \u00d7 \u03b4 = {alpha:.3f} \u00d7 {td_error:.4f} = {adjustment:.4f}",
            f"Step 5: Compute Updated Q(s,a) = Q(s,a) + \u03b1 \u03b4 = {q_current:.4f} + {adjustment:.4f} = {updated_q:.4f}"
        ]

        return {
            "q_current": round(q_current, 4),
            "alpha": round(alpha, 4),
            "reward": round(reward, 4),
            "gamma": round(gamma, 4),
            "next_max_q": round(next_max_q, 4),
            "discounted_future": round(discounted_future, 4),
            "td_target": round(td_target, 4),
            "td_error": round(td_error, 4),
            "adjustment": round(adjustment, 4),
            "updated_q": round(updated_q, 4),
            "steps": steps,
            "mathematical_notation": "Q(s, a) \u2190 Q(s, a) + \u03b1 [r + \u03b3 max_{a'} Q(s', a') - Q(s, a)]"
        }

