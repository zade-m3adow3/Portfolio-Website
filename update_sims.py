# -*- coding: utf-8 -*-
import re

html_path = "portfolio-website/slides/slide-05-simulations/sims.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

python_files = [
    "appendix_a_substrate/appA_cnt_thermal.py",
    "ch3_oja_convergence/ch3_margin_gain.py",
    "ch3_oja_convergence/ch3_oja_convergence.py",
    "ch4_quantization_noise/ch4_crossbar_enoise.py",
    "ch4_quantization_noise/ch4_memory_graph_recovery.py",
    "ch5_gim_lyapunov/ch5_boundary_damping.py",
    "ch5_gim_lyapunov/ch5_lcontract_sweep.py",
    "ch6_apux_hardware/ch6_1_pvt_sweep.py",
    "ch6_apux_hardware/ch6_2_dasm_ber_analysis.py",
    "ch6_apux_hardware/ch6_3_vnoise_verification.py",
    "ch6_apux_hardware/ch6_4_thermal_precision.py",
    "ch6_apux_hardware/ch6_5_shear_stress_fem.py",
    "ch8_pmm_validation/ch8_protocol81_memory_recovery.py",
    "ch8_pmm_validation/ch8_protocol82_pmm_updates.py",
]

spice_files = [
    "appendix_a_substrate/appA_highk_dielectric.cir",
    "appendix_a_substrate/appA_schmitt_trigger_audit.cir",
    "ch4_quantization_noise/ch4_switched_cap_noise.cir",
    "ch6_apux_hardware/ch6_1_combinational_latency.cir",
    "ch6_apux_hardware/ch6_2_sram_bitcell_noise_margin.cir",
    "ch6_apux_hardware/ch6_3_chs_em_decoupling.cir",
    "ch6_apux_hardware/ch6_6_sot_mram_frequency.cir",
]

py_html = '<div class="sims-sidebar-group">\n            <div class="sims-sidebar-group-title">Python Models</div>\n'
for f in python_files:
    py_html += f'            <a href="#" class="sims-sidebar-link" data-path="python/{f}">{f.split("/")[-1]}</a>\n'
py_html += '          </div>'

spice_html = '<div class="sims-sidebar-group">\n            <div class="sims-sidebar-group-title">SPICE Netlists &amp; Logs</div>\n'
for f in spice_files:
    spice_html += f'            <a href="#" class="sims-sidebar-link" data-path="spice/{f}">{f.split("/")[-1]}</a>\n'
    log_f = f.replace(".cir", ".log")
    spice_html += f'            <a href="#" class="sims-sidebar-link" data-path="spice/{log_f}">{log_f.split("/")[-1]}</a>\n'
spice_html += '          </div>'

new_sidebar = f'<div class="sims-modal-sidebar">\n          {py_html}\n          {spice_html}\n        </div>'
content = re.sub(r'<div class="sims-modal-sidebar">.*?</div>\s*<div class="sims-modal-content"', new_sidebar + '\n        <div class="sims-modal-content"', content, flags=re.DOTALL)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated sims.html")
