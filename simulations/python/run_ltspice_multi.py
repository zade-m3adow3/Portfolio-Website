import sys
import re
from pathlib import Path
import subprocess
import shutil

# Path to LTspice executable (you may need to adjust this depending on your install)
LTSPICE_EXE = r"C:\Program Files\LTC\LTspiceXVII\XVIIx64.exe" 
# Alternatively, for newer versions (LTspice 17.1+ / 24+):
LTSPICE_EXE_ALT = r"C:\Program Files\LTspice\LTspice.exe"

def run_multi_analysis(cir_file):
    cir_path = Path(cir_file).resolve()
    
    if not cir_path.exists():
        print(f"Error: Could not find {cir_path}")
        return

    # Find the correct LTspice executable
    exe_to_use = LTSPICE_EXE
    if not Path(LTSPICE_EXE).exists():
        if Path(LTSPICE_EXE_ALT).exists():
            exe_to_use = LTSPICE_EXE_ALT
        else:
            print(f"Warning: LTspice executable not found at common paths.")
            print(f"Please update LTSPICE_EXE in this script to point to your LTspice.exe")
            # fallback to just 'XVIIx64.exe' or 'LTspice' in PATH if available
            exe_to_use = "LTspice" 

    with open(cir_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Identify all analysis commands (.TRAN, .DC, .AC, .OP, etc.)
    analysis_cmds = ['.TRAN', '.DC', '.AC', '.OP', '.TF', '.NOISE']
    analysis_indices = []

    for i, line in enumerate(lines):
        upper_line = line.strip().upper()
        if any(upper_line.startswith(cmd) for cmd in analysis_cmds):
            analysis_indices.append(i)

    if not analysis_indices:
        print(f"No analyses found in {cir_file}.")
        return
        
    print(f"Found {len(analysis_indices)} separate analyses in {cir_file.name}. Splitting...")

    # Create and run a temporary file for each analysis
    for idx, line_idx in enumerate(analysis_indices):
        cmd_type = lines[line_idx].strip().split()[0].upper().replace('.', '')
        temp_name = cir_path.parent / f"{cir_path.stem}_{idx+1}_{cmd_type}.cir"
        
        with open(temp_name, 'w', encoding='utf-8') as f:
            for i, line in enumerate(lines):
                if i in analysis_indices and i != line_idx:
                    # Comment out the other analyses
                    f.write(f"* {line}")
                else:
                    f.write(line)
        
        print(f"\n[{idx+1}/{len(analysis_indices)}] Running {cmd_type} analysis via {temp_name.name}...")
        
        # Run LTspice in batch mode (-b)
        try:
            subprocess.run([exe_to_use, "-b", str(temp_name)], check=True)
            print(f"  Done. Output saved to {temp_name.with_suffix('.raw').name} / {temp_name.with_suffix('.log').name}")
        except FileNotFoundError:
            print(f"  Error: LTspice executable '{exe_to_use}' not found.")
            break
        except subprocess.CalledProcessError as e:
            print(f"  LTspice returned an error code: {e.returncode}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_ltspice_multi.py <file.cir>")
    else:
        run_multi_analysis(sys.argv[1])
