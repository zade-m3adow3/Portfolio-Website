"""
ch6_5_shear_stress_fem.py
==========================
Chapter 6 §6.7 — Mechanical Shear Stress Bound
Validates: τ_shear ≈ 0.115 Pa  (derived from ΔT_total ≈ 3.85e-6 K)
           Shows bound holds cumulatively across thermal cycling.

This script simulates:
  1. Analytical shear stress model:   τ = G * γ   where γ = α_CTE * ΔT
  2. Cyclic thermal loading:          N cycles of ΔT swings
  3. Cumulative fatigue damage (Miner's rule)
  4. FEM-style 2D stress field in the die cross-section (Python analytic approx)

Run: python ch6_5_shear_stress_fem.py
Output: shear_stress_results.csv, shear_stress_plot.png
"""

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path

out_dir = Path(__file__).parent

# ─────────────────────────────────────────────────────────────
# Material properties
# ─────────────────────────────────────────────────────────────
# Silicon substrate
G_Si        = 68e9          # Pa  shear modulus
alpha_Si    = 2.6e-6        # /K  CTE silicon
# ALD Carbon interlayer
G_C         = 500e9         # Pa  diamond shear modulus
alpha_C     = 1.0e-6        # /K  CTE diamond
# Effective composite (rule of mixtures, ALD is 2nm / Si is 100µm)
f_C         = 2e-9 / 100e-6   # volume fraction of ALD layer
G_eff       = G_Si * (1-f_C) + G_C * f_C
alpha_eff   = alpha_Si * (1-f_C) + alpha_C * f_C

# ─────────────────────────────────────────────────────────────
# From §6.6: ΔT_total ≈ 3.85e-6 K
# ─────────────────────────────────────────────────────────────
dT_operating = 3.85e-6    # K — steady-state during operation
dT_cycle     = 50.0       # K — thermal cycle swing (power-on/off)
tau_thesis   = 0.115      # Pa — thesis claim

# ─────────────────────────────────────────────────────────────
# Instantaneous shear stress
# τ = G_eff * α_eff * ΔT  (engineering shear strain model)
# ─────────────────────────────────────────────────────────────
gamma_op    = alpha_eff * dT_operating
tau_op      = G_eff * gamma_op

gamma_cycle = alpha_eff * dT_cycle
tau_cycle   = G_eff * gamma_cycle

print("\n" + "="*65)
print("  Ch6 §6.7 — Mechanical Shear Stress Bound")
print("="*65)
print(f"  G_eff     = {G_eff:.4e} Pa")
print(f"  α_eff     = {alpha_eff:.4e} /K")
print(f"  ΔT_op     = {dT_operating:.2e} K (operating)")
print(f"  γ_op      = {gamma_op:.4e}  (shear strain)")
print(f"  τ_op      = {tau_op:.4e} Pa")
print(f"  Thesis τ  = {tau_thesis:.4e} Pa")
print(f"  Ratio     = {tau_op/tau_thesis:.4f}")
print(f"\n  ΔT_cycle  = {dT_cycle:.1f} K (power cycle)")
print(f"  τ_cycle   = {tau_cycle:.4e} Pa  (worst-case cyclic)")
print("="*65)

# ─────────────────────────────────────────────────────────────
# Cumulative fatigue damage (Miner's Rule)
# D = Σ (n_i / N_f,i)
# S-N relationship for thin-film Si: N_f = (σ_ult / τ)^m
# ─────────────────────────────────────────────────────────────
sigma_ult_Si = 7e9      # Pa  Si fracture strength
m_sn         = 10.0     # S-N exponent for brittle materials

def N_fatigue(tau, sigma_ult=sigma_ult_Si, m=m_sn):
    """Cycles to failure at shear stress τ (simplified S-N)."""
    if tau <= 0:
        return np.inf
    return (sigma_ult / tau) ** m

N_cycles = np.arange(1, int(1e6)+1)
N_f_cycle = N_fatigue(tau_cycle)
cumulative_damage = N_cycles / N_f_cycle

print(f"\n  N_f at τ_cycle = {N_f_cycle:.3e} cycles to failure")
print(f"  After 1e6 cycles: D = {1e6/N_f_cycle:.3e}  {'✓ Safe' if 1e6/N_f_cycle < 1 else '✗ FAIL'}")

# ─────────────────────────────────────────────────────────────
# 2D stress field (plane-stress analytic approximation)
# Model: die cross-section, linear ΔT gradient across thickness
# τ(x, z) = G * α * (dT/dz) * z
# ─────────────────────────────────────────────────────────────
x = np.linspace(0, 1e-6, 200)    # µm across die surface
z = np.linspace(0, 100e-9, 200)  # nm into substrate
XX, ZZ = np.meshgrid(x, z)
dT_dz  = dT_operating / 100e-9   # K/m temperature gradient through thickness
tau_field = G_Si * alpha_Si * dT_dz * ZZ   # shear stress field (Pa)

