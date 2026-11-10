export interface Vehicle {
  id: number;
  approach: 'N' | 'S' | 'E' | 'W';
  lane: number;
  position: number;
  speed: number;
  waiting_time: number;
  is_queued: boolean;
  has_departed: boolean;
  color: string;
  length: number;
}

export interface SimulationState {
  sim_time: number;
  current_phase: number;
  phase_name: string;
  phase_elapsed: number;
  is_transitioning: boolean;
  signals: Record<'N' | 'S' | 'E' | 'W', 'GREEN' | 'YELLOW' | 'RED'>;
  queues: Record<'N' | 'S' | 'E' | 'W', number>;
  total_queue: number;
  aggregate_waits: Record<'N' | 'S' | 'E' | 'W', number>;
  vehicles: Vehicle[];
  completed_count: number;
  switch_count: number;
  cumulative_reward: number;
  controller_type?: string;
  is_running?: boolean;
  speed_multiplier?: number;
  geometry: {
    stop_line_pos: number;
    intersection_length: number;
    road_end_pos: number;
  };
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  base_rates: Record<string, number>;
}

export interface AlgorithmInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  state_type: string;
  action_type: string;
}

export interface TrainingStatus {
  is_training: boolean;
  is_paused: boolean;
  current_episode: number;
  total_episodes: number;
  progress_percent: number;
  algorithm: string;
  scenario: string;
  status_message: string;
  elapsed_seconds: number;
  current_epsilon: number;
  history_length: number;
  latest_metric?: {
    episode: number;
    total_reward: number;
    mean_waiting_time: number;
    mean_queue_length: number;
    total_departures: number;
    total_switches: number;
    epsilon: number;
  };
}

export interface TrainingMetric {
  episode: number;
  total_reward: number;
  mean_waiting_time: number;
  mean_queue_length: number;
  max_queue_length: number;
  total_departures: number;
  total_switches: number;
  epsilon: number;
}

export interface Experiment {
  id: number;
  experiment_id: string;
  name: string;
  algorithm: string;
  scenario: string;
  episodes: number;
  seed: number;
  hyperparameters: Record<string, any>;
  training_duration: number;
  mean_reward: number;
  mean_waiting_time: number;
  mean_queue_length: number;
  throughput: number;
  switch_frequency: number;
  checkpoint_path: string;
  created_at: string;
}

export interface EvaluationComparison {
  scenario: string;
  baseline: {
    controller: string;
    mean_waiting_time: number;
    std_waiting_time: number;
    mean_queue_length: number;
    std_queue_length: number;
    max_queue_length: number;
    mean_throughput: number;
    std_throughput: number;
    mean_switches: number;
    mean_reward: number;
    episodes: any[];
  };
  rl: {
    controller: string;
    mean_waiting_time: number;
    std_waiting_time: number;
    mean_queue_length: number;
    std_queue_length: number;
    max_queue_length: number;
    mean_throughput: number;
    std_throughput: number;
    mean_switches: number;
    mean_reward: number;
    episodes: any[];
  };
  improvements: {
    waiting_time_percent: number;
    queue_length_percent: number;
    max_queue_percent: number;
    throughput_percent: number;
  };
  verdict: string;
}

export interface QTableSummary {
  total_states: number;
  non_zero_states: number;
  mean_q_val: number;
  max_q_val: number;
  min_q_val: number;
  entries: Array<{
    state_id: number;
    phase: string;
    ns_queue: string;
    ew_queue: string;
    green_time: string;
    wait_ratio: string;
    q_keep: number;
    q_switch: number;
    optimal_action: string;
    advantage: number;
  }>;
}

export interface AppConfig {
  timing: {
    min_green: number;
    max_green: number;
    yellow_duration: number;
    all_red_duration: number;
  };
  rewards: {
    queue_weight: number;
    waiting_weight: number;
    switch_weight: number;
    throughput_weight: number;
  };
  geometry: {
    road_length: number;
    intersection_length: number;
    departure_length: number;
  };
}

