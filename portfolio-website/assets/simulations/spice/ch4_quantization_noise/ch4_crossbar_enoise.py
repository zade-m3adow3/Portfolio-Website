"""
ch4_crossbar_enoise.py
=======================
Chapter 4 — Quantization Noise & Submodular Memory (Theorem 4.3)
Validates: ‖E_noise‖₂ < λ_k  (preservation condition)
           Sweeps temperature and supply voltage for 10-bit crossbar.

Theorem 4.3: The submodular memory kernel K is preserved iff
             ‖E_noise‖₂ < λ_k(K)
where λ_k is the k-th eigenvalue of the memory kernel matrix K
and E_noise is the quantization + thermal noise matrix.

This script:
  1. Constructs a representative memory kernel matrix K (d×d positive semidefinite).
  2. Computes λ_k(K) — the critical eigenvalue threshold.
  3. Models ‖E_noise‖₂ from the kT/C formula as a function of T and VDD.
  4. Sweeps T and VDD showing where ‖E_noise‖₂ < λ_k is satisfied.
  5. Generates pass/fail map and margin curves.

Run: python ch4_crossbar_enoise.py
Output: crossbar_enoise_results.csv, crossbar_enoise_plot.png
"""

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from scipy.linalg import eigvalsh
from pathlib import Path

out_dir = Path(__file__).parent
rng = np.random.default_rng(42)

# ─────────────────────────────────────────────────────────────
# Physical constants and hardware parameters
# ─────────────────────────────────────────────────────────────
kB         = 1.380649e-23    # J/K
BITS       = 10
VDD_NOM    = 1.8             # V  analog supply
V_LSB_NOM  = VDD_NOM / (2**BITS)  # 10-bit LSB at nominal VDD
C_S        = 1e-12           # F  sampling capacitor 1 pF
R_SW_on    = 200             # Ω  switch on-resistance
BW_sample  = 100e6           # Hz sample bandwidth (f_clk = 100 MHz)
d_crossbar = 64              # crossbar dimension (64×64 synaptic array)
k_rank     = 8               # kernel rank for submodularity

# ─────────────────────────────────────────────────────────────
# Memory kernel matrix K (representative submodular kernel)
# Constructed as a low-rank PSD matrix with known spectrum
# ─────────────────────────────────────────────────────────────
# Eigenvalues: k_rank large + (d-k_rank) small (noise floor)
lambda_large = np.array([5.0, 4.2, 3.8, 3.1, 2.7, 2.3, 1.9, 1.5])  # top k
lambda_small = np.full(d_crossbar - k_rank, 0.05)                    # noise floor
all_lambdas  = np.concatenate([lambda_large, lambda_small])
all_lambdas  = np.sort(all_lambdas)[::-1]

# Random orthogonal basis
Q_basis = np.linalg.qr(rng.standard_normal((d_crossbar, d_crossbar)))[0]
K_matrix = Q_basis @ np.diag(all_lambdas) @ Q_basis.T
K_matrix = (K_matrix + K_matrix.T) / 2  # enforce symmetry

# Critical eigenvalue: k-th eigenvalue (smallest of top-k)
lambda_k     = all_lambdas[k_rank - 1]    # = 1.5
lambda_k1    = all_lambdas[k_rank]        # = 0.05 (eigengap)
delta_lambda = lambda_k - lambda_k1

print("\n" + "="*65)
print("  Ch4 Theorem 4.3 — Crossbar E_noise Analysis")
print("="*65)
print(f"  Kernel K: {d_crossbar}×{d_crossbar}, rank={k_rank}")
print(f"  λ_k (threshold) = {lambda_k:.4f}")
print(f"  λ_k+1           = {lambda_k1:.4f}")
print(f"  Eigengap δ      = {delta_lambda:.4f}")