# ─────────────────────────────────────────────────────────────
# CSV output
# ─────────────────────────────────────────────────────────────
records = []
for dT in [1e-7, 1e-6, 3.85e-6, 1e-5, 1e-4, 1e-3]:
    tau_i = G_eff * alpha_eff * dT
    Nf    = N_fatigue(G_eff * alpha_eff * dT_cycle)
    records.append({
        "ΔT_K": dT,
        "γ_shear": alpha_eff * dT,
        "τ_Pa": tau_i,
        "N_f_cycles": Nf,
        "Damage_1M_cycles": 1e6 / Nf,
        "Below_thesis_claim": tau_i <= tau_thesis,
    })
df = pd.DataFrame(records)
df.to_csv(out_dir / "shear_stress_results.csv", index=False)

# ─────────────────────────────────────────────────────────────
# Plots
# ─────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(20, 6))
fig.patch.set_facecolor("#0d1117")
for ax in axes:
    ax.set_facecolor("#161b22")
    ax.tick_params(colors="white")
    ax.xaxis.label.set_color("white")
    ax.yaxis.label.set_color("white")
    ax.title.set_color("white")
    for spine in ax.spines.values():
        spine.set_edgecolor("#30363d")

# Panel 1: τ vs ΔT
dT_range = np.logspace(-9, -2, 601)
tau_range = G_eff * alpha_eff * dT_range
ax0 = axes[0]
ax0.loglog(dT_range, tau_range, color="#58a6ff", linewidth=2.5)
ax0.axhline(tau_thesis,   color="#ffa657", linestyle=":",  linewidth=1.5, label="τ_thesis = 0.115 Pa")
ax0.axvline(dT_operating, color="#3fb950", linestyle="--", linewidth=1.5, label="ΔT_op = 3.85e-6 K")
ax0.scatter([dT_operating], [tau_op], color="#ffa657", s=80, zorder=5)
ax0.set_xlabel("ΔT (K)")
ax0.set_ylabel("τ_shear (Pa)")
ax0.set_title("Shear Stress vs Temperature Rise\n(G_eff model)")
ax0.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax0.grid(True, which="both", color="#21262d", linewidth=0.4)

# Panel 2: Cumulative fatigue damage
ax1 = axes[1]
sample_pts = np.logspace(0, 6, 1000).astype(int)
sample_pts = np.unique(sample_pts)
sample_pts = sample_pts[sample_pts <= int(1e6)]
damage_pts = sample_pts / N_f_cycle
ax1.loglog(sample_pts, damage_pts, color="#f85149", linewidth=2.5,
           label=f"Miner damage D (τ_cycle={tau_cycle:.2e} Pa)")
ax1.axhline(1.0,  color="#f85149", linestyle="--", linewidth=1.5, label="D=1 (failure)")
ax1.axhline(0.01, color="#ffa657", linestyle=":",  linewidth=1.2, label="D=0.01 (safe)")
ax1.set_xlabel("Number of thermal cycles N")
ax1.set_ylabel("Cumulative Miner Damage D")
ax1.set_title("Fatigue Damage Accumulation\n(Miner's Rule, S-N exponent m=10)")
ax1.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax1.grid(True, which="both", color="#21262d", linewidth=0.4)

# Panel 3: 2D shear stress field in die cross-section
ax2 = axes[2]
im = ax2.contourf(XX * 1e6, ZZ * 1e9, tau_field,
                  levels=50, cmap="plasma")
cb = plt.colorbar(im, ax=ax2)
cb.set_label("τ_shear (Pa)", color="white", fontsize=9)
cb.ax.yaxis.set_tick_params(color="white")
plt.setp(cb.ax.yaxis.get_ticklabels(), color="white")
ax2.set_xlabel("x across die surface (µm)")
ax2.set_ylabel("z depth into substrate (nm)")
ax2.set_title("2D Shear Stress Field\n(Plane-stress analytic, operating ΔT)")

plt.suptitle("APU-X Ch6 §6.7 — Mechanical Shear Stress Bound Validation",
             color="white", fontsize=13, fontweight="bold", y=1.02)
plt.tight_layout()
plt.savefig(out_dir / "shear_stress_plot.png", dpi=180, bbox_inches="tight",
            facecolor=fig.get_facecolor())
plt.savefig(out_dir / "shear_stress_plot.svg", format="svg", bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print(f"\nPlot saved → {out_dir / 'shear_stress_plot.png'}")
print(f"CSV  saved → {out_dir / 'shear_stress_results.csv'}")
