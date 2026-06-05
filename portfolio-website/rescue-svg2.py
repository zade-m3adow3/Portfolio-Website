import re

svg_path = r'c:\Users\rovim\.gemini\antigravity\scratch\Portfolio-Website\portfolio-website\slides\slide-02-motivation\assets\spice-plots\protocol82_plot.svg'

with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The original viewBox height is 137665.538705. We scale it to ~400.
# The original width is 951.378125.
NEW_HEIGHT = 400.0
ORIG_HEIGHT = 137665.538705
SCALE_Y = NEW_HEIGHT / ORIG_HEIGHT
INV_SCALE_Y = ORIG_HEIGHT / NEW_HEIGHT

# 1. Modify the svg header
content = re.sub(r'height="137665[^"]*"', f'height="{NEW_HEIGHT}pt"', content)
content = re.sub(r'viewBox="0 0 951[^"]*"', f'viewBox="0 0 951.378125 {NEW_HEIGHT}"', content)

# 2. Add vector-effect to fix strokes
content = content.replace(
    '<style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt}</style>',
    '<style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt; vector-effect: non-scaling-stroke;}</style>'
)

# 3. Wrap the main figure in a vertical scaler
content = content.replace('<g id="figure_1">', f'<g id="figure_1">\n  <g transform="scale(1, {SCALE_Y})">')
# Close the g tag at the end of the file. 
# Matplotlib SVGs end with: </g>\n</svg>
content = content.replace('</g>\n</svg>', '</g>\n</g>\n</svg>')

# 4. Compensate text scaling
# Find `scale(x y)` where y is usually negative, and multiply y by INV_SCALE_Y
def scale_repl(match):
    x = float(match.group(1))
    y = float(match.group(2))
    return f'scale({x} {y * INV_SCALE_Y})'

content = re.sub(r'scale\(([\d.-]+)\s+([\d.-]+)\)', scale_repl, content)

with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SVG wrapped and rescaled successfully!")