# ─────────────────────────────────────────────────────────────
# E_noise model
# E_noise is a d×d noise matrix whose spectral norm (‖·‖₂ = max singular value)
# derives from quantization + thermal contributions:
#
# ‖E_noise‖₂ ≈ sqrt(V²_quant + V²_thermal) / V_signal_scale * norm_factor
#
# V²_quant   = (V_LSB)²/12          (uniform quantization noise)
# V²_thermal = kT/C_S               (kT/C sampling noise)
# V²_total   = V²_quant + V²_thermal + V²_flicker
# ‖E_noise‖₂ ≈ sqrt(d * V²_total) / V_FSR  (spectral norm of noise matrix)
# ─────────────────────────────────────────────────────────────

V_FSR = VDD_NOM    # full-scale range

def E_noise_spectral_norm(T_C, vdd, bits=BITS, C=C_S, Rsw=R_SW_on, bw=BW_sample):
    """
    Spectral norm of E_noise as a function of temperature and VDD.
    Returns ‖E_noise‖₂ (dimensionless, normalised by V_FSR).
    """
    T_K   = T_C + 273.15
    V_lsb = vdd / (2**bits)
    # Quantisation noise (uniform distribution)
    V2_quant   = (V_lsb**2) / 12.0
    # Thermal (kT/C) noise
    V2_thermal = kB * T_K / C
    # Johnson noise from switch resistance (over BW)
    V2_johnson = 4 * kB * T_K * Rsw * bw * (1/bw)   # integrated over 1 sample
    # Total noise variance per element
    V2_total   = V2_quant + V2_thermal + V2_johnson
    V_rms      = np.sqrt(V2_total)
    # Spectral norm of d×d noise matrix:
    # For i.i.d. Gaussian noise matrix with variance σ², ‖E‖₂ ≈ 2σ√d
    sigma_norm = 2 * V_rms * np.sqrt(d_crossbar) / V_FSR
    return sigma_norm, V_rms * 1e6  # return norm + V_rms in µV

# ── Nominal check ──
E_nom, V_rms_nom_uV = E_noise_spectral_norm(27, VDD_NOM)
print(f"\n  Nominal T=27°C, VDD={VDD_NOM}V:")
print(f"    V_rms_noise = {V_rms_nom_uV:.2f} µV")
print(f"    ‖E_noise‖₂  = {E_nom:.6f}")
print(f"    λ_k         = {lambda_k:.4f}")
flag = "✓ PASS" if E_nom < lambda_k else "✗ FAIL"
print(f"    ‖E_noise‖₂ < λ_k? {flag}")
print(f"    Margin      = {lambda_k - E_nom:.6f}")
print("="*65)

# ─────────────────────────────────────────────────────────────
# 2D sweep: Temperature × VDD
# ─────────────────────────────────────────────────────────────
temps = np.linspace(-40, 130, 171)
vdds  = np.linspace(1.2,  2.0, 161)
TT, VV = np.meshgrid(temps, vdds)

ENORM_GRID = np.zeros_like(TT)
for i in range(TT.shape[0]):
    for j in range(TT.shape[1]):
        en, _ = E_noise_spectral_norm(TT[i,j], VV[i,j])
        ENORM_GRID[i,j] = en

MARGIN_GRID = lambda_k - ENORM_GRID
PASS_GRID   = MARGIN_GRID > 0

# ─────────────────────────────────────────────────────────────
# 1D sweeps for scaling analysis
# ─────────────────────────────────────────────────────────────
# vs Temperature at nominal VDD
E_vs_T = [E_noise_spectral_norm(T, VDD_NOM)[0] for T in temps]
# vs VDD at T=125°C (worst case)
E_vs_V = [E_noise_spectral_norm(125, v)[0] for v in vdds]

# ─────────────────────────────────────────────────────────────
# CSV output
# ─────────────────────────────────────────────────────────────
records = []
for T in [-40, 27, 85, 125]:
    for v in [1.2, 1.5, 1.8, 2.0]:
        en, vn = E_noise_spectral_norm(T, v)
        records.append({
            "Temp_C": T, "VDD_V": v,
            "V_rms_noise_uV": vn,
            "E_noise_spectral_norm": en,
            "lambda_k": lambda_k,
            "Margin": lambda_k - en,
            "Pass": en < lambda_k,
        })
