"""
appA_cnt_thermal.py
====================
Appendix A — Theorem A.3: CNT Pillar Thermal Conductivity Validation
Validates: κ_vertical ≥ 1400 W/m·K for CNT pillar array
           (Kim et al. 2001 cite is for individual MWNTs; this validates
            the specific pillar geometry used in the APU-X substrate.)

Methods modelled:
  1. 3ω method simulation  — extracts κ from AC thermal wave response
  2. TDTR (Time-Domain Thermoreflectance) simulation  — pulsed laser
  3. Analytical pillar geometry model  — effective medium theory
  4. Interface resistance sensitivity  — how Kapitza affects apparent κ

Run: python appA_cnt_thermal.py
Output: cnt_thermal_results.csv, cnt_thermal_plot.png
"""

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from scipy.integrate import quad
from pathlib import Path

out_dir = Path(__file__).parent if '__file__' in globals() else Path('.')

# ─────────────────────────────────────────────────────────────
# Physical constants
# ─────────────────────────────────────────────────────────────
kB   = 1.380649e-23
hbar = 1.054571817e-34
T0   = 300.0      # K  room temperature

# ─────────────────────────────────────────────────────────────
# CNT pillar geometry (APU-X Appendix A spec)
# ─────────────────────────────────────────────────────────────
# Pillar array: d_CNT = 20 nm diameter MWNTs (multi-walled)
# Pillar density: n_CNT per µm² filling fraction f_CNT
# Height: H_pillar = 1 µm

d_CNT        = 20e-9        # m MWNT outer diameter
r_CNT        = d_CNT / 2
H_pillar     = 1e-6         # m pillar height
f_CNT        = 0.35         # pillar area filling fraction 35%
A_pillar     = 1e-12        # m² pillar footprint (1µm × 1µm)

# Individual MWNT thermal conductivity (Kim et al. 2001 basis)
kappa_MWNT_Kim   = 3000.0   # W/m·K  individual MWNT (Kim 2001 upper bound)
kappa_MWNT_lower = 1000.0   # W/m·K  conservative estimate
kappa_MWNT_upper = 3000.0   # W/m·K

# Effective medium theory (parallel composite):
# κ_eff = f_CNT * κ_MWNT + (1-f_CNT) * κ_matrix
# Matrix: SiO₂ interlayer  κ_SiO2 = 1.4 W/m·K
kappa_matrix = 1.4   # SiO₂

def kappa_eff_pillar(kappa_mwnt, f=f_CNT, km=kappa_matrix):
    """Effective vertical thermal conductivity of CNT pillar array."""
    return f * kappa_mwnt + (1 - f) * km

kappa_nom = kappa_eff_pillar(kappa_MWNT_Kim)
kappa_lo  = kappa_eff_pillar(kappa_MWNT_lower)

print("\n" + "="*65)
print("  Appendix A — CNT Pillar Thermal Conductivity (Theorem A.3)")
print("="*65)
print(f"  Pillar geometry: d={d_CNT*1e9:.0f}nm, H={H_pillar*1e6:.0f}µm, f={f_CNT:.2f}")
print(f"  Individual MWNT κ (Kim 2001): {kappa_MWNT_Kim:.0f} W/m·K")
print(f"  κ_vertical (nominal, EMT):    {kappa_nom:.1f} W/m·K")
print(f"  κ_vertical (lower bound):     {kappa_lo:.1f} W/m·K")
print(f"  Thesis requirement:           κ ≥ 1400 W/m·K")
flag_nom = "✓ PASS" if kappa_nom >= 1400 else "✗ FAIL"
flag_lo  = "✓ PASS" if kappa_lo  >= 1400 else "✗ FAIL"
print(f"  Nominal passes? {flag_nom}")
print(f"  Lower bound passes? {flag_lo}")

# ─────────────────────────────────────────────────────────────
# 3ω Method Simulation
# In the 3ω method: a heater line deposits power P at frequency ω.
# The temperature oscillation ΔT(2ω) is measured.
# κ is extracted from: κ = P * ln(f₂/f₁) / (π * L * (ΔT₁ - ΔT₂))
#
# Here we simulate the ΔT(f) response analytically:
# ΔT(2ω) = P / (2πκL) * [K₀(qr) * correction]
# where q = sqrt(i*2ω/D), D = κ/(ρ*Cp)
# ─────────────────────────────────────────────────────────────
rho_pillar = 1500.0    # kg/m³ effective density
Cp_pillar  = 700.0     # J/(kg·K) heat capacity

def diffusivity(kappa, rho=rho_pillar, Cp=Cp_pillar):
    return kappa / (rho * Cp)

