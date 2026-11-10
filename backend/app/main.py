"""
FastAPI application providing complete REST and WebSocket APIs
for Intelligent Traffic Signal Optimization Using Reinforcement Learning.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import csv
import os
import time
import asyncio
from typing import Dict, Any, Optional

from app.schemas.schemas import (
    TrainRequest,
    EvaluateRequest,
    SimulationConfigUpdate,
    SimulationResetRequest,
    SimulationStepRequest,
    BellmanCalculateRequest,
    RewardCalculateRequest,
)
from app.simulation.scenarios import SCENARIOS
from app.simulation.simulation_manager import LiveSimulationManager
from app.simulation.mdp import TrafficMDP
from app.training.trainer import TrainingManager
from app.training.evaluation import EvaluationEngine
from app.simulation.environment import TrafficEnvironment
from app.agents.q_learning import QLearningAgent
from app.agents.dqn import DQNAgent
from app.storage.database import (
    init_db,
    save_experiment,
    list_experiments,
    save_evaluation,
    list_evaluations,
)

# Initialize database
init_db()

app = FastAPI(
    title="Intelligent Traffic Signal Optimization API",
    description="Adaptive Traffic Management & Simulation System powered by Tabular Q-Learning and PyTorch Deep Q-Networks",
    version="1.0.0",
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Shared singletons
training_mgr = TrainingManager(models_dir=MODELS_DIR)
sim_mgr = LiveSimulationManager(models_dir=MODELS_DIR)


# -------------------------------------------------------------
# General & Health Endpoints
# -------------------------------------------------------------
@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "backend": "FastAPI",
        "models_available": os.path.exists(MODELS_DIR),
    }

@app.get("/api/algorithms")
def get_algorithms():
    return {
        "algorithms": [
            {
                "id": "q_learning",
                "name": "Tabular Q-Learning",
                "type": "Model-Free Value-Based RL",
                "description": "Learns state-action utility table Q(s,a) with exact Bellman temporal difference updates.",
                "state_type": "Discretized Tuple (288 states)",
                "action_type": "Discrete (0: Keep, 1: Switch)",
            },
            {
                "id": "dqn",
                "name": "Deep Q-Network (DQN)",
                "type": "Deep Reinforcement Learning (PyTorch)",
                "description": "Multi-layer perceptron with Experience Replay and Target Network predicting continuous Q-values.",
                "state_type": "Normalized 10-D Vector",
                "action_type": "Discrete (0: Keep, 1: Switch)",
            },
            {
                "id": "baseline",
                "name": "Fixed-Time Controller",
                "type": "Rule-Based Deterministic",
                "description": "Standard alternating signal cycle with configured green interval and safety clearances.",
                "state_type": "Clock / Elapsed Green",
                "action_type": "Periodic Switch",
            },
        ]
    }

@app.get("/api/scenarios")
def get_scenarios():
    return {
        "scenarios": [
            {
                "id": sc.id,
                "name": sc.name,
                "description": sc.description,
                "base_rates": sc.base_rates,
            }
            for sc in SCENARIOS.values()
        ]
    }


# -------------------------------------------------------------
# Configuration Endpoints
# -------------------------------------------------------------
@app.get("/api/config")
def get_config():
    env = sim_mgr.env
    return {
        "timing": {
            "min_green": env.min_green,
            "max_green": env.max_green,
            "yellow_duration": env.yellow_duration,
            "all_red_duration": env.all_red_duration,
        },
        "rewards": {
            "queue_weight": env.queue_weight,
            "waiting_weight": env.waiting_weight,
            "switch_weight": env.switch_weight,
            "throughput_weight": env.throughput_weight,
        },
        "geometry": {
            "road_length": env.road_length,
            "intersection_length": env.intersection_length,
            "departure_length": env.departure_length,
        }
    }

@app.post("/api/config")
def update_config(cfg: SimulationConfigUpdate):
    env = sim_mgr.env
    if cfg.min_green is not None:
        env.min_green = cfg.min_green
        env.signal_controller.min_green = cfg.min_green
    if cfg.max_green is not None:
        env.max_green = cfg.max_green
        env.signal_controller.max_green = cfg.max_green
    if cfg.yellow_duration is not None:
        env.yellow_duration = cfg.yellow_duration
        env.signal_controller.yellow_duration = cfg.yellow_duration
    if cfg.all_red_duration is not None:
        env.all_red_duration = cfg.all_red_duration
        env.signal_controller.all_red_duration = cfg.all_red_duration
    if cfg.queue_weight is not None:
        env.queue_weight = cfg.queue_weight
    if cfg.waiting_weight is not None:
        env.waiting_weight = cfg.waiting_weight
    if cfg.switch_weight is not None:
        env.switch_weight = cfg.switch_weight
    if cfg.throughput_weight is not None:
        env.throughput_weight = cfg.throughput_weight

    return {"status": "updated", "config": get_config()}


# -------------------------------------------------------------
# Training Control Endpoints
# -------------------------------------------------------------
@app.post("/api/train/start")
def start_training(req: TrainRequest):
    success = training_mgr.start_training(
        algorithm=req.algorithm,
        episodes=req.episodes,
        episode_duration=req.episode_duration,
        scenario_id=req.scenario_id,
        alpha=req.alpha,
        gamma=req.gamma,
        epsilon=req.epsilon,
        epsilon_min=req.epsilon_min,
        epsilon_decay=req.epsilon_decay,
        seed=req.seed,
    )
    if not success:
        raise HTTPException(status_code=400, detail="Training is already running")
    return {"status": "started", "training": training_mgr.get_status()}

@app.get("/api/train/status")
def get_training_status():
    status = training_mgr.get_status()
    # If training recently completed and has history not yet saved, save it to DB
    if not status["is_training"] and status["history_length"] > 0 and not getattr(training_mgr, "_saved_to_db", False):
        try:
            latest = status["latest_metric"] or {}
            exp_id = f"EXP_{int(time.time())}"
            save_experiment(
                experiment_id=exp_id,
                name=f"{status['algorithm'].upper()} on {status['scenario']}",
                algorithm=status["algorithm"],
                scenario=status["scenario"],
                episodes=status["total_episodes"],
                seed=42,
                hyperparameters={
                    "episodes": status["total_episodes"],
                    "algorithm": status["algorithm"],
                },
                training_duration=status["elapsed_seconds"],
                mean_reward=latest.get("total_reward", 0.0),
                mean_waiting_time=latest.get("mean_waiting_time", 0.0),
                mean_queue_length=latest.get("mean_queue_length", 0.0),
                throughput=latest.get("total_departures", 0),
                switch_frequency=latest.get("total_switches", 0),
                checkpoint_path=f"models/{status['algorithm']}_latest.json",
            )
            training_mgr._saved_to_db = True
        except Exception:
            pass

    return status

@app.get("/api/train/history")
def get_training_history():
    return {"history": training_mgr.history}

@app.post("/api/train/pause")
def pause_training():
    training_mgr.pause_training()
    return {"status": "paused", "training": training_mgr.get_status()}

@app.post("/api/train/resume")
def resume_training():
    training_mgr.resume_training()
    return {"status": "resumed", "training": training_mgr.get_status()}

@app.post("/api/train/stop")
def stop_training():
    training_mgr.stop_training()
    return {"status": "stopping", "training": training_mgr.get_status()}


# -------------------------------------------------------------
# Model Management & Laboratory Endpoints
# -------------------------------------------------------------
@app.get("/api/models")
def list_models():
    models = []
    if os.path.exists(MODELS_DIR):
        for f in os.listdir(MODELS_DIR):
            fpath = os.path.join(MODELS_DIR, f)
            if f.endswith(".json") or f.endswith(".pt"):
                stat = os.stat(fpath)
                models.append({
                    "filename": f,
                    "path": fpath,
                    "size_bytes": stat.st_size,
                    "modified": stat.st_mtime,
                    "algorithm": "q_learning" if f.endswith(".json") else "dqn",
                })
    return {"models": models}

@app.get("/api/models/q_table")
def get_q_table():
    """Returns decoded Q-table entries for interactive exploration in Algorithm Lab."""
    # Check if training agent has Q-table or load latest
    agent = None
    if training_mgr.agent and isinstance(training_mgr.agent, QLearningAgent):
        agent = training_mgr.agent
    elif sim_mgr.q_agent:
        agent = sim_mgr.q_agent
    else:
        q_path = os.path.join(MODELS_DIR, "q_learning_latest.json")
        if os.path.exists(q_path):
            agent = QLearningAgent()
            agent.load(q_path)

    if agent is None:
        # Return initialized empty representation
        agent = QLearningAgent()

    return agent.get_q_table_summary(max_entries=60)


# -------------------------------------------------------------
# Evaluation & Benchmarking Endpoints
# -------------------------------------------------------------
@app.post("/api/evaluate")
def run_evaluation(req: EvaluateRequest):
    env = TrafficEnvironment(scenario_id=req.scenario_id, episode_duration=200.0)
    engine = EvaluationEngine(env=env)

    agent = None
    if req.algorithm == "q_learning":
        agent = QLearningAgent()
        model_path = req.model_path or os.path.join(MODELS_DIR, "q_learning_latest.json")
        if os.path.exists(model_path):
            agent.load(model_path)
    elif req.algorithm == "dqn":
        agent = DQNAgent()
        model_path = req.model_path or os.path.join(MODELS_DIR, "dqn_latest.pt")
        if os.path.exists(model_path):
            agent.load(model_path)

    comparison = engine.compare(
        agent=agent,
        algorithm=req.algorithm,
        fixed_green=req.fixed_green,
        num_episodes=req.num_episodes,
    )

    # Save evaluation run to database
    eval_id = f"EVAL_{int(time.time())}"
    save_evaluation(
        evaluation_id=eval_id,
        algorithm=req.algorithm,
        scenario=req.scenario_id,
        baseline_wait=comparison["baseline"]["mean_waiting_time"],
        rl_wait=comparison["rl"]["mean_waiting_time"],
        wait_improvement_pct=comparison["improvements"]["waiting_time_percent"],
        baseline_queue=comparison["baseline"]["mean_queue_length"],
        rl_queue=comparison["rl"]["mean_queue_length"],
        queue_improvement_pct=comparison["improvements"]["queue_length_percent"],
        baseline_throughput=comparison["baseline"]["mean_throughput"],
        rl_throughput=comparison["rl"]["mean_throughput"],
        throughput_improvement_pct=comparison["improvements"]["throughput_percent"],
        details=comparison,
    )

    return comparison

@app.get("/api/evaluations")
def get_evaluations_history():
    return {"evaluations": list_evaluations()}


# -------------------------------------------------------------
# Experiment Management & Export Endpoints
# -------------------------------------------------------------
@app.get("/api/experiments")
def get_experiments():
    return {"experiments": list_experiments()}

@app.get("/api/experiments/export")
def export_experiments_csv():
    experiments = list_experiments()
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "ID", "Experiment ID", "Name", "Algorithm", "Scenario",
        "Episodes", "Seed", "Duration (s)", "Mean Reward",
        "Mean Waiting Time (s)", "Mean Queue Length", "Throughput",
        "Switch Frequency", "Created At"
    ])

    for exp in experiments:
        writer.writerow([
            exp["id"], exp["experiment_id"], exp["name"], exp["algorithm"],
            exp["scenario"], exp["episodes"], exp["seed"], exp["training_duration"],
            exp["mean_reward"], exp["mean_waiting_time"], exp["mean_queue_length"],
            exp["throughput"], exp["switch_frequency"], exp["created_at"]
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=traffic_rl_experiments.csv"}
    )


# -------------------------------------------------------------
# Live Simulation Control Endpoints
# -------------------------------------------------------------
@app.get("/api/simulation/state")
def get_simulation_state():
    return sim_mgr.get_state()

@app.post("/api/simulation/start")
def start_simulation():
    sim_mgr.start()
    return {"status": "started", "state": sim_mgr.get_state()}

@app.post("/api/simulation/pause")
def pause_simulation():
    sim_mgr.pause()
    return {"status": "paused", "state": sim_mgr.get_state()}

@app.post("/api/simulation/step")
def step_simulation(req: SimulationStepRequest):
    state = sim_mgr.step(manual_action=req.action)
    return {"status": "stepped", "state": state}

@app.post("/api/simulation/reset")
def reset_simulation(req: SimulationResetRequest):
    state = sim_mgr.reset(scenario_id=req.scenario_id, seed=req.seed)
    return {"status": "reset", "state": state}

@app.post("/api/simulation/controller")
def set_simulation_controller(controller_type: str = Query(...)):
    sim_mgr.set_controller(controller_type)
    return {"status": "controller_set", "controller": controller_type}

@app.post("/api/simulation/speed")
def set_simulation_speed(speed: float = Query(...)):
    sim_mgr.set_speed(speed)
    return {"status": "speed_set", "speed": speed}


# -------------------------------------------------------------
# TASK 3: Formal MDP & Bellman Analysis Endpoints
# -------------------------------------------------------------
def _get_active_q_agent() -> QLearningAgent:
    """Helper to retrieve trained Q-agent or load latest checkpoint."""
    if training_mgr.agent and isinstance(training_mgr.agent, QLearningAgent):
        return training_mgr.agent
    if sim_mgr.q_agent:
        return sim_mgr.q_agent
    q_path = os.path.join(MODELS_DIR, "q_learning_latest.json")
    agent = QLearningAgent()
    if os.path.exists(q_path):
        try:
            agent.load(q_path)
        except Exception:
            pass
    return agent


@app.get("/api/mdp/definition")
def get_mdp_definition():
    """Returns the complete formal MDP 5-tuple M = (S, A, P, R, gamma) specification."""
    return TrafficMDP.get_definition()


@app.get("/api/mdp/state")
def get_mdp_state():
    """
    Returns current environment state encoded in both:
    1. Discrete 288-state space index with decomposed features.
    2. Continuous 10-dimensional normalized observation vector for DQN.
    """
    env = sim_mgr.env
    disc_state = env.get_discrete_state()
    cont_state = env.get_continuous_state()
    decoded = TrafficMDP.decode_state(disc_state)

    return {
        "discrete_state_index": disc_state,
        "decoded": decoded,
        "continuous_state_vector": [round(float(x), 4) for x in cont_state],
        "feature_labels": [
            "N_queue/15", "S_queue/15", "E_queue/15", "W_queue/15",
            "N_wait/60", "S_wait/60", "E_wait/60", "W_wait/60",
            "active_phase_id", "elapsed_green/60"
        ],
        "queues": env.get_queues(),
        "total_queue": env.get_total_queue(),
        "aggregate_waits": env.get_aggregate_waiting_times(),
        "sim_time": round(env.sim_time, 1),
        "phase_elapsed": round(env.signal_controller.phase_elapsed_time, 1),
        "is_transitioning": env.signal_controller.is_transitioning,
    }


@app.get("/api/mdp/actions")
def get_mdp_actions():
    """Returns available MDP actions, current clearance safety state, and feasibility."""
    env = sim_mgr.env
    elapsed = env.signal_controller.phase_elapsed_time
    is_trans = env.signal_controller.is_transitioning

    can_switch = (not is_trans) and (elapsed >= env.signal_controller.min_green)
    force_switch = (not is_trans) and (elapsed >= env.signal_controller.max_green)

    return {
        "actions": [
            {
                "id": 0,
                "name": "KEEP",
                "description": "Maintain active corridor green signal",
                "is_feasible": not force_switch,
                "cost_penalty": 0.0,
            },
            {
                "id": 1,
                "name": "SWITCH",
                "description": "Request transition to opposing corridor",
                "is_feasible": can_switch,
                "switch_penalty": env.switch_weight,
            }
        ],
        "safety_status": {
            "is_transitioning": is_trans,
            "phase_elapsed": round(elapsed, 1),
            "min_green": env.signal_controller.min_green,
            "max_green": env.signal_controller.max_green,
            "min_green_satisfied": elapsed >= env.signal_controller.min_green,
            "max_green_exceeded": force_switch,
            "active_phase": int(env.signal_controller.current_phase),
            "active_corridor": "North-South" if env.signal_controller.current_green_phase_id == 0 else "East-West",
        }
    }


@app.get("/api/mdp/policy")
def get_mdp_policy(state: Optional[int] = Query(default=None), epsilon: float = Query(default=0.0)):
    """
    Returns policy distribution pi(a|s) and Q-values for a specific state or current simulation state.
    Demonstrates greedy policy argmax_a Q(s,a) and epsilon-greedy exploration.
    """
    agent = _get_active_q_agent()
    env = sim_mgr.env
    target_state = state if state is not None else env.get_discrete_state()
    target_state = max(0, min(TrafficMDP.TOTAL_STATES - 1, target_state))

    q_keep = float(agent.q_table[target_state, 0])
    q_switch = float(agent.q_table[target_state, 1])

    # Argmax greedy
    best_action = 1 if q_switch > q_keep else 0
    greedy_diff = abs(q_keep - q_switch)

    # Epsilon-greedy probabilities
    eps = max(0.0, min(1.0, epsilon))
    prob_best = (1.0 - eps) + (eps / 2.0)
    prob_other = eps / 2.0
    action_probs = {
        0: prob_best if best_action == 0 else prob_other,
        1: prob_best if best_action == 1 else prob_other,
    }

    decoded = TrafficMDP.decode_state(target_state)

    reason = (
        f"Greedy Policy \u03c0(s) = argmax_a Q(s,a) selects {'SWITCH' if best_action == 1 else 'KEEP'} "
        f"with value {max(q_keep, q_switch):.3f} vs {min(q_keep, q_switch):.3f} (margin: {greedy_diff:.3f}). "
        f"Based on: {decoded['readable']['phase']}, {decoded['readable']['ns_queue']} NS, "
        f"{decoded['readable']['ew_queue']} EW, {decoded['readable']['green_time']} maturity, "
        f"{decoded['readable']['wait_urgency']}."
    )

    return {
        "state_index": target_state,
        "decoded_state": decoded,
        "q_values": {
            "keep": round(q_keep, 4),
            "switch": round(q_switch, 4),
        },
        "state_value_v": round(max(q_keep, q_switch), 4),
        "greedy_action": best_action,
        "greedy_action_name": "SWITCH" if best_action == 1 else "KEEP",
        "epsilon": eps,
        "action_probabilities": {
            "keep": round(action_probs[0], 4),
            "switch": round(action_probs[1], 4),
        },
        "explanation": reason,
        "agent_trained_steps": agent.training_steps,
    }


@app.get("/api/mdp/value")
def get_mdp_values(phase: Optional[int] = Query(default=None), limit: int = Query(default=60)):
    """
    Returns action values Q(s,a) and derived state value function V(s) = max_a Q(s,a)
    across states in the MDP state space.
    """
    agent = _get_active_q_agent()
    results = []

    for s_idx in range(TrafficMDP.TOTAL_STATES):
        decoded = TrafficMDP.decode_state(s_idx)
        if phase is not None and decoded["components"]["phase"] != phase:
            continue

        q0 = float(agent.q_table[s_idx, 0])
        q1 = float(agent.q_table[s_idx, 1])
        v_s = max(q0, q1)
        best_a = 0 if q0 >= q1 else 1

        results.append({
            "state_index": s_idx,
            "v_value": round(v_s, 4),
            "q_keep": round(q0, 4),
            "q_switch": round(q1, 4),
            "optimal_action": best_a,
            "optimal_action_name": "SWITCH" if best_a == 1 else "KEEP",
            "components": decoded["components"],
            "readable": decoded["readable"],
        })

    # Sort by absolute magnitude of state value
    results.sort(key=lambda x: abs(x["v_value"]), reverse=True)
    return {
        "total_states": TrafficMDP.TOTAL_STATES,
        "filtered_count": len(results),
        "states": results[:limit],
    }


@app.post("/api/mdp/bellman/calculate")
def calculate_bellman(req: BellmanCalculateRequest):
    """
    Interactive Bellman Equation Simulator.
    Computes TD Target, TD Error, and updated Q-value with complete step-by-step arithmetic.
    """
    result = TrafficMDP.calculate_bellman_update(
        q_current=req.q_current,
        alpha=req.alpha,
        reward=req.reward,
        gamma=req.gamma,
        next_max_q=req.next_max_q,
    )
    return result


@app.post("/api/mdp/reward/calculate")
def calculate_reward(req: RewardCalculateRequest):
    """
    Interactive Reward Function Calculator.
    Uses actual backend weights and exact formulation:
    R = -[w_q*(Q/10) + w_w*(dW/10) + w_s*I(switch)] + w_th*D
    """
    env = sim_mgr.env
    qw = req.queue_weight if req.queue_weight is not None else env.queue_weight
    ww = req.waiting_weight if req.waiting_weight is not None else env.waiting_weight
    sw = req.switch_weight if req.switch_weight is not None else env.switch_weight
    tw = req.throughput_weight if req.throughput_weight is not None else env.throughput_weight

    result = TrafficMDP.calculate_reward(
        total_queue=req.total_queue,
        incremental_wait=req.incremental_wait,
        switch_triggered=req.switch_triggered,
        departures=req.departures,
        queue_weight=qw,
        waiting_weight=ww,
        switch_weight=sw,
        throughput_weight=tw,
    )
    return result


@app.get("/api/mdp/transitions")
def get_mdp_transitions(limit: int = Query(default=30)):
    """
    Empirical state transition probabilities P(s' | s, a) observed during simulation.
    Demonstrates state transition dynamics without inventing fake numbers.
    """
    return sim_mgr.get_transition_summary(limit=limit)


@app.get("/api/mdp/decision-history")
def get_decision_history(limit: int = Query(default=30)):
    """
    Sequential decision-making history log.
    Includes state observation, action choice, immediate reward, Q-values, and justification.
    """
    return {"history": sim_mgr.get_decision_history(limit=limit)}



# -------------------------------------------------------------
# Live WebSocket for Real-time Simulation Updates
# -------------------------------------------------------------
@app.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Check for incoming client messages (e.g. action or ping)
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=0.01)
                cmd = data.get("command")
                if cmd == "start":
                    sim_mgr.start()
                elif cmd == "pause":
                    sim_mgr.pause()
                elif cmd == "step":
                    action = data.get("action", 0)
                    sim_mgr.step(manual_action=action)
                elif cmd == "reset":
                    sim_mgr.reset(scenario_id=data.get("scenario_id"))
                elif cmd == "controller":
                    sim_mgr.set_controller(data.get("controller_type", "baseline"))
                elif cmd == "speed":
                    sim_mgr.set_speed(float(data.get("speed", 1.0)))
            except asyncio.TimeoutError:
                pass

            # Broadcast current simulation state
            state = sim_mgr.get_state()
            await websocket.send_json(state)
            await asyncio.sleep(0.1)  # 10 Hz broadcast
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
