import re

svg_path = r'c:\Users\rovim\.gemini\antigravity\scratch\Portfolio-Website\portfolio-website\slides\slide-02-motivation\assets\spice-plots\protocol82_plot.svg'

with open(svg_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The original viewBox height is 137665.538705. We want to scale it to ~400.
# The original width is 951.378125.
SCALE_Y = 400.0 / 137665.538705

# 1. Scale 'translate(x y)'
def translate_repl(match):
    x = float(match.group(1))
    y = float(match.group(2))
    return f'translate({x} {y * SCALE_Y})'

content = re.sub(r'translate\(([\d.-]+)\s+([\d.-]+)\)', translate_repl, content)

# 2. Scale 'M x y', 'L x y', 'Q cx cy x y', etc. inside path d="..."
# This is tricky because paths can have multiple coordinates and commands.
# Let's extract the d="..." attributes, parse them, and replace them.

def path_d_repl(match):
    d = match.group(1)
    # Tokenize the SVG path string
    tokens = re.findall(r'[a-zA-Z]+|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?', d)
    
    new_tokens = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token.isalpha():
            new_tokens.append(token)
            # Depending on the command, we know how many coordinates follow
            cmd = token.upper()
            if cmd in ['M', 'L', 'T']:
                # M x y, L x y
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    x = tokens[i]
                    y = float(tokens[i+1]) * SCALE_Y
                    new_tokens.extend([x, str(y)])
                    i += 2
                continue
            elif cmd in ['Q']:
                # Q x1 y1 x y
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    x1 = tokens[i]
                    y1 = float(tokens[i+1]) * SCALE_Y
                    x = tokens[i+2]
                    y = float(tokens[i+3]) * SCALE_Y
                    new_tokens.extend([x1, str(y1), x, str(y)])
                    i += 4
                continue
            elif cmd in ['C']:
                # C x1 y1 x2 y2 x y
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    x1 = tokens[i]
                    y1 = float(tokens[i+1]) * SCALE_Y
                    x2 = tokens[i+2]
                    y2 = float(tokens[i+3]) * SCALE_Y
                    x = tokens[i+4]
                    y = float(tokens[i+5]) * SCALE_Y
                    new_tokens.extend([x1, str(y1), x2, str(y2), x, str(y)])
                    i += 6
                continue
            elif cmd in ['A']:
                # A rx ry x-axis-rotation large-arc-flag sweep-flag x y
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    rx = tokens[i]
                    ry = float(tokens[i+1]) * SCALE_Y
                    rot = tokens[i+2]
                    large = tokens[i+3]
                    sweep = tokens[i+4]
                    x = tokens[i+5]
                    y = float(tokens[i+6]) * SCALE_Y
                    new_tokens.extend([rx, str(ry), rot, large, sweep, x, str(y)])
                    i += 7
                continue
            elif cmd in ['H']:
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    new_tokens.append(tokens[i])
                    i += 1
                continue
            elif cmd in ['V']:
                i += 1
                while i < len(tokens) and not tokens[i].isalpha():
                    y = float(tokens[i]) * SCALE_Y
                    new_tokens.append(str(y))
                    i += 1
                continue
            elif cmd in ['Z']:
                i += 1
                continue
        i += 1
        
    return 'd="' + ' '.join(new_tokens) + '"'

# Only apply to <path ... d="..."> tags that are part of the actual SVG paths (not text defs)
# Wait, the text <defs> paths also have d="..."!
# If we scale them, the letters will become squashed!
# Let's ONLY scale paths that are NOT inside <defs>!
# So we split the SVG into before </defs> and after </defs>.
parts = content.split('</defs>')
if len(parts) == 2:
    defs_part = parts[0] + '</defs>'
    body_part = parts[1]
    
    body_part = re.sub(r'd="([^"]+)"', path_d_repl, body_part)
    content = defs_part + body_part
else:
    content = re.sub(r'd="([^"]+)"', path_d_repl, content)

# 3. Change height and viewBox attributes
content = re.sub(r'height="137665[^"]*"', 'height="400pt"', content)
content = re.sub(r'viewBox="0 0 951[^"]*"', 'viewBox="0 0 951 400"', content)

with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SVG successfully rescued!")