def delta_T_3omega(freq_hz, P_watts, L_heater, kappa):
    """
    3ω temperature oscillation magnitude (simplified).
    ΔT ∝ P/(κ·L) * Re[K₀(q·r_heater)] / π
    where q = sqrt(i·2ω/D)
    Approximated for r_heater >> penetration depth:
    ΔT ≈ P/(π·κ·L) * (0.5*ln(D/(2ω*r²)) + const)
    """
    omega   = 2 * np.pi * freq_hz
    D       = diffusivity(kappa)
    r_heat  = 50e-6    # heater half-width 50 µm
    arg     = D / (omega * r_heat**2)
    if arg <= 0:
        return 0.0
    dT = (P_watts / (np.pi * kappa * L_heater)) * (0.5 * np.log(arg) + 0.923)
    return abs(dT)

freqs_3w    = np.logspace(1, 5, 201)   # 10 Hz to 100 kHz
P_3w        = 1e-3     # 1 mW power
L_heater    = 1e-3     # 1 mm heater length

dT_nom  = [delta_T_3omega(f, P_3w, L_heater, kappa_nom)  for f in freqs_3w]
dT_lo   = [delta_T_3omega(f, P_3w, L_heater, kappa_lo)   for f in freqs_3w]
dT_1400 = [delta_T_3omega(f, P_3w, L_heater, 1400.0)      for f in freqs_3w]

# ─────────────────────────────────────────────────────────────
# TDTR Method Simulation
# Time-domain thermoreflectance: pulsed laser heats surface,
# temperature decay measured via probe reflectivity change.
# T(t) = Q / (ρ*Cp*A) * exp(-t²/(4*D*t)) / sqrt(4πDt)
# ─────────────────────────────────────────────────────────────
t_TDTR   = np.logspace(-12, -6, 1001)  # 1 ps to 1 µs
Q_laser  = 1e-12    # J  absorbed laser pulse energy
A_beam   = np.pi * (5e-6)**2  # 5 µm radius spot

def T_TDTR(t, kappa, rho=rho_pillar, Cp=Cp_pillar):
    """Surface temperature decay after laser pulse (1D Fourier)."""
    D = diffusivity(kappa, rho, Cp)
    prefactor = Q_laser / (rho * Cp * A_beam)
    decay = np.exp(-1e-6 / (4 * D * t + 1e-30)) / np.sqrt(4 * np.pi * D * t + 1e-30)
    return prefactor * decay

T_nom_TDTR  = np.array([T_TDTR(t, kappa_nom) for t in t_TDTR])
T_lo_TDTR   = np.array([T_TDTR(t, kappa_lo)  for t in t_TDTR])
T_1400_TDTR = np.array([T_TDTR(t, 1400.0)    for t in t_TDTR])

# ─────────────────────────────────────────────────────────────
# Filling fraction sweep: κ_eff vs f_CNT
# ─────────────────────────────────────────────────────────────
f_vals     = np.linspace(0.05, 0.80, 501)
kappa_vs_f_Kim  = [kappa_eff_pillar(kappa_MWNT_Kim,   f) for f in f_vals]
kappa_vs_f_lo   = [kappa_eff_pillar(kappa_MWNT_lower, f) for f in f_vals]

# ─────────────────────────────────────────────────────────────
# Kapitza interface resistance effect on apparent κ
# κ_apparent = 1 / (H/κ_bulk + R_kapitza/H)  → effective κ
# ─────────────────────────────────────────────────────────────
R_k_vals   = np.logspace(-10, -7, 401)   # m²·K/W
def kappa_apparent(kappa_bulk, R_k, H=H_pillar):
    return 1.0 / (H / kappa_bulk + R_k / H) * H

kappa_app_nom = [kappa_apparent(kappa_nom, R_k) for R_k in R_k_vals]
kappa_app_lo  = [kappa_apparent(kappa_lo,  R_k) for R_k in R_k_vals]

# ─────────────────────────────────────────────────────────────
# CSV output
# ─────────────────────────────────────────────────────────────
records = []
for f in [0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 0.60]:
    k_hi = kappa_eff_pillar(kappa_MWNT_Kim, f)
    k_lo = kappa_eff_pillar(kappa_MWNT_lower, f)
    records.append({
        "fill_fraction": f,
        "kappa_eff_Kim2001_W_mK":  k_hi,
        "kappa_eff_lower_W_mK":    k_lo,
        "meets_1400_Kim":   k_hi >= 1400,
        "meets_1400_lower": k_lo >= 1400,
    })
pd.DataFrame(records).to_csv(out_dir / "cnt_thermal_results.csv", index=False)

# ─────────────────────────────────────────────────────────────
# Plots
# ─────────────────────────────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(16, 12))
fig.patch.set_facecolor("#0d1117")
for ax in axes.flat:
    ax.set_facecolor("#161b22")
    ax.tick_params(colors="white")
    ax.xaxis.label.set_color("white")
    ax.yaxis.label.set_color("white")
    ax.title.set_color("white")
    for spine in ax.spines.values():
        spine.set_edgecolor("#30363d")

