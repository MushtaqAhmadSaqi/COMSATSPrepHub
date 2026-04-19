import os

style_path = r'd:\PastPaperPrep\Full front end\style.css'

with open(style_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add active-pill and nav-pill
pill_styles = """
/* --- Navbar Pills --- */
.active-pill {
  background-color: #2563eb !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

html.dark .active-pill {
  background-color: #3b82f6 !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.nav-pill {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
"""

# Check if already added
if '.active-pill' in content:
    print("Pill styles already exist.")
else:
    if '.header-hidden' in content:
        idx = content.find('.header-hidden')
        end_of_block = content.find('}', idx) + 1
        content = content[:end_of_block] + pill_styles + content[end_of_block:]
        print("Pill styles inserted after .header-hidden.")
    else:
        content += pill_styles
        print("Pill styles appended to end of file.")

with open(style_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Replacement attempted.")
