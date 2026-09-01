import os

style_path = r'd:\PastPaperPrep\Full front end\style.css'

with open(style_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace header-hidden
content = content.replace(
    'transform: translateY(-100%);',
    'transform: translateY(-120%);'
)

# Target block for nav-link
old_nav_link = """.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 15px;
  transition: var(--transition);
  position: relative;
}

.nav-link:hover {
  color: var(--text-main);
}

.nav-link.active {
  color: var(--primary);
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary);
  border-radius: 2px;
}"""

new_nav_link = """.nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 15px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.nav-link:hover {
  transform: translateY(-1px);
  color: var(--text-main);
}

.nav-link.active {
  color: var(--primary);
  font-weight: 600;
}"""

# Try both line ending types
if old_nav_link in content:
    content = content.replace(old_nav_link, new_nav_link)
elif old_nav_link.replace('\n', '\r\n') in content:
    content = content.replace(old_nav_link.replace('\n', '\r\n'), new_nav_link.replace('\n', '\r\n'))
else:
    print("Could not find nav-link block exactly. Trying partial match...")
    # fallback to a more aggressive replacement if needed, 
    # but let's try this first.

with open(style_path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Replacement attempted.")
