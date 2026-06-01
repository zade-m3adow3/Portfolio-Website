import os
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
    
    # Check if we already patched it
    if "format='svg'" in content or 'format="svg"' in content:
        continue
        
    # We want to find plt.close() and insert an SVG save right before it.
    # But wait, not all scripts use plt.close()!
    # Let's just find the last plt.savefig(...) block by replacing the literal string.
    # Actually, replacing plt.close() with saving SVG then closing is safest.
    if "plt.close()" in content:
        # We need the output filename. We can parse it or just use the stem.
        # But wait, the original script has: out_dir / "some_plot.png"
        # We can extract the png filename.
        m = re.search(r'out_dir\s*/\s*"([^"]+)\.png"', content)
        if m:
            stem = m.group(1)
            # Replace plt.close() with SVG save + close
            svg_save = f'plt.savefig(out_dir / "{stem}.svg", format="svg", bbox_inches="tight", facecolor=fig.get_facecolor())\nplt.close()'
            new_content = content.replace("plt.close()", svg_save)
            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print("Updated via plt.close():", path)
        else:
            print("Could not find png name in", path)
    else:
        print("No plt.close() found in", path)
