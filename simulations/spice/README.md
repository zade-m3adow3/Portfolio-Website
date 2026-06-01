# APU-X Thesis — SPICE Simulations & Empirical Validation Suite

This directory contains all SPICE netlists, Python simulation scripts, and
numerical validation files required by the thesis, organised chapter by chapter
following the Claude analysis.

## Directory Structure

```
SPICE Simulation/
├── ch3_oja_convergence/          Chapter 3 – Quicksand Oja++ convergence
│   ├── ch3_oja_convergence.py
│   └── ch3_margin_gain.py
├── ch4_quantization_noise/       Chapter 4 – Quantization noise & submodular memory
│   ├── ch4_switched_cap_noise.cir
│   ├── ch4_crossbar_enoise.py
│   └── ch4_memory_graph_recovery.py
├── ch5_gim_lyapunov/             Chapter 5 – GIM Lyapunov stability
│   ├── ch5_lcontract_sweep.py
│   └── ch5_boundary_damping.py
├── ch6_apux_hardware/            Chapter 6 – APU-X hardware substrate (most SPICE-critical)
│   ├── ch6_1_combinational_latency.cir
│   ├── ch6_1_pvt_sweep.py
│   ├── ch6_2_sram_bitcell_noise_margin.cir
│   ├── ch6_2_dasm_ber_analysis.py
│   ├── ch6_3_chs_em_decoupling.cir
│   ├── ch6_3_vnoise_verification.py
│   ├── ch6_4_thermal_precision.py
│   ├── ch6_5_shear_stress_fem.py
│   └── ch6_6_sot_mram_frequency.cir
├── ch8_pmm_validation/           Chapter 8 / Protocol 8.1 & 8.2
│   ├── ch8_protocol81_memory_recovery.py
│   └── ch8_protocol82_pmm_updates.py
└── appendix_a_substrate/         Appendix A – Extended substrate validations
    ├── appA_schmitt_trigger_audit.cir
    ├── appA_highk_dielectric.cir
    └── appA_cnt_thermal.py
```

## Running Order

1. Run all `.cir` files with LTspice / ngspice.
2. Run Python scripts in chapter order (ch3 → ch4 → ch5 → ch6 → ch8 → appA).
3. Each Python script saves its results as `.csv` / `.png` in its own folder.

## Dependencies (Python)

```
numpy scipy matplotlib pandas tqdm
```

Install: `pip install numpy scipy matplotlib pandas tqdm`
