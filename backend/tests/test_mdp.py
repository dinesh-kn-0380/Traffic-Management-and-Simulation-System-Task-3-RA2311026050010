"""
Unit and integration tests for Task 3 MDP formulation, Bellman simulator,
and policy/value endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.simulation.mdp import TrafficMDP

client = TestClient(app)

def test_mdp_definition_endpoint():
    """Verify MDP 5-tuple structure, agent, environment, state/action spaces, reward, returns, and episodes."""
    response = client.get("/api/mdp/definition")
    assert response.status_code == 200
    data = response.json()

    assert "tuple" in data
    assert "agent" in data
    assert "environment" in data
    assert "state_space" in data
    assert "action_space" in data
    assert "transition_probability" in data
    assert "reward_function" in data
    assert "returns" in data
    assert "episodes" in data
    assert "goals" in data

    # Check 288 states
    assert data["state_space"]["tabular_discrete"]["cardinality"] == 288
    # Check 10-D DQN vector
    assert data["state_space"]["deep_continuous"]["dimensionality"] == 10
    # Check 2 actions
    assert data["action_space"]["cardinality"] == 2
    assert len(data["action_space"]["actions"]) == 2

def test_mdp_state_encoding_and_decoding():
    """Test full bijective mapping for the 288-state space."""
    # Test boundary conditions
    min_idx = TrafficMDP.encode_state(0, 0, 0, 0, 0)
    assert min_idx == 0
    max_idx = TrafficMDP.encode_state(1, 3, 3, 2, 2)
    assert max_idx == 287

    # Round trip test for all 288 states
    for idx in range(288):
        decoded = TrafficMDP.decode_state(idx)
        comp = decoded["components"]
        re_encoded = TrafficMDP.encode_state(
            phase=comp["phase"],
            ns_q_bin=comp["ns_q_bin"],
            ew_q_bin=comp["ew_q_bin"],
            gt_bin=comp["green_time_bin"],
            wait_bin=comp["wait_urgency_bin"],
        )
        assert re_encoded == idx

def test_mdp_reward_calculation_exact():
    """Verify reward calculation with exact weights."""
    # R = -[0.5*(10/10) + 0.5*(20/10) + 1.0*(1)] + 2.0*3
    # = -[0.5*1.0 + 0.5*2.0 + 1.0] + 6.0 = -[0.5 + 1.0 + 1.0] + 6.0 = -2.5 + 6.0 = 3.5
    res = TrafficMDP.calculate_reward(
        total_queue=10.0,
        incremental_wait=20.0,
        switch_triggered=True,
        departures=3,
        queue_weight=0.5,
        waiting_weight=0.5,
        switch_weight=1.0,
        throughput_weight=2.0,
    )
    assert res["total_reward"] == 3.5
    assert res["breakdown"]["queue_penalty"] == 0.5
    assert res["breakdown"]["waiting_penalty"] == 1.0
    assert res["breakdown"]["switch_penalty"] == 1.0
    assert res["breakdown"]["throughput_bonus"] == 6.0

def test_bellman_numerical_example():
    """
    Verify the master prompt's exact numerical requirement:
    Current Q(s,a) = 5
    Learning rate alpha = 0.1
    Immediate reward r = 2
    Discount factor gamma = 0.9
    Maximum next-state Q-value = 8
    TD Target = 2 + (0.9 * 8) = 9.2
    Updated Q-value = 5 + 0.1(9.2 - 5) = 5.42
    """
    res = TrafficMDP.calculate_bellman_update(
        q_current=5.0,
        alpha=0.1,
        reward=2.0,
        gamma=0.9,
        next_max_q=8.0,
    )
    assert res["td_target"] == 9.2
    assert res["td_error"] == 4.2
    assert res["adjustment"] == 0.42
    assert res["updated_q"] == 5.42
    assert len(res["steps"]) == 5

def test_api_bellman_calculate():
    """Test POST /api/mdp/bellman/calculate."""
    payload = {
        "q_current": 5.0,
        "alpha": 0.1,
        "reward": 2.0,
        "gamma": 0.9,
        "next_max_q": 8.0,
    }
    response = client.post("/api/mdp/bellman/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["td_target"] == 9.2
    assert data["updated_q"] == 5.42

def test_api_reward_calculate():
    """Test POST /api/mdp/reward/calculate."""
    payload = {
        "total_queue": 8.0,
        "incremental_wait": 12.0,
        "switch_triggered": False,
        "departures": 1,
    }
    response = client.post("/api/mdp/reward/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "total_reward" in data
    assert "breakdown" in data

def test_api_mdp_state_and_actions():
    """Test GET /api/mdp/state and GET /api/mdp/actions."""
    state_res = client.get("/api/mdp/state")
    assert state_res.status_code == 200
    s_data = state_res.json()
    assert "discrete_state_index" in s_data
    assert 0 <= s_data["discrete_state_index"] < 288
    assert len(s_data["continuous_state_vector"]) == 10

    act_res = client.get("/api/mdp/actions")
    assert act_res.status_code == 200
    a_data = act_res.json()
    assert len(a_data["actions"]) == 2
    assert "safety_status" in a_data

def test_api_mdp_policy_and_values():
    """Test GET /api/mdp/policy and GET /api/mdp/value."""
    pol_res = client.get("/api/mdp/policy?state=42&epsilon=0.1")
    assert pol_res.status_code == 200
    p_data = pol_res.json()
    assert "q_values" in p_data
    assert "greedy_action" in p_data
    assert "action_probabilities" in p_data
    assert p_data["state_index"] == 42

    val_res = client.get("/api/mdp/value?limit=10")
    assert val_res.status_code == 200
    v_data = val_res.json()
    assert v_data["total_states"] == 288
    assert len(v_data["states"]) <= 10

def test_live_simulation_decision_history():
    """Step simulation and verify decision history and transition logging."""
    client.post("/api/simulation/reset", json={"scenario_id": "balanced"})
    step_res = client.post("/api/simulation/step", json={"action": 0, "controller_type": "baseline"})
    assert step_res.status_code == 200

    hist_res = client.get("/api/mdp/decision-history?limit=10")
    assert hist_res.status_code == 200
    h_data = hist_res.json()
    assert len(h_data["history"]) >= 1

    trans_res = client.get("/api/mdp/transitions?limit=10")
    assert trans_res.status_code == 200
    t_data = trans_res.json()
    assert "sample_transitions" in t_data

