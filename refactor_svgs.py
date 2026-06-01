import os
import glob
import re

base_dir = "portfolio-website/assets/simulations"
py_files = []
for root, dirs, files in os.walk(base_dir):
    for f in files:
        if f.endswith(".py"):
            py_files.append(os.path.join(root, f))

for path in py_files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We look for lines like plt.savefig(out_dir / "some_plot.png", ...)
    # and duplicate them for .svg
    
    def replacer(match):
        orig = match.group(0)
        # Create an svg equivalent line
        svg_line = orig.replace(".png", ".svg")
        # Replace dpi=180 with format='svg' if it exists
        svg_line = re.sub(r'dpi=\d+', "format='svg'", svg_line)
        return orig + "\n" + svg_line

    new_content = re.sub(r'plt\.savefig\([^)]+\.png[^)]+\)', replacer, content)
    
    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Updated:", path)
