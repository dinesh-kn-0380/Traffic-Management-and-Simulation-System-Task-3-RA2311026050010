"""
Pydantic schemas for request validation and response models.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TrainRequest(BaseModel):
    algorithm: str = Field(default="q_learning", description="Algorithm: 'q_learning' or 'dqn'")
    episodes: int = Field(default=50, ge=1, le=500, description="Total training episodes")
    episode_duration: float = Field(default=200.0, ge=50.0, le=1000.0, description="Seconds per episode")
    scenario_id: str = Field(default="balanced", description="Scenario identifier")
    alpha: float = Field(default=0.1, gt=0.0, le=1.0, description="Learning rate")
    gamma: float = Field(default=0.95, ge=0.0, le=1.0, description="Discount factor")
    epsilon: float = Field(default=1.0, ge=0.0, le=1.0, description="Initial exploration rate")
    epsilon_min: float = Field(default=0.05, ge=0.0, le=1.0, description="Minimum exploration rate")
    epsilon_decay: float = Field(default=0.992, ge=0.8, le=1.0, description="Epsilon decay rate")
    seed: int = Field(default=42, description="Random seed")

class EvaluateRequest(BaseModel):
    algorithm: str = Field(default="q_learning", description="'q_learning' or 'dqn'")
    scenario_id: str = Field(default="balanced", description="Evaluation traffic scenario")
    fixed_green: float = Field(default=30.0, ge=10.0, le=120.0, description="Baseline fixed green duration")
    num_episodes: int = Field(default=3, ge=1, le=20, description="Number of evaluation episodes")
    model_path: Optional[str] = Field(default=None, description="Path or name of saved model")

class SimulationConfigUpdate(BaseModel):
    min_green: Optional[float] = Field(default=None, ge=5.0, le=30.0)
    max_green: Optional[float] = Field(default=None, ge=20.0, le=120.0)
    yellow_duration: Optional[float] = Field(default=None, ge=1.0, le=10.0)
    all_red_duration: Optional[float] = Field(default=None, ge=0.5, le=8.0)
    queue_weight: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    waiting_weight: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    switch_weight: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    throughput_weight: Optional[float] = Field(default=None, ge=0.0, le=10.0)

class SimulationResetRequest(BaseModel):
    scenario_id: str = Field(default="balanced")
    seed: Optional[int] = Field(default=None)

class SimulationStepRequest(BaseModel):
    action: int = Field(default=0, ge=0, le=1, description="0=KEEP, 1=SWITCH")
    controller_type: str = Field(default="manual", description="'manual', 'baseline', 'q_learning', 'dqn'")

class BellmanCalculateRequest(BaseModel):
    q_current: float = Field(default=5.0, description="Current Q(s,a) value")
    alpha: float = Field(default=0.1, gt=0.0, le=1.0, description="Learning rate alpha")
    reward: float = Field(default=2.0, description="Immediate reward r")
    gamma: float = Field(default=0.9, ge=0.0, le=1.0, description="Discount factor gamma")
    next_max_q: float = Field(default=8.0, description="Maximum next-state Q-value max_a' Q(s',a')")

class RewardCalculateRequest(BaseModel):
    total_queue: float = Field(default=10.0, ge=0.0, description="Total queued vehicles across all approaches")
    incremental_wait: float = Field(default=15.0, ge=0.0, description="Incremental waiting time accumulated in step (s)")
    switch_triggered: bool = Field(default=False, description="Whether signal phase switch was triggered")
    departures: int = Field(default=2, ge=0, description="Number of vehicles departing through intersection")
    queue_weight: Optional[float] = Field(default=None, description="Custom weight w_q (defaults to env setting)")
    waiting_weight: Optional[float] = Field(default=None, description="Custom weight w_w (defaults to env setting)")
    switch_weight: Optional[float] = Field(default=None, description="Custom weight w_s (defaults to env setting)")
    throughput_weight: Optional[float] = Field(default=None, description="Custom weight w_th (defaults to env setting)")

