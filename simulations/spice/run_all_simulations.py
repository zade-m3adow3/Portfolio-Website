"""
run_all_simulations.py
=======================
Master runner — executes all Python simulation scripts in order.
SPICE .cir files must be run separately in ngspice / LTspice.

Usage:
    python run_all_simulations.py

Requirements:
    pip install numpy scipy matplotlib pandas tqdm

Each script saves its results (CSV + PNG) in its own subdirectory.
"""

import subprocess
import sys
import time
from pathlib import Path

BASE = Path(__file__).parent

SCRIPTS = [
    # Chapter 3 — Oja++ convergence
    BASE / "ch3_oja_convergence" / "ch3_oja_convergence.py",
    BASE / "ch3_oja_convergence" / "ch3_margin_gain.py",
    # Chapter 4 — Quantization noise & submodular memory
    BASE / "ch4_quantization_noise" / "ch4_crossbar_enoise.py",
    BASE / "ch4_quantization_noise" / "ch4_memory_graph_recovery.py",
    # Chapter 5 — GIM Lyapunov stability
    BASE / "ch5_gim_lyapunov" / "ch5_lcontract_sweep.py",
    BASE / "ch5_gim_lyapunov" / "ch5_boundary_damping.py",
    # Chapter 6 — APU-X hardware substrate
    BASE / "ch6_apux_hardware" / "ch6_1_pvt_sweep.py",
    BASE / "ch6_apux_hardware" / "ch6_2_dasm_ber_analysis.py",
    BASE / "ch6_apux_hardware" / "ch6_3_vnoise_verification.py",
    BASE / "ch6_apux_hardware" / "ch6_4_thermal_precision.py",
    BASE / "ch6_apux_hardware" / "ch6_5_shear_stress_fem.py",
    # Chapter 8 — PMM validation (Protocols 8.1 and 8.2)
    BASE / "ch8_pmm_validation" / "ch8_protocol81_memory_recovery.py",
    BASE / "ch8_pmm_validation" / "ch8_protocol82_pmm_updates.py",   # ~2-5 min
    # Appendix A — Extended substrate validations
    BASE / "appendix_a_substrate" / "appA_cnt_thermal.py",
]

SPICE_FILES = [
    BASE / "ch6_apux_hardware"   / "ch6_1_combinational_latency.cir",
    BASE / "ch6_apux_hardware"   / "ch6_2_sram_bitcell_noise_margin.cir",
    BASE / "ch6_apux_hardware"   / "ch6_3_chs_em_decoupling.cir",
    BASE / "ch6_apux_hardware"   / "ch6_6_sot_mram_frequency.cir",
    BASE / "ch4_quantization_noise" / "ch4_switched_cap_noise.cir",
    BASE / "appendix_a_substrate"   / "appA_schmitt_trigger_audit.cir",
    BASE / "appendix_a_substrate"   / "appA_highk_dielectric.cir",
]

def run_script(script_path):
    print(f"\n{'-'*70}")
    print(f"  Running: {script_path.name}")
    print(f"{'-'*70}")
    t0 = time.time()
    result = subprocess.run(
        [sys.executable, str(script_path)],
        capture_output=False,
        text=True,
    )
    elapsed = time.time() - t0
    status = "✓ OK" if result.returncode == 0 else f"✗ FAILED (code {result.returncode})"
    print(f"\n  → {status}  [{elapsed:.1f} s]")
    return result.returncode == 0

if __name__ == "__main__":
    print("=" * 70)
    print("  APU-X Thesis — Full Simulation Suite")
    print("=" * 70)
    print(f"  Python scripts : {len(SCRIPTS)}")
    print(f"  SPICE netlists : {len(SPICE_FILES)} (run manually in ngspice/LTspice)")
    print()

    print("  SPICE files to run in ngspice / LTspice:")
    for cir in SPICE_FILES:
        print(f"    ngspice {cir.name}")

    print("\n  Starting Python scripts...\n")
    passed, failed = 0, []

    for script in SCRIPTS:
        ok = run_script(script)
        if ok:
            passed += 1
        else:
            failed.append(script.name)

    print("\n" + "="*70)
    print(f"  Results: {passed}/{len(SCRIPTS)} scripts passed")
    if failed:
        print(f"  Failed: {', '.join(failed)}")
    else:
        print("  All Python simulations completed successfully ✓")
    print("="*70)
    print("\n  Output files location:")
    print(f"    {BASE}")
    print("  Each subdirectory contains .csv and .png outputs.")
