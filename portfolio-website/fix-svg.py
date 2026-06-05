import re
import os

svg_path = r'c:\Users\rovim\.gemini\antigravity\scratch\Portfolio-Website\portfolio-website\slides\slide-02-motivation\assets\spice-plots\protocol82_plot.svg'

with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace comments containing "8.1" with "8.2"
content = content.replace('8.1', '8.2')

# Replace the visual '1' with '2' where it forms "8.1"
# The pattern is:
# <use xlink:href="#DejaVuSans-38" ... />
# <use xlink:href="#DejaVuSans-2e" ... />
# <use xlink:href="#DejaVuSans-31" ... />
# Note that DejaVuSans-Bold-38 might also exist.
pattern = r'(xlink:href="#DejaVuSans(?:-Bold)?-38"[^\n]+\n[^\n]+xlink:href="#DejaVuSans(?:-Bold)?-2e"[^\n]+\n[^\n]+xlink:href="#DejaVuSans(?:-Bold)?-)31"'
content = re.sub(pattern, r'\g<1>32"', content)

with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replaced 8.1 with 8.2 in SVG!")
