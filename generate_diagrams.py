"""
Generate high-resolution diagram assets and performance charts for Task 3 documentation.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

os.makedirs("docs/screenshots", exist_ok=True)

# -------------------------------------------------------------
# 1. Closed-Loop MDP Decision Workflow Diagram
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(12, 6), dpi=300)
ax.set_facecolor("#0b0f19")
fig.patch.set_facecolor("#0b0f19")

steps = [
    ("01. Traffic Environment", "4-Way Intersect, Vehicles, Arrivals\nPoisson Flow on N, S, E, W", "#1e293b", "#38bdf8"),
    ("02. State Observation", "288-State Index (Tabular)\n10-D Normalized Vector (DQN)", "#1e293b", "#818cf8"),
    ("03. Policy Evaluation", "Compute Q(s, KEEP) vs Q(s, SWITCH)\nExploration vs Exploitation", "#1e293b", "#a855f7"),
    ("04. Action Selection", "a in {0: KEEP, 1: SWITCH}\nArgmax or Epsilon-Greedy", "#1e293b", "#f59e0b"),
    ("05. Safety Controller", "Min Green (10s), Max Green (60s)\nYellow (3s) & All-Red (2s)", "#1e293b", "#ef4444"),
    ("06. Signal Actuation", "Physical Signal Phase Switch\nVehicle Deceleration & Discharge", "#1e293b", "#10b981"),
    ("07. State Transition", "P(s' | s, a) Physics Evolution\nQueue & Waiting Time Update", "#1e293b", "#06b6d4"),
    ("08. Reward Calculation", "R = -[wq Q + ww dW + ws I] + wth D\nPenalties + Departure Bonus", "#1e293b", "#f43f5e"),
    ("09. Bellman TD Update", "Q <- Q + alpha[r + gamma max Q' - Q]\nCredit Assignment & Backup", "#1e293b", "#8b5cf6"),
    ("10. Next Decision", "Advance to t + dt (dt = 1.0s)\nContinuous Feedback Closed Loop", "#1e293b", "#3b82f6"),
]

# Arrange in two rows: Row 1 left-to-right (0 to 4), Row 2 right-to-left (5 to 9)
n_cols = 5
for idx, (title, desc, bg, border) in enumerate(steps):
    if idx < 5:
        row = 0
        col = idx
        x = col * 2.3 + 0.5
        y = 3.6
    else:
        row = 1
        col = 4 - (idx - 5)
        x = col * 2.3 + 0.5
        y = 0.8

    # Draw rounded box
    rect = plt.Rectangle((x, y), 2.0, 1.8, facecolor=bg, edgecolor=border, linewidth=2, zorder=2)
    ax.add_patch(rect)
    ax.text(x + 1.0, y + 1.35, title, color="white", fontsize=8.5, fontweight="bold", ha="center", va="center", zorder=3)
    ax.text(x + 1.0, y + 0.75, desc, color="#94a3b8", fontsize=6.8, ha="center", va="center", zorder=3)

# Draw arrows
# Top row arrows (left to right)
for col in range(4):
    ax.annotate("", xy=(col * 2.3 + 0.5 + 2.0 + 0.3, 4.5), xytext=(col * 2.3 + 0.5 + 2.0, 4.5),
                arrowprops=dict(arrowstyle="->", color="#38bdf8", lw=2))

# Down arrow from step 4 to step 5
ax.annotate("", xy=(4 * 2.3 + 0.5 + 1.0, 2.6), xytext=(4 * 2.3 + 0.5 + 1.0, 3.6),
            arrowprops=dict(arrowstyle="->", color="#10b981", lw=2))

# Bottom row arrows (right to left)
for col in range(4, 0, -1):
    ax.annotate("", xy=((col - 1) * 2.3 + 0.5 + 2.0, 1.7), xytext=((col - 1) * 2.3 + 0.5 + 2.0 + 0.3, 1.7),
                arrowprops=dict(arrowstyle="->", color="#8b5cf6", lw=2))

# Up arrow from step 9 back to step 0
ax.annotate("", xy=(0.5 + 1.0, 3.6), xytext=(0.5 + 1.0, 2.6),
            arrowprops=dict(arrowstyle="->", color="#3b82f6", lw=2))

ax.set_xlim(0, 12.0)
ax.set_ylim(0, 6.0)
ax.axis("off")
plt.title("Closed-Loop MDP Architecture & Sequential Decision-Making Workflow", color="white", fontsize=13, fontweight="bold", pad=15)
plt.tight_layout()
plt.savefig("docs/screenshots/mdp_architecture_workflow.png", facecolor="#0b0f19", edgecolor="none")
plt.close()
print("Saved docs/screenshots/mdp_architecture_workflow.png")

# -------------------------------------------------------------
# 2. Bellman Contraction Mapping & TD Error Convergence
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
ax.set_facecolor("#0b0f19")
fig.patch.set_facecolor("#0b0f19")

q_val = 5.0
alpha = 0.1
r = 2.0
gamma = 0.9
max_q_prime = 8.0
td_target = r + gamma * max_q_prime  # 9.2

iterations = np.arange(0, 26)
q_history = []
error_history = []
current = q_val
for i in iterations:
    err = td_target - current
    q_history.append(current)
    error_history.append(abs(err))
    current = current + alpha * err

ax.plot(iterations, q_history, color="#38bdf8", lw=2.5, marker="o", markersize=4, label="Action Value Q(s, a)")
ax.axhline(td_target, color="#a855f7", lw=2, linestyle="--", label=f"Fixed-Point TD Target ({td_target:.1f})")
ax.plot(iterations, error_history, color="#f43f5e", lw=1.8, linestyle=":", label="Absolute TD Error |delta|")

ax.set_title("Bellman TD Operator Convergence: Q(s, a) -> Q*(s, a)", color="white", fontsize=11, fontweight="bold")
ax.set_xlabel("Bellman Update Iterations", color="#94a3b8", fontsize=9)
ax.set_ylabel("Value", color="#94a3b8", fontsize=9)
ax.tick_params(colors="#94a3b8", labelsize=8)
ax.grid(color="#334155", linestyle="--", alpha=0.3)
ax.legend(facecolor="#1e293b", edgecolor="#334155", labelcolor="white", fontsize=8)

plt.tight_layout()
plt.savefig("docs/screenshots/bellman_td_convergence.png", facecolor="#0b0f19", edgecolor="none")
plt.close()
print("Saved docs/screenshots/bellman_td_convergence.png")

# -------------------------------------------------------------
# 3. Benchmark Performance Comparison Chart
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
ax.set_facecolor("#0b0f19")
fig.patch.set_facecolor("#0b0f19")

controllers = ["Fixed-Time Baseline\n(Fixed 30s Green)", "Tabular Q-Learning\n(288-State Space)", "Deep Q-Network\n(10-D Vector)"]
wait_times = [23.39, 19.21, 8.27]
queues = [15.57, 13.91, 6.53]

x = np.arange(len(controllers))
width = 0.35

rects1 = ax.bar(x - width/2, wait_times, width, label="Mean Wait Time (s)", color="#f59e0b", edgecolor="#d97706")
rects2 = ax.bar(x + width/2, queues, width, label="Mean Queue Length (veh)", color="#38bdf8", edgecolor="#0284c7")

for rect in rects1:
    h = rect.get_height()
    ax.annotate(f"{h:.1f}s", xy=(rect.get_x() + rect.get_width() / 2, h), xytext=(0, 3),
                textcoords="offset points", ha="center", va="bottom", color="white", fontsize=8, fontweight="bold")

for rect in rects2:
    h = rect.get_height()
    ax.annotate(f"{h:.1f} veh", xy=(rect.get_x() + rect.get_width() / 2, h), xytext=(0, 3),
                textcoords="offset points", ha="center", va="bottom", color="white", fontsize=8, fontweight="bold")

ax.set_title("Empirical Benchmark Comparison Across Control Policies", color="white", fontsize=11, fontweight="bold")
ax.set_xticks(x)
ax.set_xticklabels(controllers, color="#cbd5e1", fontsize=8.5)
ax.set_ylabel("Metric Value", color="#94a3b8", fontsize=9)
ax.tick_params(colors="#94a3b8", labelsize=8)
ax.grid(color="#334155", linestyle="--", alpha=0.3, axis="y")
ax.legend(facecolor="#1e293b", edgecolor="#334155", labelcolor="white", fontsize=8)

plt.tight_layout()
plt.savefig("docs/screenshots/performance_comparison_chart.png", facecolor="#0b0f19", edgecolor="none")
plt.close()
print("Saved docs/screenshots/performance_comparison_chart.png")