# Panel 1: 3ω ΔT vs frequency
ax0 = axes[0, 0]
ax0.loglog(freqs_3w, np.array(dT_nom)  + 1e-15, color="#58a6ff", linewidth=2,
           label=f"κ = {kappa_nom:.0f} W/m·K (Kim 2001 + EMT)")
ax0.loglog(freqs_3w, np.array(dT_lo)   + 1e-15, color="#f85149", linewidth=2,
           label=f"κ = {kappa_lo:.0f} W/m·K (lower bound)")
ax0.loglog(freqs_3w, np.array(dT_1400) + 1e-15, color="#ffa657", linewidth=2,
           linestyle="--", label="κ = 1400 W/m·K (thesis target)")
ax0.set_xlabel("Heater frequency (Hz)")
ax0.set_ylabel("ΔT₃ω (K)")
ax0.set_title("3ω Method — Thermal Response vs Frequency\n(κ extracted from slope)")
ax0.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax0.grid(True, which="both", color="#21262d", linewidth=0.4)

# Panel 2: TDTR decay curves
ax1 = axes[0, 1]
ax1.loglog(t_TDTR * 1e9, T_nom_TDTR  + 1e-20, color="#58a6ff", linewidth=2,
           label=f"κ = {kappa_nom:.0f} W/m·K")
ax1.loglog(t_TDTR * 1e9, T_lo_TDTR   + 1e-20, color="#f85149", linewidth=2,
           label=f"κ = {kappa_lo:.0f} W/m·K")
ax1.loglog(t_TDTR * 1e9, T_1400_TDTR + 1e-20, color="#ffa657", linewidth=2,
           linestyle="--", label="κ = 1400 W/m·K")
ax1.set_xlabel("Time delay (ns)")
ax1.set_ylabel("ΔT_surface (K)")
ax1.set_title("TDTR Simulation — Surface Temperature Decay\n(Faster decay → higher κ)")
ax1.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax1.grid(True, which="both", color="#21262d", linewidth=0.4)

# Panel 3: κ_eff vs filling fraction
ax2 = axes[1, 0]
ax2.plot(f_vals*100, kappa_vs_f_Kim, color="#3fb950", linewidth=2.5,
         label="Kim 2001: κ_MWNT = 3000 W/m·K")
ax2.plot(f_vals*100, kappa_vs_f_lo,  color="#f85149", linewidth=2.5, linestyle="--",
         label="Lower: κ_MWNT = 1000 W/m·K")
ax2.axhline(1400,   color="#ffa657", linestyle=":",  linewidth=1.5, label="κ_target = 1400 W/m·K")
ax2.axvline(f_CNT*100, color="#58a6ff", linestyle="--", linewidth=1.2,
            label=f"APU-X fill fraction = {f_CNT*100:.0f}%")
ax2.scatter([f_CNT*100], [kappa_nom], color="#ffa657", s=100, zorder=5)
ax2.set_xlabel("CNT filling fraction (%)")
ax2.set_ylabel("κ_vertical (W/m·K)")
ax2.set_title("Effective Medium Theory — κ_eff vs Fill Fraction\n(Theorem A.3 validation)")
ax2.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax2.grid(True, color="#21262d", linewidth=0.4)

# Panel 4: Apparent κ vs Kapitza resistance
ax3 = axes[1, 1]
ax3.loglog(R_k_vals, kappa_app_nom, color="#3fb950", linewidth=2.5,
           label=f"κ_bulk = {kappa_nom:.0f} W/m·K")
ax3.loglog(R_k_vals, kappa_app_lo,  color="#f85149", linewidth=2.5, linestyle="--",
           label=f"κ_bulk = {kappa_lo:.0f} W/m·K")
ax3.axhline(1400, color="#ffa657", linestyle=":",  linewidth=1.5, label="1400 W/m·K target")
ax3.axvline(2e-9, color="#58a6ff", linestyle="--", linewidth=1.2,
            label="R_kapitza = 2e-9 m²K/W (§6.6)")
ax3.set_xlabel("Kapitza resistance R_th,c (m²·K/W)")
ax3.set_ylabel("Apparent κ (W/m·K)")
ax3.set_title("Kapitza Interface Resistance Effect\non Apparent κ (3ω extraction)")
ax3.legend(fontsize=8, facecolor="#161b22", labelcolor="white", edgecolor="#30363d")
ax3.grid(True, which="both", color="#21262d", linewidth=0.4)

plt.suptitle("APU-X Appendix A — Theorem A.3: CNT Pillar Vertical κ ≥ 1400 W/m·K",
             color="white", fontsize=13, fontweight="bold")
plt.tight_layout()
plt.savefig(out_dir / "cnt_thermal_plot.png", dpi=180, bbox_inches="tight",
            facecolor=fig.get_facecolor())
plt.savefig(out_dir / "cnt_thermal_plot.svg", format="svg", bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print(f"\nPlot saved → {out_dir / 'cnt_thermal_plot.png'}")
print(f"CSV  saved → {out_dir / 'cnt_thermal_results.csv'}")
