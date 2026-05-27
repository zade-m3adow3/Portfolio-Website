import os
import numpy as np
import matplotlib.pyplot as plt

# Ensure output directory exists relative to script
out_dir = os.path.join(os.path.dirname(__file__), '../outputs')
os.makedirs(out_dir, exist_ok=True)

# Theme settings
BG_COLOR = '#05050c'
TEXT_COLOR = '#e8e8f0'
AXIS_COLOR = '#6b7280'
LINE_COLOR = '#00c8ff'
TRIGGER_COLOR = '#ff3864'

plt.rcParams.update({
    'figure.facecolor': BG_COLOR,
    'axes.facecolor': BG_COLOR,
    'axes.edgecolor': AXIS_COLOR,
    'axes.labelcolor': TEXT_COLOR,
    'text.color': TEXT_COLOR,
    'xtick.color': AXIS_COLOR,
    'ytick.color': AXIS_COLOR,
    'font.family': 'monospace'
})

T = 1000
k = 3
d = 10
delta_min = 0.05
eigengaps = []
gim_triggers = []

C = np.diag([5.0, 3.0, 2.0, 0.8, 0.5, 0.3, 0.2, 0.1, 0.05, 0.01])

np.random.seed(42)

for t in range(T):
    noise = np.random.normal(0, 0.01, d)
    if 480 < t < 600:  # adversarial injection window
        noise[k-1] += 0.08 * (t - 480) / 120  # compress eigengap
    
    eigs = sorted(np.diag(C) + noise, reverse=True)
    delta_k = eigs[k-1] - eigs[k]
    eigengaps.append(delta_k)
    gim_triggers.append(1 if delta_k <= delta_min else 0)

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(range(T), eigengaps, color=LINE_COLOR, label=r'Eigengap $\delta_k$', linewidth=1.5)

# Highlight GIM triggers
trigger_indices = np.where(np.array(gim_triggers) == 1)[0]
if len(trigger_indices) > 0:
    ax.scatter(trigger_indices, np.array(eigengaps)[trigger_indices], color=TRIGGER_COLOR, label='GIM Trigger (Rollback)', s=15, zorder=5)
    ax.axvspan(480, 600, color='#7f5af0', alpha=0.15, label='Adversarial Window')

ax.axhline(y=delta_min, color=TRIGGER_COLOR, linestyle='--', alpha=0.5, label=r'$\delta_{min}$ Floor')

ax.set_title('Adversarial Eigengap Collapse & GIM Trigger', color=TEXT_COLOR, pad=15)
ax.set_xlabel('Epoch ($t$)')
ax.set_ylabel('Eigengap Value')
ax.grid(True, color=AXIS_COLOR, alpha=0.2)
ax.legend(facecolor='#0d0d1a', edgecolor=AXIS_COLOR, loc='upper right')

plt.tight_layout()
plt.savefig(os.path.join(out_dir, 'sim04_gim_trigger.svg'), format='svg', facecolor=BG_COLOR)
plt.close()
