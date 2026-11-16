import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postcss from 'postcss';
import { parse } from '@babel/parser';

const root = process.cwd();
const relative = file => path.relative(root, file).split(path.sep).join('/');
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else if (/\.(css|jsx|js|svg|webmanifest)$/.test(entry.name)) files.push(file);
  }
}
collect(path.join(root, 'src'));
collect(path.join(root, 'public'));
files.push(path.join(root, 'index.html'), path.join(root, 'tailwind.config.cjs'));
files.sort();
const report = {
  project: 'COMSATSPrepHub',
  capturedAt: new Date().toISOString(),
  scope: 'First-party CSS, JS/JSX, SVG, HTML theme metadata, webmanifest, and Tailwind configuration; excludes dependencies, build outputs, secrets, comments, and raster-image pixels. Literal declarations do not prove every rule is active.',
  goldenRule: { applicationCodeChanged: false, paletteAndFontsLocked: true, layoutAndFeaturesLocked: true },
  sources: [], tokens: [], colors: {}, properties: {}, variables: {}, mediaQueries: [], routes: [], pageModules: {}, sharedComponents: [], uiComponents: [],
  baselineScreenshots: { captured: 0, status: 'blocked', reason: 'NATIVE_BROWSER_VIEWPORT_UNAVAILABLE: hidden in-app browser surface; no screenshots or 375/768/1024/1440 viewport verification possible.' }
};
const groups = {
  typography: /^(font|font-family|font-size|font-weight|font-style|line-height|letter-spacing|text-transform)$/,
  spacing: /^(margin(?:-.+)?|padding(?:-.+)?|gap|row-gap|column-gap)$/,
  radii: /^border(?:-.+)?-radius$/,
  shadows: /^(box-shadow|text-shadow|filter)$/,
  motion: /^(transition(?:-.+)?|animation(?:-.+)?|scroll-behavior|duration)$/,
  layout: /^(max-width|min-width|width|max-height|min-height|height|z-index)$/,
  borders: /^(border(?:-(?:width|style|color))?|outline(?:-.+)?)$/
};
const groupFor = prop => Object.entries(groups).find(([, regex]) => regex.test(prop))?.[0];
const insert = (map, key, item) => (map[key] ||= []).push(item);
function inspectValue(value, location) {
  for (const literal of value.match(/#[\da-fA-F]{8}(?![\w-])|#[\da-fA-F]{6}(?![\w-])|#[\da-fA-F]{4}(?![\w-])|#[\da-fA-F]{3}(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab|color)\([^)]*\)/g) || []) insert(report.colors, literal, location);
  if (/^(?:white|black|transparent|currentColor)$/i.test(value.trim())) insert(report.colors, value.trim(), location);
  for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g)) insert(report.variables, match[1], location);
}
function declaration(prop, value, location) {
  const group = groupFor(prop);
  if (group) {
    report.properties[group] ||= {};
    report.properties[group][prop] ||= {};
    insert(report.properties[group][prop], value, location);
  }
  inspectValue(value, { ...location, property: prop });
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (['loc', 'start', 'end', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments', 'tokens'].includes(key)) continue;
    if (Array.isArray(child)) child.forEach(value => walk(value, visit));
    else if (child && typeof child === 'object') walk(child, visit);
  }
}
const toCss = prop => prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
let appAst;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const name = relative(file);
  report.sources.push({ file: name, lines: text.split('\n').length, sha256: crypto.createHash('sha256').update(text).digest('hex') });
  if (name.endsWith('.css')) {
    const tree = postcss.parse(text, { from: file });
    tree.walkDecls(decl => {
      const location = { file: name, line: decl.source.start.line, selector: decl.parent.selector || `@${decl.parent.name || ''} ${decl.parent.params || ''}`.trim() };
      const media = [];
      for (let parent = decl.parent; parent; parent = parent.parent) if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
      if (media.length) location.media = media;
      if (decl.prop.startsWith('--')) report.tokens.push({ name: decl.prop, value: decl.value, ...location });
      declaration(decl.prop, decl.value, location);
    });
    tree.walkAtRules('media', rule => report.mediaQueries.push({ value: rule.params, file: name, line: rule.source.start.line }));
  } else if (/\.(?:jsx|js|cjs)$/.test(name)) {
    const tree = parse(text, { sourceType: 'unambiguous', plugins: ['jsx'] });
    if (name === 'src/App.jsx') appAst = tree;
    walk(tree, node => {
      const location = { file: name, line: node.loc.start.line };
      if (node.type === 'StringLiteral') inspectValue(node.value, location);
      if (node.type === 'TemplateElement') inspectValue(node.value.raw, location);
      if (node.type === 'ObjectProperty' && !node.computed) {
        const key = node.key.name || node.key.value;
        if (typeof key === 'string' && groupFor(toCss(key)) && !['ObjectExpression', 'ArrayExpression'].includes(node.value.type)) declaration(toCss(key), node.value.type === 'StringLiteral' ? node.value.value : text.slice(node.value.start, node.value.end), location);
      }
      if (node.type === 'JSXAttribute' && node.value && groupFor(toCss(node.name.name || ''))) declaration(toCss(node.name.name), node.value.type === 'StringLiteral' ? node.value.value : text.slice(node.value.start, node.value.end), location);
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.name === 'matchMedia' && node.arguments[0]?.type === 'StringLiteral') report.mediaQueries.push({ value: node.arguments[0].value, ...location });
      if (name.startsWith('src/components/') && node.type === 'ExportDefaultDeclaration') report.sharedComponents.push({ file: name, line: node.loc.start.line, name: node.declaration.id?.name || 'default' });
      const componentName = ['FunctionDeclaration', 'ClassDeclaration'].includes(node.type) ? node.id?.name : node.type === 'VariableDeclarator' ? node.id?.name : null;
      if (componentName && /^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
        let containsJsx = false;
        walk(node.body || node.init, child => { if (['JSXElement', 'JSXFragment'].includes(child.type)) containsJsx = true; });
        if (containsJsx) report.uiComponents.push({ name: componentName, ...location });
      }
    });
  } else {
    for (const [index, line] of text.split('\n').entries()) if (!/^\s*(?:<!--|\/\/)/.test(line)) inspectValue(line, { file: name, line: index + 1 });
  }
  if (!name.endsWith('.css')) {
    for (const [index, line] of text.split('\n').entries()) {
      for (const match of line.matchAll(/\b(font-family|font-size|font-weight|line-height)=["']([^"']+)["']/g)) declaration(match[1], match[2], { file: name, line: index + 1, kind: 'SVG/HTML attribute' });
    }
  }
}
walk(appAst, node => {
  if (node.type === 'ImportDeclaration' && node.source.value.startsWith('./pages/')) for (const specifier of node.specifiers) report.pageModules[specifier.local.name] = { file: `src/${node.source.value.slice(2)}.jsx`, importLine: node.loc.start.line };
  if (node.type === 'VariableDeclarator' && node.init?.type === 'CallExpression' && node.init.callee.name === 'lazy') walk(node.init, child => { if (child.type === 'CallExpression' && child.callee.type === 'Import') report.pageModules[node.id.name] = { file: `src/${child.arguments[0].value.slice(2)}.jsx`, importLine: node.loc.start.line }; });
});
walk(appAst, node => {
  if (node.type !== 'SwitchStatement' || node.discriminant.name !== 'activePath') return;
  node.cases.forEach((item, index) => {
    let renderedCase = item;
    for (let i = index; !renderedCase.consequent.length && i + 1 < node.cases.length;) renderedCase = node.cases[++i];
    const components = [];
    walk(renderedCase.consequent, child => { if (child.type === 'JSXOpeningElement' && report.pageModules[child.name.name]) components.push(child.name.name); });
    report.routes.push({ route: item.test?.value || '(404 default)', file: 'src/App.jsx', line: item.loc.start.line, components: [...new Set(components)] });
  });
});
for (const key of ['colors', 'variables']) report[key] = Object.fromEntries(Object.entries(report[key]).sort(([a], [b]) => a.localeCompare(b)).map(([value, usages]) => [value, usages.filter((item, index) => usages.findIndex(other => JSON.stringify(other) === JSON.stringify(item)) === index)]));
const output = path.join(root, 'design-discovery-2026-11-16.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
const valuesFor = (group, prop) => Object.keys(report.properties[group]?.[prop] || {}).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
console.log(JSON.stringify({
  output: relative(output), sourceFiles: report.sources.length, pageModules: Object.keys(report.pageModules).length, routes: report.routes.length, uiComponents: report.uiComponents,
  cssTokenDeclarations: report.tokens.length, colorLiteralForms: Object.keys(report.colors).length,
  propertyGroups: Object.fromEntries(Object.entries(report.properties).map(([group, properties]) => [group, { properties: Object.keys(properties).length, distinctDeclarations: Object.values(properties).reduce((total, values) => total + Object.keys(values).length, 0) }])),
  fontFamilies: valuesFor('typography', 'font-family'), fontSizes: valuesFor('typography', 'font-size'), fontWeights: valuesFor('typography', 'font-weight'), lineHeights: valuesFor('typography', 'line-height'),
  mediaQueries: [...new Set(report.mediaQueries.map(item => item.value))].sort(), routesMap: report.routes
}, null, 2));
