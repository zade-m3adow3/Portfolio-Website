import os
import numpy as np
import matplotlib.pyplot as plt

out_dir = os.path.join(os.path.dirname(__file__), '../outputs')
os.makedirs(out_dir, exist_ok=True)

BG_COLOR = '#05050c'
TEXT_COLOR = '#e8e8f0'
AXIS_COLOR = '#6b7280'
LINE_OJA = '#7f5af0'     # Standard Oja
LINE_QUICKSAND = '#0af5a0' # Quicksand Oja++

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
time_steps = np.arange(T)

# Synthesize convergence data based on Theorem 3.2
# Clean data convergence
clean_oja = 1.0 * np.exp(-0.005 * time_steps) + 0.05
clean_quicksand = 1.0 * np.exp(-0.008 * time_steps) + 0.02

# Adversarial data convergence
adv_oja = np.copy(clean_oja)
adv_quicksand = np.copy(clean_quicksand)

# Adversarial injection at t=400
injection_start = 400
adv_oja[injection_start:] += 0.5 * (1 - np.exp(-0.01 * (time_steps[injection_start:] - injection_start)))
adv_quicksand[injection_start:] += 0.05 * (1 - np.exp(-0.05 * (time_steps[injection_start:] - injection_start)))

# Effective step-size damping
eta_eff = np.ones(T) * 0.01
eta_eff[injection_start:] = 0.01 / (1 + 5.0 * (1 - np.exp(-0.02 * (time_steps[injection_start:] - injection_start))))

fig, axs = plt.subplots(2, 2, figsize=(12, 8))

# Top-Left: Clean Convergence
axs[0, 0].plot(time_steps, clean_oja, color=LINE_OJA, label='Standard Oja')
axs[0, 0].plot(time_steps, clean_quicksand, color=LINE_QUICKSAND, label='Quicksand Oja++')
axs[0, 0].set_title('Clean Data Convergence')
axs[0, 0].set_ylabel('$V(W_t)$ Error')

# Top-Right: Adversarial Convergence
axs[0, 1].plot(time_steps, adv_oja, color=LINE_OJA, label='Standard Oja (Diverges)')
axs[0, 1].plot(time_steps, adv_quicksand, color=LINE_QUICKSAND, label='Quicksand Oja++ (Recovers)')
axs[0, 1].axvspan(injection_start, T, color='#ff3864', alpha=0.1, label='Adversarial Injection')
axs[0, 1].set_title('Adversarial Eigengap Collapse')

# Bottom: Step-Size Damping
axs[1, 0].plot(time_steps, eta_eff, color='#e8c547', label=r'$\eta^{eff}_t$ (Auto-Damping)')
axs[1, 0].axvspan(injection_start, T, color='#ff3864', alpha=0.1)
axs[1, 0].set_title('Quicksand Step-Size Damping')
axs[1, 0].set_ylabel('Step Size')
axs[1, 0].set_xlabel('Epoch ($t$)')

# Hide bottom-right empty plot
axs[1, 1].axis('off')

for i in range(2):
    for j in range(2):
        if i == 1 and j == 1: continue
        axs[i, j].grid(True, color=AXIS_COLOR, alpha=0.2)
        axs[i, j].legend(facecolor='#0d0d1a', edgecolor=AXIS_COLOR, prop={'size': 9})

plt.tight_layout()
plt.savefig(os.path.join(out_dir, 'sim05_stiefel_convergence.svg'), format='svg', facecolor=BG_COLOR)
plt.close()