// -------------------------------------------------------------
// Task 3: MDP & Bellman Interfaces
// -------------------------------------------------------------
export interface MdpDefinition {
  title: string;
  tuple: string;
  agent: {
    name: string;
    role: string;
    objective: string;
    constraints: string;
  };
  environment: {
    name: string;
    approaches: Array<{
      id: string;
      name: string;
      lanes: number;
      length_m: number;
      corridor: string;
    }>;
    physics: string;
    time_step_dt: number;
  };
  state_space: {
    tabular_discrete: {
      cardinality: number;
      formula: string;
      encoding_equation: string;
      dimensions: Array<{
        name: string;
        symbol: string;
        cardinality: number;
        bins: Array<any>;
      }>;
    };
    deep_continuous: {
      dimensionality: number;
      description: string;
      vector: string[];
    };
  };
  action_space: {
    cardinality: number;
    actions: Array<{
      action_id: number;
      name: string;
      symbol: string;
      description: string;
      switch_penalty_applied: boolean;
    }>;
    safety_controller_overrides: string[];
  };
  transition_probability: {
    symbol: string;
    description: string;
    markov_property: string;
  };
  reward_function: {
    equation: string;
    default_weights: Record<string, number>;
    components: Array<{
      name: string;
      term: string;
      purpose: string;
    }>;
  };
  returns: {
    symbol: string;
    equation: string;
    discount_factor: {
      symbol: string;
      default: number;
      range: string;
      interpretation: string;
    };
  };
  episodes: {
    definition: string;
    termination_condition: string;
    metrics_tracked: string[];
  };
  goals: string[];
}

export interface MdpState {
  discrete_state_index: number;
  decoded: {
    state_index: number;
    components: {
      phase: number;
      ns_q_bin: number;
      ew_q_bin: number;
      green_time_bin: number;
      wait_urgency_bin: number;
    };
    readable: {
      phase: string;
      active_corridor: string;
      opposing_corridor: string;
      ns_queue: string;
      ew_queue: string;
      green_time: string;
      wait_urgency: string;
    };
  };
  continuous_state_vector: number[];
  feature_labels: string[];
  queues: Record<string, number>;
  total_queue: number;
  aggregate_waits: Record<string, number>;
  sim_time: number;
  phase_elapsed: number;
  is_transitioning: boolean;
}

export interface MdpActions {
  actions: Array<{
    id: number;
    name: string;
    description: string;
    is_feasible: boolean;
    cost_penalty?: number;
    switch_penalty?: number;
  }>;
  safety_status: {
    is_transitioning: boolean;
    phase_elapsed: number;
    min_green: number;
    max_green: number;
    min_green_satisfied: boolean;
    max_green_exceeded: boolean;
    active_phase: number;
    active_corridor: string;
  };
}

export interface MdpPolicy {
  state_index: number;
  decoded_state: any;
  q_values: {
    keep: number;
    switch: number;
  };
  state_value_v: number;
  greedy_action: number;
  greedy_action_name: string;
  epsilon: number;
  action_probabilities: {
    keep: number;
    switch: number;
  };
  explanation: string;
  agent_trained_steps: number;
}

export interface MdpStateValueItem {
  state_index: number;
  v_value: number;
  q_keep: number;
  q_switch: number;
  optimal_action: number;
  optimal_action_name: string;
  components: {
    phase: number;
    ns_q_bin: number;
    ew_q_bin: number;
    green_time_bin: number;
    wait_urgency_bin: number;
  };
  readable: {
    phase: string;
    active_corridor: string;
    opposing_corridor: string;
    ns_queue: string;
    ew_queue: string;
    green_time: string;
    wait_urgency: string;
  };
}

export interface BellmanResult {
  q_current: number;
  alpha: number;
  reward: number;
  gamma: number;
  next_max_q: number;
  discounted_future: number;
  td_target: number;
  td_error: number;
  adjustment: number;
  updated_q: number;
  steps: string[];
  mathematical_notation: string;
}

export interface RewardResult {
  total_reward: number;
  breakdown: {
    queue_penalty: number;
    waiting_penalty: number;
    switch_penalty: number;
    throughput_bonus: number;
    total_cost: number;
  };
  inputs: {
    total_queue: number;
    incremental_wait: number;
    switch_triggered: boolean;
    departures: number;
  };
  weights: {
    queue_weight: number;
    waiting_weight: number;
    switch_weight: number;
    throughput_weight: number;
  };
  equation: string;
}

export interface DecisionRecord {
  decision_id: number;
  sim_time: number;
  discrete_state: number;
  decoded_state: any;
  continuous_state: number[];
  action: number;
  action_name: string;
  q_values: {
    keep: number;
    switch: number;
  };
  reward: number;
  next_discrete_state: number;
  next_decoded_state: any;
  reason: string;
  safety_override: string | null;
  departures: number;
  total_queue: number;
  active_corridor: string;
  current_phase: number;
}

export interface TransitionSummary {
  total_unique_state_actions: number;
  sample_transitions: Array<{
    state: number;
    action: number;
    action_name: string;
    decoded_state: any;
    total_samples: number;
    next_state_distribution: Array<{
      next_state: number;
      count: number;
      probability: number;
      decoded: any;
    }>;
  }>;
}

