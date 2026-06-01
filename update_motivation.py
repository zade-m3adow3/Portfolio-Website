import re

html_path = "portfolio-website/slides/slide-02-motivation/motivation.html"
with open(html_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the title
content = content.replace("Five Simulations,<br>Five Theorems Validated", "Fourteen Simulations,<br>Fourteen Theorems Validated")

# unicode middle dot: \u00B7
dot = "\u00B7"
simulations = [
    {"badge": f"CH3 {dot} OJA++", "file": "oja_convergence_plot.svg"},
    {"badge": f"CH3 {dot} MARGIN GAIN", "file": "margin_gain_plot.svg"},
    {"badge": f"CH4 {dot} E-NOISE", "file": "crossbar_enoise_plot.svg"},
    {"badge": f"CH4 {dot} RECOVERY", "file": "memory_graph_recovery_plot.svg"},
    {"badge": f"CH5 {dot} GIM DAMPING", "file": "boundary_damping_plot.svg"},
    {"badge": f"CH5 {dot} L-CONTRACT", "file": "lcontract_sweep_plot.svg"},
    {"badge": f"CH6 {dot} PVT SWEEP", "file": "pvt_corner_plot.svg"},
    {"badge": f"CH6 {dot} DASM BER", "file": "dasm_ber_plot.svg"},
    {"badge": f"CH6 {dot} CHS NOISE", "file": "chs_noise_plot.svg"},
    {"badge": f"CH6 {dot} THERMAL PREC.", "file": "thermal_precision_plot.svg"},
    {"badge": f"CH6 {dot} SHEAR STRESS", "file": "shear_stress_plot.svg"},
    {"badge": f"CH8 {dot} PROTOCOL 8.1", "file": "protocol81_plot.svg"},
    {"badge": f"CH8 {dot} PROTOCOL 8.2", "file": "protocol82_plot.svg"},
    {"badge": f"APP-A {dot} CNT THERMAL", "file": "cnt_thermal_plot.svg"},
]

grid_html = '<div class="s2-sim-grid" id="s2-sim-grid">\n'
for i, sim in enumerate(simulations):
    num = str(i+1).zfill(2)
    style = ' style="position:relative;"'
    if i == 0 or i == 1:
        css_class = "s2-sim-card s2-sim-card-wide" if i == 0 else "s2-sim-card"
    else:
        css_class = "s2-sim-card"
        if i % 3 == 0: css_class += " s2-sim-card-wide"
        
    grid_html += f'''            <div class="{css_class}" data-sim="{num}" data-sim-id="sim{num}"{style}>
              <div class="s2-sim-badge s2-badge-{num}">{sim["badge"]}</div>
              <button class="s2-inspect-btn" aria-label="Inspect SIM-{num} parameters">? INSPECT</button>
              <div class="s2-sim-plot" id="plot-sim{num}" data-svg="assets/spice-plots/{sim["file"]}"></div>
              <div class="s2-sim-result s2-katex-result" id="sim{num}-equation"></div>
            </div>\n'''

grid_html += '          </div>'

# Regex to replace the s2-sim-grid
new_content = re.sub(r'<div class="s2-sim-grid" id="s2-sim-grid">.*?</div>\s*<div class="s2-equation-block">', grid_html + '\n\n          <div class="s2-equation-block">', content, flags=re.DOTALL)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Updated motivation.html")
