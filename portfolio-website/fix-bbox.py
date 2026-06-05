import re
import math

svg_path = r'c:\Users\rovim\.gemini\antigravity\scratch\Portfolio-Website\portfolio-website\slides\slide-02-motivation\assets\spice-plots\protocol82_plot.svg'

with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all coordinates in M or L commands
pattern = r'[ML]\s+([\d.-]+)\s+([\d.-]+)'
matches = re.findall(pattern, content)

min_x, max_x = math.inf, -math.inf
min_y, max_y = math.inf, -math.inf

for x_str, y_str in matches:
    x, y = float(x_str), float(y_str)
    # Ignore the huge background box that goes to Y=0 and Y=137665
    if y <= 10 or y >= 137600:
        continue
    min_x = min(min_x, x)
    max_x = max(max_x, x)
    min_y = min(min_y, y)
    max_y = max(max_y, y)

print(f"Bounding Box (excluding giant background): X [{min_x}, {max_x}] Y [{min_y}, {max_y}]")

# Let's also rewrite the SVG to have this sensible viewBox
# The new viewBox should be around [0, min_y - 20, 951, (max_y - min_y) + 40]
new_min_y = min_y - 30
new_height = (max_y - min_y) + 60

# Replace the width, height, and viewBox in the <svg ...> tag
# Original: width="951.378125pt" height="137665.538705pt" viewBox="0 0 951.378125 137665.538705"
content = re.sub(
    r'width="[^"]+" height="[^"]+" viewBox="[^"]+"',
    f'width="951.378125pt" height="{new_height}pt" viewBox="0 {new_min_y} 951.378125 {new_height}"',
    content
)

with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SVG fixed and saved!")
