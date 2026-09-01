import os

style_path = r'd:\PastPaperPrep\Full front end\style.css'

with open(style_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Filter out the header hiding rule if it exists
lines = content.splitlines()
new_lines = []
skip = 0
for i, line in enumerate(lines):
    if '@media (max-width: 768px)' in line and i + 1 < len(lines) and 'header {' in lines[i+1]:
        skip = 5 # skip the next few lines
        continue
    if skip > 0:
        skip -= 1
        continue
    new_lines.append(line)

with open(style_path, 'w', encoding='utf-8', newline='') as f:
    f.write('\n'.join(new_lines))

print("Style cleanup attempt complete.")