df = pd.DataFrame(records)
df.to_csv(out_dir / "crossbar_enoise_results.csv", index=False)

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

# Panel 1: Pass/fail heatmap
ax0 = axes[0]
im = ax0.contourf(temps, vdds, MARGIN_GRID, levels=50, cmap="RdYlGn")
ax0.contour(temps, vdds, MARGIN_GRID, levels=[0], colors="#ffffff", linewidths=2)
cb = plt.colorbar(im, ax=ax0)
cb.set_label("Margin λ_k − ‖E_noise‖₂", color="white", fontsize=9)
cb.ax.yaxis.set_tick_params(color="white")
plt.setp(cb.ax.yaxis.get_ticklabels(), color="white")
ax0.set_xlabel("Temperature (°C)")
ax0.set_ylabel("VDD (V)")
ax0.set_title("Theorem 4.3 Preservation Condition\n‖E_noise‖₂ < λ_k Map")

# Panel 2: ‖E_noise‖₂ vs Temperature
ax1 = axes[1]
ax1.plot(temps, E_vs_T, color="#f85149", linewidth=2.5, label="‖E_noise‖₂(T)")
ax1.axhline(lambda_k, color="#3fb950", linestyle="--", linewidth=1.5,
            label=f"λ_k = {lambda_k:.3f}")
ax1.fill_between(temps, E_vs_T, lambda_k,
                 where=[e < lambda_k for e in E_vs_T],
                 alpha=0.15, color="#3fb950", label="Theorem 4.3 satisfied")
ax1.fill_between(temps, E_vs_T, lambda_k,
                 where=[e >= lambda_k for e in E_vs_T],
                 alpha=0.15, color="#f85149", label="Theorem 4.3 violated")
ax1.set_xlabel("Temperature (°C)")
ax1.set_ylabel("‖E_noise‖₂")
ax1.set_title("‖E_noise‖₂ vs Temperature\n(VDD = 1.8V nominal)")
ax1.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax1.grid(True, color="#21262d", linewidth=0.4)

# Panel 3: Kernel eigenvalue spectrum
ax2 = axes[2]
eigvals_sorted = np.sort(all_lambdas)[::-1]
ax2.bar(range(1, d_crossbar+1), eigvals_sorted, color="#58a6ff",
        edgecolor="#30363d", linewidth=0.4, alpha=0.85)
ax2.axhline(lambda_k,  color="#ffa657", linestyle="--", linewidth=1.5,
            label=f"λ_k = {lambda_k:.2f} (k={k_rank})")
ax2.axhline(E_nom,     color="#f85149", linestyle=":",  linewidth=1.5,
            label=f"‖E_noise‖₂ = {E_nom:.4f}")
ax2.axvline(k_rank,    color="#3fb950", linestyle="--", linewidth=1.2,
            label=f"k = {k_rank}")
ax2.set_xlabel("Eigenvalue index")
ax2.set_ylabel("Eigenvalue λ")
ax2.set_title("Memory Kernel K Spectrum\n(Eigenvalue gap visible at k=8)")
ax2.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax2.set_xlim(0, 25)
ax2.grid(True, color="#21262d", linewidth=0.4)

plt.suptitle("APU-X Ch4 — Theorem 4.3 Submodular Preservation ‖E_noise‖₂ < λ_k",
             color="white", fontsize=13, fontweight="bold", y=1.02)
plt.tight_layout()
plt.savefig(out_dir / "crossbar_enoise_plot.png", dpi=180, bbox_inches="tight",
            facecolor=fig.get_facecolor())
plt.savefig(out_dir / "crossbar_enoise_plot.svg", format="svg", bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print(f"\nPlot saved → {out_dir / 'crossbar_enoise_plot.png'}")
print(f"CSV  saved → {out_dir / 'crossbar_enoise_results.csv'}")
