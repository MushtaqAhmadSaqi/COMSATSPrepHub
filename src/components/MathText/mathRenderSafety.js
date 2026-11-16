export function resolveDisplayMath({ html, formula }) {
  if (typeof html === 'string' && html.trim()) {
    return { mode: 'html', value: html };
  }

  return { mode: 'text', value: String(formula ?? '') };
}
